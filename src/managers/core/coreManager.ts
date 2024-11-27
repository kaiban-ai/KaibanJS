/**
 * @file coreManager.ts
 * @path src/managers/core/coreManager.ts
 * @description Core management implementation providing base functionality and service registry
 */

import { LogManager } from './logManager';
import { ErrorManager } from './errorManager';
import { StatusManager } from './statusManager';
import { MetricsManager } from './metricsManager';
import { createError } from '../../types/common/commonErrorTypes';
import { MetadataFactory } from '../../utils/factories/metadataFactory';
import { 
    createBaseMetadata, 
    createDefaultValidation,
    IStatusChangeMetadata,
    IBaseContextPartial,
    IStatusChangeContext
} from '../../types/common/commonMetadataTypes';

import type { ILogLevel } from '../../types/common/commonEnums';
import type { 
    IErrorKind, 
    IBaseErrorHandlerParams
} from '../../types/common/commonErrorTypes';
import type { 
    IStatusEntity,
    IStatusType,
    IStatusTransitionContext
} from '../../types/common/commonStatusTypes';
import type { IHandlerResult } from '../../types/common/commonHandlerTypes';

/**
 * Abstract base manager class providing core functionality for all managers
 */
export abstract class CoreManager {
    protected static _instance: any = null;
    protected readonly logManager: LogManager;
    protected readonly errorManager: ErrorManager;
    protected readonly statusManager: StatusManager;
    private readonly domainManagers: Map<string, any>;

    protected constructor() {
        this.logManager = LogManager.getInstance();
        this.errorManager = ErrorManager.getInstance();
        this.statusManager = StatusManager.getInstance();
        this.domainManagers = new Map();
    }

    public static getInstance(): CoreManager {
        const Class = this as any;
        if (!Class._instance) {
            Class._instance = new Class();
        }
        return Class._instance;
    }

    // ─── Domain Manager Registry ─────────────────────────────────────────────

    protected registerDomainManager<T>(name: string, manager: T): void {
        if (this.domainManagers.has(name)) {
            throw createError({
                message: `Manager already registered with name: ${name}`,
                type: 'ConfigurationError',
                context: {
                    component: this.constructor.name,
                    managerName: name
                }
            });
        }
        this.domainManagers.set(name, manager);
    }

    protected getDomainManager<T>(name: string): T {
        const manager = this.domainManagers.get(name);
        if (!manager) {
            throw createError({
                message: `Domain manager not found: ${name}`,
                type: 'ConfigurationError',
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

    // ─── Protected Error Handling ────────────────────────────────────────────

    /**
     * Handle errors through the ErrorManager with enhanced context and metadata
     */
    protected handleError(error: Error | unknown, context: string, errorType: IErrorKind = 'SystemError'): void {
        const kaibanError = createError({
            message: error instanceof Error ? error.message : String(error),
            type: errorType,
            context: {
                component: this.constructor.name,
                details: context,
                originalError: error instanceof Error ? error : undefined
            }
        });

        const errorHandlerParams: IBaseErrorHandlerParams = {
            error: kaibanError,
            context: {
                component: this.constructor.name,
                details: context,
                timestamp: Date.now(),
                errorType: errorType
            },
            metadata: MetadataFactory.createErrorResult(kaibanError).metadata
        };

        this.logManager.error(`${errorType}: ${kaibanError.message}`, this.constructor.name, undefined, kaibanError);
        this.errorManager.handleError(errorHandlerParams, this.constructor.name);
    }

    // ─── Protected Status Management ────────────────────────────────────────────

    /**
     * Request status transitions through StatusManager
     */
    protected async handleStatusTransition(params: {
        entity: IStatusEntity;
        entityId: string;
        currentStatus: IStatusType;
        targetStatus: IStatusType;
        context?: IBaseContextPartial;
    }): Promise<boolean> {
        try {
            const startTime = Date.now();
            const metricsManager = MetricsManager.getInstance();

            const metadata: IStatusChangeMetadata = {
                ...createBaseMetadata('status', 'transition'),
                entity: {
                    type: params.entity,
                    id: params.entityId,
                    name: params.entityId // Default to ID if name not provided
                },
                transition: {
                    from: params.currentStatus,
                    to: params.targetStatus,
                    reason: 'Status transition requested',
                    triggeredBy: this.constructor.name
                },
                validation: createDefaultValidation(),
                resources: await metricsManager.getInitialResourceMetrics(),
                context: {
                    source: 'status',
                    target: 'transition',
                    correlationId: Date.now().toString(),
                    causationId: Date.now().toString(),
                    taskId: '',
                    taskName: '',
                    agentId: '',
                    agentName: '',
                    workflowId: '',
                    messageId: '',
                    ...params.context
                }
            };

            const transitionContext: IStatusTransitionContext = {
                ...params,
                metadata,
                operation: `${params.entity}_status_transition`,
                phase: 'pre-execution',
                startTime,
                duration: 0,
                resourceMetrics: await metricsManager.getInitialResourceMetrics(),
                performanceMetrics: await metricsManager.getInitialPerformanceMetrics()
            };

            return await this.statusManager.transition(transitionContext);
        } catch (error) {
            this.handleError(
                error,
                `Status transition failed: ${params.entity}[${params.entityId}] ${params.currentStatus} -> ${params.targetStatus}`,
                'ValidationError'
            );
            return false;
        }
    }

    // ─── Protected Logging Methods ──────────────────────────────────────────────

    protected log(
        message: string,
        agentName?: string | null,
        taskId?: string,
        level: ILogLevel = 'info',
        error?: Error
    ): void {
        this.logManager.log(message, agentName, taskId, level, error);
    }

    protected logDebug(message: string, agentName?: string | null, taskId?: string): void {
        this.logManager.debug(message, agentName, taskId);
    }

    protected logInfo(message: string, agentName?: string | null, taskId?: string): void {
        this.logManager.info(message, agentName, taskId);
    }

    protected logWarn(message: string, agentName?: string | null, taskId?: string): void {
        this.logManager.warn(message, agentName, taskId);
    }

    protected logError(message: string, agentName?: string | null, taskId?: string, error?: Error): void {
        this.logManager.error(message, agentName, taskId, error);
    }

    // ─── Protected Metrics Methods ──────────────────────────────────────────────

    /**
     * Get metrics manager instance
     */
    protected getMetricsManager(): MetricsManager {
        return MetricsManager.getInstance();
    }

    // ─── Protected Utility Methods ────────────────────────────────────────────

    /**
     * Safely execute operations with error handling
     */
    protected async safeExecute<T>(
        operation: () => Promise<T>,
        errorContext: string
    ): Promise<IHandlerResult<T>> {
        try {
            const result = await operation();
            return {
                success: true,
                data: result,
                metadata: createBaseMetadata(this.constructor.name, 'execution')
            };
        } catch (error) {
            const kaibanError = createError({
                message: error instanceof Error ? error.message : String(error),
                type: 'SystemError',
                context: {
                    component: this.constructor.name,
                    details: errorContext,
                    originalError: error instanceof Error ? error : undefined
                }
            });
            this.handleError(kaibanError, errorContext);
            return {
                success: false,
                error: kaibanError,
                metadata: MetadataFactory.createErrorResult(kaibanError).metadata
            };
        }
    }
}

export default CoreManager;
