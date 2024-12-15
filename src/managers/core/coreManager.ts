/**
 * @file coreManager.ts
 * @description Core management implementation providing base functionality and service directory
 * registration for domain managers. Implements centralized management for core services
 * and domain-specific functionality through inheritance.
 * 
 * Service Directory Strategy:
 * 1. Core Services:
 *    - LogManager: Centralized logging with levels and contexts 
 *    - ErrorManager: Error handling with typing and propagation
 *    - StatusManager: State transitions and validation
 *    - MetricsManager: Performance tracking and monitoring
 *    - VersionManager: Version control and dependency resolution
 * 
 * 2. Event Handling:
 *    - BaseEventEmitter: Common event infrastructure
 *    - Event typing and validation
 *    - Domain-specific event handlers
 *    - Event correlation and metrics
 * 
 * 3. Domain Registration:
 *    - Primary domain managers register with service directory
 *    - Each domain has one primary manager instance
 *    - Domain managers extend CoreManager
 *    - Services accessed via getDomainManager<T>()
 * 
 * 4. Resource Management:
 *    - Initialization tracking and validation
 *    - Cleanup handling and resource release
 *    - Resource allocation monitoring
 *    - Performance metrics collection
 */

import { LogManager } from './logManager';
import { ErrorManager } from './errorManager';
import { StatusManager } from './statusManager';
import { MetricsManager } from './metricsManager';
import { VersionManager } from './versionManager';
import { BaseEventEmitter } from './eventEmitter';
import { MANAGER_CATEGORY_enum, AGENT_STATUS_enum, ERROR_SEVERITY_enum } from '../../types/common/enumTypes';

// Import utility functions
import { createError, ERROR_KINDS } from '../../types/common/errorTypes';
import { createBaseMetadata } from '../../types/common/baseTypes';

// Type-only imports
import type { ILogLevel } from '../../types/common/enumTypes';
import type { 
    IErrorKind, 
    IBaseError, 
    IErrorContext,
    IErrorSeverity 
} from '../../types/common/errorTypes';
import type { IBaseEvent } from '../../types/common/baseTypes';
import type { 
    IBaseManager, 
    IBaseManagerMetadata 
} from '../../types/agent/agentManagerTypes';
import type { 
    IStatusEntity, 
    IStatusType, 
    IStatusTransitionContext 
} from '../../types/common/statusTypes';
import type { IHandlerResult } from '../../types/common/baseTypes';
import type { 
    IPerformanceMetrics,
    IErrorMetrics,
    ITimeMetrics
} from '../../types/metrics/base/performanceMetrics';
import type { IResourceMetrics } from '../../types/metrics/base/resourceMetrics';
import type { ISystemHealthMetrics } from '../../types/metrics/base/enhancedMetricsTypes';
import { MetricDomain, MetricType } from '../../types/metrics/base/metricsManagerTypes';
import { RecoveryStrategyType } from '../../types/common/recoveryTypes';

/**
 * Abstract base manager class providing core functionality for all managers
 * 
 * Domain Manager Implementation:
 * 1. Extend CoreManager
 * 2. Implement required category property
 * 3. Override initialize() if needed
 * 4. Register with service directory
 */
export abstract class CoreManager implements IBaseManager {
    protected static _instance: any = null;
    protected readonly logManager: LogManager;
    protected readonly errorManager: ErrorManager;
    protected readonly statusManager: StatusManager;
    protected readonly metricsManager: MetricsManager;
    protected readonly versionManager: VersionManager;
    protected readonly eventEmitter: BaseEventEmitter;
    protected readonly domainManagers: Map<string, IBaseManager>;

    // Required by IBaseManager - must be implemented by domain managers
    public abstract readonly category: MANAGER_CATEGORY_enum;

    protected constructor() {
        // Initialize core services
        this.logManager = LogManager.getInstance();
        this.errorManager = ErrorManager.getInstance();
        this.statusManager = StatusManager.getInstance();
        this.metricsManager = MetricsManager.getInstance();
        this.versionManager = VersionManager.getInstance();
        this.eventEmitter = BaseEventEmitter.getInstance();
        this.domainManagers = new Map();
    }

    public static getInstance(): CoreManager {
        const Class = this as any;
        if (!Class._instance) {
            Class._instance = new Class();
        }
        return Class._instance;
    }

    // ─── IBaseManager Implementation ───────────────────────────────────────────────

    /**
     * Initialize the manager
     * Domain managers can override this method to provide specific initialization
     * @param params Optional initialization parameters
     */
    public async initialize(params?: Record<string, unknown>): Promise<void> {
        const metadata = createBaseMetadata(this.constructor.name, 'initialize');
        this.logInfo('Initializing manager', { params, metadata });

        try {
            await this.handleStatusTransition({
                entity: 'agent',
                entityId: this.constructor.name,
                currentStatus: AGENT_STATUS_enum.INITIAL,
                targetStatus: AGENT_STATUS_enum.IDLE,
                context: {
                    component: this.constructor.name,
                    operation: 'initialize',
                    metadata,
                    params
                }
            });
        } catch (error) {
            await this.handleError(error, 'Failed to initialize manager', ERROR_KINDS.InitializationError);
            throw error;
        }
    }

    public async validate(params: unknown): Promise<boolean> {
        return true;
    }

    public getMetadata(): IBaseManagerMetadata {
        return {
            category: this.category,
            operation: 'base',
            duration: 0,
            status: 'success',
            agent: {
                id: '',
                name: '',
                role: '',
                status: ''
            },
            timestamp: Date.now(),
            component: this.constructor.name
        };
    }

    // ─── Service Directory Methods ───────────────────────────────────────────────

    /**
     * Register a domain manager
     * Each domain should register its primary manager with a unique name
     */
    protected registerDomainManager<T extends IBaseManager>(name: string, manager: T): void {
        if (this.domainManagers.has(name)) {
            throw createError({
                message: `Manager already registered: ${name}`,
                type: ERROR_KINDS.ConfigurationError,
                context: {
                    component: this.constructor.name,
                    managerName: name,
                    category: manager.category
                }
            });
        }
        this.domainManagers.set(name, manager);
        this.logInfo(`Registered manager: ${name}`);
    }

    protected getDomainManager<T extends IBaseManager>(name: string): T {
        const manager = this.domainManagers.get(name);
        if (!manager) {
            throw createError({
                message: `Manager not found: ${name}`,
                type: ERROR_KINDS.ConfigurationError,
                context: {
                    component: this.constructor.name,
                    managerName: name,
                    availableManagers: Array.from(this.domainManagers.keys())
                }
            });
        }
        return manager as T;
    }

    protected hasDomainManager(name: string): boolean {
        return this.domainManagers.has(name);
    }

    protected getRegisteredDomainManagers(): string[] {
        return Array.from(this.domainManagers.keys());
    }

    // ─── Protected Service Access Methods ───────────────────────────────────────

    /**
     * Get metrics manager instance
     */
    protected getMetricsManager(): MetricsManager {
        return this.metricsManager;
    }

    // ─── Protected Logging Methods ──────────────────────────────────────────────

    protected log(message: string, level: ILogLevel = 'info', context?: Record<string, unknown>): void {
        const component = this.constructor.name;
        const logContext = {
            component,
            timestamp: Date.now(),
            ...(context || {})
        };
        this.logManager.log(message, level, logContext);
    }

    protected logDebug(message: string, context?: Record<string, unknown>): void {
        this.log(message, 'debug', context);
    }

    protected logInfo(message: string, context?: Record<string, unknown>): void {
        this.log(message, 'info', context);
    }

    protected logWarn(message: string, context?: Record<string, unknown>): void {
        this.log(message, 'warn', context);
    }

    protected logError(message: string, error?: Error, context?: Record<string, unknown>): void {
        const errorContext = {
            ...(context || {}),
            error: error || null
        };
        this.log(message, 'error', errorContext);
    }

    // ─── Protected Error Handling ────────────────────────────────────────────────

    /**
     * Create error context with metrics and metadata
     */
    protected async createErrorContext(
        operation: string,
        details?: Record<string, unknown>
    ): Promise<IErrorContext> {
        const [resourceMetrics, performanceMetrics] = await Promise.all([
            this.metricsManager.getInitialResourceMetrics(),
            this.metricsManager.getInitialPerformanceMetrics()
        ]);

        // Create default error metrics
        const defaultErrorMetrics: IErrorMetrics = {
            totalErrors: 0,
            errorRate: 0,
            errorDistribution: Object.values(ERROR_KINDS).reduce(
                (acc, kind) => ({ ...acc, [kind]: 0 }),
                {} as Record<IErrorKind, number>
            ),
            severityDistribution: Object.values(ERROR_SEVERITY_enum).reduce(
                (acc, severity) => ({ ...acc, [severity]: 0 }),
                {} as Record<IErrorSeverity, number>
            ),
            patterns: [],
            impact: {
                severity: ERROR_SEVERITY_enum.ERROR,
                businessImpact: 0,
                userExperienceImpact: 0,
                systemStabilityImpact: 0,
                resourceImpact: {
                    cpu: 0,
                    memory: 0,
                    io: 0
                }
            },
            recovery: {
                meanTimeToRecover: 0,
                recoverySuccessRate: 0,
                strategyDistribution: Object.values(RecoveryStrategyType).reduce(
                    (acc, strategy) => ({ ...acc, [strategy]: 0 }),
                    {} as Record<RecoveryStrategyType, number>
                ),
                failedRecoveries: 0
            },
            prevention: {
                preventedCount: 0,
                preventionRate: 0,
                earlyWarnings: 0
            },
            trends: {
                dailyRates: [],
                weeklyRates: [],
                monthlyRates: []
            }
        };

        // Create system health metrics
        const systemHealth: ISystemHealthMetrics = {
            timestamp: Date.now(),
            cpu: {
                usage: 0,
                loadAverage: [0, 0, 0]
            },
            memory: {
                used: 0,
                total: 0,
                free: 0
            },
            disk: {
                read: 0,
                write: 0,
                free: 0,
                total: 0
            },
            network: {
                upload: 0,
                download: 0
            },
            processMetrics: {
                uptime: process.uptime(),
                memoryUsage: process.memoryUsage(),
                cpuUsage: process.cpuUsage()
            }
        };

        return {
            component: this.constructor.name,
            operation,
            details,
            timestamp: Date.now(),
            error: new Error('No error details available'),
            severity: ERROR_SEVERITY_enum.ERROR,
            recoverable: true,
            retryCount: 0,
            failureReason: '',
            recommendedAction: '',
            metrics: defaultErrorMetrics,
            systemHealth
        };
    }

    /**
     * Enhanced error handling with metrics and recovery
     */
    protected async handleError(
        error: Error | unknown,
        context: string,
        errorType: IErrorKind = ERROR_KINDS.SystemError
    ): Promise<void> {
        const startTime = Date.now();

        try {
            // Create error context with metrics
            const errorContext = await this.createErrorContext(context);
            
            // Track error metrics
            await this.metricsManager.trackMetric({
                domain: MetricDomain.WORKFLOW,
                type: MetricType.PERFORMANCE,
                value: 1,
                timestamp: startTime,
                metadata: {
                    errorType,
                    errorContext: context,
                    component: this.constructor.name,
                    metrics: errorContext.metrics
                }
            });

            // Create domain error with enhanced context
            const domainError = createError({
                message: error instanceof Error ? error.message : String(error),
                type: errorType,
                severity: ERROR_SEVERITY_enum.ERROR,
                context: {
                    ...errorContext,
                    error: error instanceof Error ? error : new Error(String(error))
                }
            });

            // Log error with enhanced context
            this.logError(domainError.message, domainError, {
                context,
                errorType,
                metrics: errorContext.metrics
            });

            // Handle error through ErrorManager
            await this.errorManager.handleError(domainError, context, errorType);

        } catch (handlingError) {
            // If error handling fails, log it but don't recurse
            this.logError(
                'Error during error handling',
                handlingError instanceof Error ? handlingError : new Error(String(handlingError)),
                { originalError: error, context }
            );
        }
    }

    // ─── Protected Status Management ────────────────────────────────────────────

    protected async handleStatusTransition(params: {
        entity: IStatusEntity;
        entityId: string;
        currentStatus: IStatusType;
        targetStatus: IStatusType;
        context?: Record<string, unknown>;
    }): Promise<boolean> {
        try {
            const [resourceMetrics, performanceMetrics] = await Promise.all([
                this.metricsManager.getInitialResourceMetrics(),
                this.metricsManager.getInitialPerformanceMetrics()
            ]);

            const transitionContext: IStatusTransitionContext = {
                entity: params.entity,
                entityId: params.entityId,
                currentStatus: params.currentStatus,
                targetStatus: params.targetStatus,
                operation: `${params.entity}_status_transition`,
                phase: 'pre-execution',
                startTime: Date.now(),
                duration: 0,
                resourceMetrics,
                performanceMetrics,
                metadata: createBaseMetadata('status', 'transition'),
                context: params.context
            };

            return await this.statusManager.transition(transitionContext);
        } catch (error) {
            await this.handleError(
                error,
                `Status transition failed: ${params.entity}[${params.entityId}] ${params.currentStatus} -> ${params.targetStatus}`,
                ERROR_KINDS.ValidationError
            );
            return false;
        }
    }

    // ─── Protected Utility Methods ────────────────────────────────────────────

    /**
     * Enhanced safe execution with metrics and recovery
     */
    protected async safeExecute<T>(
        operation: () => Promise<T>,
        errorContext: string
    ): Promise<IHandlerResult<T>> {
        const startTime = Date.now();
        const baseMetadata = createBaseMetadata(this.constructor.name, 'execution');

        try {
            // Start metrics collection
            const initialMetrics = await Promise.all([
                this.metricsManager.getInitialResourceMetrics(),
                this.metricsManager.getInitialPerformanceMetrics()
            ]);

            // Execute operation
            const result = await operation();

            // Get final metrics
            const finalMetrics = await Promise.all([
                this.metricsManager.getInitialResourceMetrics(),
                this.metricsManager.getInitialPerformanceMetrics()
            ]);

            // Track execution metrics
            await this.metricsManager.trackMetric({
                domain: MetricDomain.WORKFLOW,
                type: MetricType.PERFORMANCE,
                value: Date.now() - startTime,
                timestamp: startTime,
                metadata: {
                    operation: errorContext,
                    component: this.constructor.name,
                    initialMetrics,
                    finalMetrics
                }
            });

            return {
                success: true,
                data: result,
                metadata: {
                    ...baseMetadata,
                    metrics: {
                        resources: finalMetrics[0],
                        performance: finalMetrics[1]
                    }
                }
            };
        } catch (error) {
            await this.handleError(error, errorContext, ERROR_KINDS.ExecutionError);
            return {
                success: false,
                metadata: {
                    ...baseMetadata,
                    error: error instanceof Error ? error : new Error(String(error))
                }
            };
        }
    }

    // ─── Protected Event Methods ─────────────────────────────────────────────────

    /**
     * Emit a domain event with enhanced error handling
     */
    protected async emitEvent<T extends IBaseEvent>(event: T): Promise<void> {
        try {
            const startTime = Date.now();
            await this.eventEmitter.emit(event);

            // Track event metrics
            await this.metricsManager.trackMetric({
                domain: MetricDomain.WORKFLOW,
                type: MetricType.PERFORMANCE,
                value: Date.now() - startTime,
                timestamp: startTime,
                metadata: {
                    eventType: event.type,
                    component: this.constructor.name
                }
            });
        } catch (error) {
            await this.handleError(
                error,
                `Failed to emit event: ${event.type}`,
                ERROR_KINDS.ExecutionError
            );
        }
    }
}


