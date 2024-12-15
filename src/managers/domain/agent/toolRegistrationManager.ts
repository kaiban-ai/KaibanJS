/**
 * @file toolRegistrationManager.ts
 * @path src/managers/domain/agent/toolRegistrationManager.ts
 * @description Tool registration and dependency management
 * 
 * @module @managers/domain/agent
 */

import { Tool } from '@langchain/core/tools';
import { CoreManager } from '../../core/coreManager';
import { MANAGER_CATEGORY_enum } from '../../../types/common/enumTypes';
import { ToolError } from '../../../types/tool/toolErrorTypes';
import { 
    IToolHandlerResult, 
    createToolHandlerResult 
} from '../../../types/tool/toolHandlerTypes';
import { 
    validateTool,
    validateToolConfig as validateToolConfigUtil,
    validateToolDependencies as validateToolDepsUtil,
    IToolRegistrationMetadata,
    IToolRegistrationOptions,
    IToolDependency
} from '../../../types/tool/toolTypes';
import type { IBaseManager, IBaseManagerMetadata } from '../../../types/agent/agentManagerTypes';

// ─── Tool Registration Manager ─────────────────────────────────────────────────

export class ToolRegistrationManager extends CoreManager implements IBaseManager {
    private static instance: ToolRegistrationManager;
    private readonly registeredTools: Map<string, IToolRegistrationMetadata>;
    private readonly dependencyGraph: Map<string, Set<string>>;
    private isInitialized = false;
    public readonly category = MANAGER_CATEGORY_enum.RESOURCE;

    private constructor() {
        super();
        this.registeredTools = new Map();
        this.dependencyGraph = new Map();
    }

    public static getInstance(): ToolRegistrationManager {
        if (!ToolRegistrationManager.instance) {
            ToolRegistrationManager.instance = new ToolRegistrationManager();
        }
        return ToolRegistrationManager.instance;
    }

    public async initialize(): Promise<void> {
        if (this.isInitialized) return;
        await super.initialize();
        this.isInitialized = true;
    }

    public async validate(params: unknown): Promise<boolean> {
        return true;
    }

    public getMetadata(): IBaseManagerMetadata {
        return {
            category: MANAGER_CATEGORY_enum.RESOURCE,
            operation: 'tool-registration',
            duration: 0,
            status: 'success',
            agent: { id: '', name: '', role: '', status: '' },
            timestamp: Date.now(),
            component: 'ToolRegistrationManager'
        };
    }

    public async registerTool(
        tool: Tool,
        options: IToolRegistrationOptions = {}
    ): Promise<IToolHandlerResult> {
        try {
            const toolValidation = validateTool(tool);
            if (!toolValidation.isValid) {
                throw new ToolError({
                    message: `Tool validation failed: ${toolValidation.errors?.join(', ')}`,
                    toolName: tool.name,
                    type: 'ValidationError',
                    errors: toolValidation.errors
                });
            }

            const configValidation = validateToolConfigUtil(options);
            if (!configValidation.isValid) {
                throw new ToolError({
                    message: 'Invalid tool registration options',
                    toolName: tool.name,
                    type: 'ValidationError',
                    errors: configValidation.errors
                });
            }

            if (options.dependencies) {
                const depValidation = await this.validateAndResolveDependencies(options.dependencies);
                if (!depValidation.data?.result) {
                    throw new ToolError({
                        message: 'Dependency validation failed',
                        toolName: tool.name,
                        type: 'ValidationError',
                        context: { dependencies: options.dependencies }
                    });
                }

                this.updateDependencyGraph(tool.name, options.dependencies);
            }

            const metadata: IToolRegistrationMetadata = {
                registeredAt: Date.now(),
                usageCount: 0,
                priority: options.priority || 0,
                status: 'active',
                version: options.version,
                dependencies: options.dependencies ? {
                    resolved: true,
                    items: options.dependencies.map(dep => ({
                        dependency: dep,
                        status: 'resolved'
                    }))
                } : undefined
            };

            this.registeredTools.set(tool.name, metadata);

            return createToolHandlerResult(true, undefined, {
                feedbackMessage: `Tool ${tool.name} registered successfully`
            });

        } catch (error) {
            if (error instanceof ToolError) throw error;
            throw new ToolError({
                message: error instanceof Error ? error.message : String(error),
                toolName: tool.name,
                type: 'ExecutionError'
            });
        }
    }

    public async validateToolDependencies(tools: Tool[]): Promise<IToolHandlerResult> {
        try {
            const dependencies = tools.reduce((acc, tool) => {
                const metadata = this.registeredTools.get(tool.name);
                if (metadata?.dependencies?.items) {
                    acc.push(...metadata.dependencies.items.map(item => item.dependency));
                }
                return acc;
            }, [] as IToolDependency[]);

            const validation = validateToolDepsUtil(dependencies);
            if (!validation.isValid) {
                return createToolHandlerResult(false, undefined, {
                    feedbackMessage: validation.errors.join(', ')
                });
            }

            for (const tool of tools) {
                if (this.hasCircularDependency(tool.name)) {
                    return createToolHandlerResult(false, undefined, {
                        feedbackMessage: `Circular dependency detected for tool: ${tool.name}`
                    });
                }
            }

            return createToolHandlerResult(true);

        } catch (error) {
            this.handleError(error, 'Tool dependencies validation', 'ValidationError');
            return createToolHandlerResult(false, undefined, {
                feedbackMessage: error instanceof Error ? error.message : String(error)
            });
        }
    }

    public isToolRegistered(toolName: string): boolean {
        return this.registeredTools.has(toolName);
    }

    public getToolMetadata(toolName: string): IToolRegistrationMetadata | undefined {
        return this.registeredTools.get(toolName);
    }

    private async validateAndResolveDependencies(
        dependencies: IToolDependency[]
    ): Promise<IToolHandlerResult> {
        const depValidation = validateToolDepsUtil(dependencies);
        if (!depValidation.isValid) {
            return createToolHandlerResult(false, undefined, {
                feedbackMessage: `Invalid dependencies: ${depValidation.errors?.join(', ')}`
            });
        }

        for (const dep of dependencies) {
            const depTool = this.registeredTools.get(dep.toolName);
            if (!depTool) {
                if (dep.required) {
                    return createToolHandlerResult(false, undefined, {
                        feedbackMessage: `Required dependency ${dep.toolName} not found`
                    });
                }
                continue;
            }

            if (dep.version && depTool.version) {
                if (!this.isVersionCompatible(dep.version, depTool.version)) {
                    return createToolHandlerResult(false, undefined, {
                        feedbackMessage: `Incompatible version for dependency ${dep.toolName}`
                    });
                }
            }
        }

        return createToolHandlerResult(true, undefined, {
            result: 'Dependencies validated successfully'
        });
    }

    private updateDependencyGraph(toolName: string, dependencies: IToolDependency[]): void {
        const depSet = new Set<string>();
        for (const dep of dependencies) {
            depSet.add(dep.toolName);
        }
        this.dependencyGraph.set(toolName, depSet);

        if (this.hasCircularDependency(toolName)) {
            throw new ToolError({
                message: 'Circular dependency detected',
                toolName,
                type: 'ValidationError'
            });
        }
    }

    private hasCircularDependency(
        toolName: string,
        visited = new Set<string>(),
        path = new Set<string>()
    ): boolean {
        if (path.has(toolName)) return true;
        if (visited.has(toolName)) return false;

        visited.add(toolName);
        path.add(toolName);

        const dependencies = this.dependencyGraph.get(toolName);
        if (dependencies) {
            for (const dep of dependencies) {
                if (this.hasCircularDependency(dep, visited, path)) {
                    return true;
                }
            }
        }

        path.delete(toolName);
        return false;
    }

    private isVersionCompatible(required: string, actual: { toString(): string }): boolean {
        return required === actual.toString();
    }
}

export default ToolRegistrationManager.getInstance();
