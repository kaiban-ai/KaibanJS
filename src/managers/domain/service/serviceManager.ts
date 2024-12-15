/**
 * @file serviceManager.ts
 * @description Service registration and management implementation
 */

import { CoreManager } from '../../core/coreManager';
import { EventEmitter } from 'events';
import { MetricsManager } from '../../core/metricsManager';
import { StatusManager } from '../../core/statusManager';
import { VersionManager } from '../../core/versionManager';
import { createError } from '../../../types/common/commonErrorTypes';
import { 
    SERVICE_STATUS_enum,
    SERVICE_EVENT_TYPE_enum,
    HEALTH_STATUS_enum
} from '../../../types/common/commonEnums';
import { 
    parseVersion,
    compareVersions,
    IDependencySpec
} from '../../../types/common/commonVersionTypes';
import type { 
    IServiceConfig,
    IServiceRegistration,
    IServiceDiscoveryQuery,
    IServiceDiscoveryResult,
    IHealthDetails,
    IHealthMetrics
} from '../../../types/common/commonBaseTypes';
import type {
    IServiceRegistrationOptions,
    IServiceRegistrationResult,
    IServiceHealthCheckResult,
    IServiceDependencyResult,
    IBaseManager
} from '../../../types/agent/agentManagerTypes';

/**
 * Service registration and management implementation
 */
export class ServiceManager extends CoreManager {
    private static instance: ServiceManager | null = null;
    protected readonly serviceConfigs: Map<string, IServiceConfig>;
    protected readonly serviceHealth: Map<string, IServiceHealthCheckResult>;
    protected readonly serviceMonitors: Map<string, NodeJS.Timeout>;
    protected readonly metricsManager: MetricsManager;
    protected readonly statusManager: StatusManager;
    protected readonly versionManager: VersionManager;
    private readonly eventEmitter: EventEmitter;

    private constructor() {
        super();
        this.serviceConfigs = new Map();
        this.serviceHealth = new Map();
        this.serviceMonitors = new Map();
        this.metricsManager = MetricsManager.getInstance();
        this.statusManager = StatusManager.getInstance();
        this.versionManager = VersionManager.getInstance();
        this.eventEmitter = new EventEmitter();
        this.registerDomainManager('ServiceManager', this);
    }

    public static getInstance(): ServiceManager {
        if (!ServiceManager.instance) {
            ServiceManager.instance = new ServiceManager();
        }
        return ServiceManager.instance;
    }

    /**
     * Register a new service
     */
    public async registerService(
        config: IServiceConfig,
        manager: IBaseManager,
        options: IServiceRegistrationOptions = {}
    ): Promise<IServiceRegistrationResult> {
        try {
            // Validate configuration if requested
            if (options.validateConfig) {
                const validationResult = await this.validateServiceConfig(config);
                if (!validationResult.isValid) {
                    return {
                        success: false,
                        errors: validationResult.errors,
                        warnings: validationResult.warnings
                    };
                }
            }

            // Convert dependencies to specs
            const dependencySpecs: IDependencySpec[] = [
                ...config.dependencies.required.map(dep => ({
                    name: dep,
                    version: config.dependencies.versionConstraints?.[dep] || '*',
                    constraints: [],
                    optional: false
                })),
                ...config.dependencies.optional.map(dep => ({
                    name: dep,
                    version: config.dependencies.versionConstraints?.[dep] || '*',
                    constraints: [],
                    optional: true
                }))
            ];

            // Register with version manager
            this.versionManager.registerVersion(config.name, config.version, dependencySpecs);

            // Check dependencies if requested
            if (options.validateDependencies) {
                const dependencyResult = await this.resolveDependencies(config);
                if (!dependencyResult.resolved) {
                    return {
                        success: false,
                        errors: [`Unresolved dependencies: ${dependencyResult.missing.join(', ')}`]
                    };
                }
            }

            // Store service configuration
            this.serviceConfigs.set(config.name, config);

            // Initialize health monitoring
            if (options.healthCheck) {
                await this.initializeHealthMonitoring(config.name);
            }

            // Create registration metadata
            const registration: IServiceRegistration = {
                metadata: {
                    id: config.name,
                    created: new Date(),
                    updated: new Date(),
                    version: config.version,
                    category: config.category,
                    status: SERVICE_STATUS_enum.ACTIVE,
                    dependencies: {
                        required: config.dependencies.required,
                        optional: config.dependencies.optional,
                        resolved: [],
                        missing: []
                    },
                    health: {
                        lastCheck: Date.now(),
                        status: HEALTH_STATUS_enum.HEALTHY,
                        metrics: {
                            uptime: 0,
                            requestCount: 0,
                            errorCount: 0,
                            averageResponseTime: 0,
                            memoryUsage: 0,
                            cpuUsage: 0,
                            activeRequests: 0
                        }
                    }
                },
                config,
                status: {
                    registeredAt: Date.now(),
                    lastUpdated: Date.now(),
                    active: true
                }
            };

            // Initialize if requested
            if (options.initializeOnRegister) {
                await manager.initialize();
            }

            // Emit registration event
            this.eventEmitter.emit(SERVICE_EVENT_TYPE_enum.SERVICE_REGISTERED, {
                service: config.name,
                registration
            });

            return {
                success: true,
                registration
            };
        } catch (error) {
            this.handleError(error, `Failed to register service: ${config.name}`);
            return {
                success: false,
                errors: [error instanceof Error ? error.message : String(error)]
            };
        }
    }

    /**
     * Unregister a service
     */
    public async unregisterService(name: string): Promise<void> {
        try {
            // Stop health monitoring
            this.stopMonitoring(name);

            // Clean up registrations
            this.serviceConfigs.delete(name);
            this.serviceHealth.delete(name);

            // Emit unregistration event
            this.eventEmitter.emit(SERVICE_EVENT_TYPE_enum.SERVICE_UNREGISTERED, {
                service: name
            });
        } catch (error) {
            this.handleError(error, `Failed to unregister service: ${name}`);
            throw error;
        }
    }

    /**
     * Get service details
     */
    public async getService(name: string): Promise<IServiceRegistration | undefined> {
        const config = this.serviceConfigs.get(name);
        if (!config) return undefined;

        const health = this.serviceHealth.get(name);

        return {
            metadata: {
                id: name,
                created: new Date(),
                updated: new Date(),
                version: config.version,
                category: config.category,
                status: health?.status || SERVICE_STATUS_enum.UNKNOWN,
                dependencies: {
                    required: config.dependencies.required,
                    optional: config.dependencies.optional,
                    resolved: [],
                    missing: []
                },
                health: health?.details || {
                    lastCheck: Date.now(),
                    status: HEALTH_STATUS_enum.UNKNOWN,
                    metrics: {
                        uptime: 0,
                        requestCount: 0,
                        errorCount: 0,
                        averageResponseTime: 0,
                        memoryUsage: 0,
                        cpuUsage: 0,
                        activeRequests: 0
                    }
                }
            },
            config,
            status: {
                registeredAt: Date.now(),
                lastUpdated: Date.now(),
                active: true
            }
        };
    }

    /**
     * Discover services based on query
     */
    public async discoverServices(query: IServiceDiscoveryQuery): Promise<IServiceDiscoveryResult> {
        const services: IServiceRegistration[] = [];

        for (const [name, config] of this.serviceConfigs.entries()) {
            let matches = true;

            // Match category
            if (query.category && config.category !== query.category) {
                matches = false;
            }

            // Match version using semantic versioning
            if (query.version) {
                const serviceVersion = parseVersion(config.version);
                const queryVersion = parseVersion(query.version);
                if (compareVersions(serviceVersion, queryVersion) !== 0) {
                    matches = false;
                }
            }

            // Match features
            if (query.features?.length) {
                const hasAllFeatures = query.features.every(feature => 
                    config.features.includes(feature)
                );
                if (!hasAllFeatures) {
                    matches = false;
                }
            }

            if (matches) {
                const registration = await this.getService(name);
                if (registration) {
                    services.push(registration);
                }
            }
        }

        return {
            services,
            metadata: {
                timestamp: Date.now(),
                query,
                totalFound: services.length
            }
        };
    }

    /**
     * Initialize health monitoring for a service
     */
    protected async initializeHealthMonitoring(name: string): Promise<void> {
        const config = this.serviceConfigs.get(name);
        if (!config?.monitoring?.health?.enabled) return;

        const intervalMs = config.monitoring.health.checkIntervalMs || 60000;
        await this.monitorService(name, intervalMs);
    }

    /**
     * Start monitoring a service
     */
    protected async monitorService(name: string, intervalMs: number): Promise<void> {
        // Clear existing monitor if any
        this.stopMonitoring(name);

        // Start new monitor
        const timer = setInterval(async () => {
            await this.checkServiceHealth(name);
        }, intervalMs);

        this.serviceMonitors.set(name, timer);
    }

    /**
     * Stop monitoring a service
     */
    protected stopMonitoring(name: string): void {
        const timer = this.serviceMonitors.get(name);
        if (timer) {
            clearInterval(timer);
            this.serviceMonitors.delete(name);
        }
    }

    /**
     * Check service health
     */
    protected async checkServiceHealth(name: string): Promise<IServiceHealthCheckResult> {
        try {
            const startTime = Date.now();
            const manager = this.getDomainManager<IBaseManager>(name);
            const config = this.serviceConfigs.get(name);

            if (!config) {
                throw new Error(`Service configuration not found: ${name}`);
            }

            // Get metadata from manager
            const metadata = await manager.getMetadata();
            const isHealthy = metadata.status === 'success';

            // Get resource metrics
            const resourceMetrics = await this.metricsManager.getInitialResourceMetrics();

            const healthMetrics: IHealthMetrics = {
                uptime: process.uptime(),
                requestCount: 0,
                errorCount: isHealthy ? 0 : 1,
                averageResponseTime: Date.now() - startTime,
                memoryUsage: resourceMetrics.memoryUsage,
                cpuUsage: resourceMetrics.cpuUsage,
                activeRequests: 0
            };

            const healthDetails: IHealthDetails = {
                lastCheck: Date.now(),
                status: isHealthy ? HEALTH_STATUS_enum.HEALTHY : HEALTH_STATUS_enum.UNHEALTHY,
                metrics: healthMetrics,
                errors: isHealthy ? [] : ['Service reported unhealthy status']
            };

            const health: IServiceHealthCheckResult = {
                status: isHealthy ? SERVICE_STATUS_enum.HEALTHY : SERVICE_STATUS_enum.UNHEALTHY,
                timestamp: Date.now(),
                details: healthDetails
            };

            // Update health status
            this.serviceHealth.set(name, health);

            // Emit health event
            this.eventEmitter.emit(SERVICE_EVENT_TYPE_enum.SERVICE_HEALTH_CHECK, {
                service: name,
                health
            });

            return health;
        } catch (error) {
            const healthMetrics: IHealthMetrics = {
                uptime: process.uptime(),
                requestCount: 0,
                errorCount: 1,
                averageResponseTime: 0,
                memoryUsage: 0,
                cpuUsage: 0,
                activeRequests: 0
            };

            const healthDetails: IHealthDetails = {
                lastCheck: Date.now(),
                status: HEALTH_STATUS_enum.UNHEALTHY,
                metrics: healthMetrics,
                errors: [error instanceof Error ? error.message : String(error)]
            };

            const health: IServiceHealthCheckResult = {
                status: SERVICE_STATUS_enum.ERROR,
                timestamp: Date.now(),
                details: healthDetails
            };

            this.serviceHealth.set(name, health);
            this.handleError(error, `Health check failed for service: ${name}`);
            return health;
        }
    }

    /**
     * Validate service configuration
     */
    protected async validateServiceConfig(config: IServiceConfig): Promise<{
        isValid: boolean;
        errors: string[];
        warnings: string[];
    }> {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Required fields validation
        if (!config.name) errors.push('Service name is required');
        if (!config.version) errors.push('Service version is required');
        if (!config.category) errors.push('Service category is required');
        if (!Array.isArray(config.features)) errors.push('Features must be an array');
        if (!Array.isArray(config.supportedOperations)) errors.push('Supported operations must be an array');

        // Version validation
        if (config.version) {
            try {
                parseVersion(config.version);
            } catch (error) {
                errors.push(`Invalid version format: ${error instanceof Error ? error.message : String(error)}`);
            }
        }

        // Validation warnings
        if (!config.monitoring) warnings.push('Monitoring configuration not provided');
        if (!config.validation) warnings.push('Validation configuration not provided');

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Resolve service dependencies
     */
    protected async resolveDependencies(config: IServiceConfig): Promise<IServiceDependencyResult> {
        const resolutions = await this.versionManager.resolveDependencies(config.name, config.version);
        
        const missing: string[] = [];
        const optional: string[] = [];
        const versionMismatches: { name: string; version: string; constraint: string }[] = [];

        for (const resolution of resolutions) {
            if (!resolution.satisfied) {
                if (config.dependencies.optional.includes(resolution.name)) {
                    optional.push(resolution.name);
                } else {
                    missing.push(resolution.name);
                }
            }
        }

        return {
            resolved: missing.length === 0 && versionMismatches.length === 0,
            missing,
            optional,
            versionMismatches
        };
    }
}

export default ServiceManager.getInstance();
