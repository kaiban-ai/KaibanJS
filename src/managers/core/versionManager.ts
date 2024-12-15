/**
 * @file versionManager.ts
 * @description Version management and dependency resolution
 */

import {
    ISemanticVersion,
    IVersionConstraint,
    IDependencySpec,
    IDependencyResolution,
    IDependencyNode,
    DEPENDENCY_ERROR_TYPE,
    parseVersion,
    parseConstraint,
    compareVersions,
    satisfiesConstraint
} from '../../types/common/commonVersionTypes';
import { createError, ERROR_KINDS } from '../../types/common/commonErrorTypes';

/**
 * Version manager for handling semantic versioning and dependency resolution
 */
export class VersionManager {
    private static instance: VersionManager;
    private readonly dependencyGraph: Map<string, IDependencyNode>;
    private readonly versionCache: Map<string, Map<string, ISemanticVersion>>;

    private constructor() {
        this.dependencyGraph = new Map();
        this.versionCache = new Map();
    }

    public static getInstance(): VersionManager {
        if (!VersionManager.instance) {
            VersionManager.instance = new VersionManager();
        }
        return VersionManager.instance;
    }

    // ─── Version Management ─────────────────────────────────────────────────────

    /**
     * Register a service version
     */
    public registerVersion(
        name: string,
        version: string,
        dependencies: IDependencySpec[] = []
    ): void {
        const semver = parseVersion(version);

        // Initialize version cache for service
        if (!this.versionCache.has(name)) {
            this.versionCache.set(name, new Map());
        }
        this.versionCache.get(name)!.set(version, semver);

        // Create or update dependency node
        const node: IDependencyNode = {
            name,
            version: semver,
            dependencies,
            dependents: [],
            optional: false,
            resolved: false
        };

        this.dependencyGraph.set(this.getNodeKey(name, version), node);
    }

    /**
     * Get all available versions for a service
     */
    public getVersions(name: string): ISemanticVersion[] {
        const versions = this.versionCache.get(name);
        if (!versions) return [];
        return Array.from(versions.values());
    }

    /**
     * Find the best matching version for a service given constraints
     */
    public findBestVersion(
        name: string,
        constraints: IVersionConstraint[]
    ): ISemanticVersion | undefined {
        const versions = this.getVersions(name);
        if (!versions.length) return undefined;

        // Filter versions that satisfy all constraints
        const validVersions = versions.filter(version =>
            constraints.every(constraint => satisfiesConstraint(version, constraint))
        );

        if (!validVersions.length) return undefined;

        // Return highest valid version
        return validVersions.reduce((best, current) =>
            compareVersions(current, best) > 0 ? current : best
        );
    }

    // ─── Dependency Resolution ───────────────────────────────────────────────────

    /**
     * Resolve dependencies for a service
     */
    public async resolveDependencies(
        name: string,
        version: string
    ): Promise<IDependencyResolution[]> {
        const nodeKey = this.getNodeKey(name, version);
        const node = this.dependencyGraph.get(nodeKey);
        
        if (!node) {
            throw createError({
                message: `Service not found: ${name}@${version}`,
                type: ERROR_KINDS.NotFoundError,
                context: {
                    component: 'VersionManager',
                    name,
                    version,
                    errorType: DEPENDENCY_ERROR_TYPE.VERSION_NOT_FOUND
                }
            });
        }

        const resolutions: IDependencyResolution[] = [];
        const visited = new Set<string>();

        await this.resolveDependencyNode(node, resolutions, visited);
        return resolutions;
    }

    /**
     * Check if all dependencies are satisfied
     */
    public async validateDependencies(
        name: string,
        version: string
    ): Promise<boolean> {
        try {
            const resolutions = await this.resolveDependencies(name, version);
            return resolutions.every(resolution => resolution.satisfied);
        } catch (error) {
            return false;
        }
    }

    /**
     * Get dependency graph for a service
     */
    public getDependencyGraph(name: string, version: string): {
        required: string[];
        optional: string[];
        dependents: string[];
    } {
        const nodeKey = this.getNodeKey(name, version);
        const node = this.dependencyGraph.get(nodeKey);

        if (!node) {
            throw createError({
                message: `Service not found: ${name}@${version}`,
                type: ERROR_KINDS.NotFoundError,
                context: {
                    component: 'VersionManager',
                    name,
                    version,
                    errorType: DEPENDENCY_ERROR_TYPE.VERSION_NOT_FOUND
                }
            });
        }

        return {
            required: node.dependencies
                .filter(dep => !dep.optional)
                .map(dep => dep.name),
            optional: node.dependencies
                .filter(dep => dep.optional)
                .map(dep => dep.name),
            dependents: node.dependents
        };
    }

    // ─── Private Helper Methods ──────────────────────────────────────────────────

    private getNodeKey(name: string, version: string): string {
        return `${name}@${version}`;
    }

    private async resolveDependencyNode(
        node: IDependencyNode,
        resolutions: IDependencyResolution[],
        visited: Set<string>
    ): Promise<void> {
        const nodeKey = this.getNodeKey(node.name, node.version.major.toString());

        // Check for circular dependencies
        if (visited.has(nodeKey)) {
            throw createError({
                message: `Circular dependency detected: ${node.name}`,
                type: ERROR_KINDS.ValidationError,
                context: {
                    component: 'VersionManager',
                    name: node.name,
                    version: node.version,
                    errorType: DEPENDENCY_ERROR_TYPE.CIRCULAR_DEPENDENCY
                }
            });
        }

        visited.add(nodeKey);

        // Resolve each dependency
        for (const dep of node.dependencies) {
            const bestVersion = this.findBestVersion(dep.name, dep.constraints);

            if (!bestVersion) {
                const resolution: IDependencyResolution = {
                    name: dep.name,
                    version: parseVersion('0.0.0'),
                    satisfied: false,
                    error: dep.optional
                        ? DEPENDENCY_ERROR_TYPE.VERSION_NOT_FOUND
                        : DEPENDENCY_ERROR_TYPE.MISSING_DEPENDENCY
                };
                resolutions.push(resolution);

                if (!dep.optional) {
                    throw createError({
                        message: `Missing required dependency: ${dep.name}`,
                        type: ERROR_KINDS.ValidationError,
                        context: {
                            component: 'VersionManager',
                            name: dep.name,
                            constraints: dep.constraints,
                            errorType: DEPENDENCY_ERROR_TYPE.MISSING_DEPENDENCY
                        }
                    });
                }
                continue;
            }

            const depNode = this.dependencyGraph.get(
                this.getNodeKey(dep.name, bestVersion.major.toString())
            );

            if (depNode) {
                // Add this service as a dependent
                if (!depNode.dependents.includes(node.name)) {
                    depNode.dependents.push(node.name);
                }

                // Recursively resolve dependencies
                await this.resolveDependencyNode(depNode, resolutions, visited);
            }

            resolutions.push({
                name: dep.name,
                version: bestVersion,
                satisfied: true
            });
        }

        visited.delete(nodeKey);
    }
}
