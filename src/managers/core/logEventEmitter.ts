/**
 * @file logEventEmitter.ts
 * @path src/managers/core/logEventEmitter.ts
 * @description Log event emitter implementation
 *
 * @module @managers/core
 */

import { v4 as uuidv4 } from 'uuid';
import { BaseEventEmitter } from './eventEmitter';
import { MetricsManager } from './metricsManager';
import { StatusManager } from './statusManager';
import { MANAGER_CATEGORY_enum, LOG_EVENT_TYPE, AGENT_STATUS_enum } from '../../types/common/enumTypes';
import { ERROR_KINDS } from '../../types/common/errorTypes';
import { MetricDomain, MetricType } from '../../types/metrics';
import { createBaseMetadata } from '../../types/common/baseTypes';
import { createError } from '../../types/common/errorTypes';

import type { 
    ILog,
    ITaskLogMetadata,
    IWorkflowLogMetadata,
    IAgentLogMetadata,
    IBaseLogMetadata
} from '../../types/team/teamLogsTypes';
import type { ILogLevel } from '../../types/common/enumTypes';
import type { IBaseEvent } from '../../types/common/baseTypes';
import type { IBaseManagerMetadata } from '../../types/agent/agentManagerTypes';
import type { ILLMUsageMetrics } from '../../types/llm/llmMetricTypes';
import type {
    LogEvent,
    ILogCreatedEvent,
    ILogUpdatedEvent,
    ILogClearedEvent,
    ITaskLogAddedEvent,
    IWorkflowLogAddedEvent,
    IAgentLogAddedEvent
} from '../../types/common/loggingTypes';
import type { 
    IStatusEntity,
    IStatusType,
    IStatusTransitionContext 
} from '../../types/common/statusTypes';
import type { IErrorKind } from '../../types/common/errorTypes';

/**
 * Log event emitter implementation
 */
export class LogEventEmitter extends BaseEventEmitter {
    private static logInstance: LogEventEmitter;
    private readonly metricsManager: MetricsManager;
    private readonly statusManager: StatusManager;
    public readonly category: MANAGER_CATEGORY_enum = MANAGER_CATEGORY_enum.CORE;

    protected constructor() {
        super();
        this.metricsManager = MetricsManager.getInstance();
        this.statusManager = StatusManager.getInstance();
    }

    public static override getInstance(): LogEventEmitter {
        if (!LogEventEmitter.logInstance) {
            LogEventEmitter.logInstance = new LogEventEmitter();
        }
        return LogEventEmitter.logInstance;
    }

    protected createBaseEvent<T extends LOG_EVENT_TYPE>(type: T): IBaseEvent & { type: T } {
        return {
            id: uuidv4(),
            timestamp: Date.now(),
            type,
            metadata: createBaseMetadata('LogEventEmitter', type)
        };
    }

    protected createLogMetadata(): IBaseLogMetadata {
        const baseMetadata = createBaseMetadata('LogEventEmitter', 'emit');
        const llmUsageMetrics: ILLMUsageMetrics = {
            component: 'LogEventEmitter',
            category: 'llm',
            version: '1.0.0',
            totalRequests: 0,
            activeUsers: 0,
            requestsPerSecond: 0,
            averageResponseSize: 0,
            peakMemoryUsage: 0,
            uptime: 0,
            rateLimit: {
                current: 0,
                limit: 0,
                remaining: 0,
                resetTime: Date.now()
            },
            timestamp: Date.now(),
            tokenDistribution: {
                prompt: 0,
                completion: 0,
                total: 0
            },
            modelDistribution: {
                gpt4: 0,
                gpt35: 0,
                other: 0
            },
            activeInstances: 0
        };

        return {
            ...baseMetadata,
            llmUsageMetrics,
            performance: {
                component: 'LogEventEmitter',
                category: 'performance',
                version: '1.0.0',
                timestamp: Date.now(),
                responseTime: {
                    average: 0,
                    min: 0,
                    max: 0,
                    total: 0
                },
                throughput: {
                    requestsPerSecond: 0,
                    bytesPerSecond: 0,
                    operationsPerSecond: 0,
                    dataProcessedPerSecond: 0
                }
            }
        };
    }

    async emitLogCreated(log: ILog): Promise<void> {
        const event: ILogCreatedEvent = {
            ...this.createBaseEvent(LOG_EVENT_TYPE.LOG_CREATED),
            log,
            metadata: this.createLogMetadata()
        };
        await this.emit<LogEvent>(event);
    }

    async emitLogUpdated(previousLog: ILog, newLog: ILog): Promise<void> {
        const event: ILogUpdatedEvent = {
            ...this.createBaseEvent(LOG_EVENT_TYPE.LOG_UPDATED),
            previousLog,
            newLog,
            metadata: this.createLogMetadata()
        };
        await this.emit<LogEvent>(event);
    }

    async emitLogCleared(): Promise<void> {
        const event: ILogClearedEvent = {
            ...this.createBaseEvent(LOG_EVENT_TYPE.LOG_CLEARED),
            metadata: this.createLogMetadata()
        };
        await this.emit<LogEvent>(event);
    }

    async emitTaskLogAdded(
        log: ILog,
        taskId: string,
        metadata: ITaskLogMetadata
    ): Promise<void> {
        const event: ITaskLogAddedEvent = {
            ...this.createBaseEvent(LOG_EVENT_TYPE.TASK_LOG_ADDED),
            log,
            taskId,
            metadata
        };
        await this.emit<LogEvent>(event);
    }

    async emitWorkflowLogAdded(
        log: ILog,
        workflowId: string,
        metadata: IWorkflowLogMetadata
    ): Promise<void> {
        const event: IWorkflowLogAddedEvent = {
            ...this.createBaseEvent(LOG_EVENT_TYPE.WORKFLOW_LOG_ADDED),
            log,
            workflowId,
            metadata
        };
        await this.emit<LogEvent>(event);
    }

    async emitAgentLogAdded(
        log: ILog,
        agentId: string,
        metadata: IAgentLogMetadata
    ): Promise<void> {
        const event: IAgentLogAddedEvent = {
            ...this.createBaseEvent(LOG_EVENT_TYPE.AGENT_LOG_ADDED),
            log,
            agentId,
            metadata
        };
        await this.emit<LogEvent>(event);
    }

    // ─── Helper Methods ─────────────────────────────────────────────────────────

    private createLog(
        message: string,
        level: ILogLevel,
        agentName?: string | null,
        taskId?: string,
        error?: Error
    ): ILog {
        return {
            id: uuidv4(),
            timestamp: Date.now(),
            level,
            message,
            metadata: {
                ...createBaseMetadata('LogEventEmitter', 'log'),
                agent: {
                    id: '',
                    name: agentName || 'Unknown Agent',
                    role: '',
                    status: ''
                },
                performance: {
                    component: 'LogEventEmitter',
                    category: 'performance',
                    version: '1.0.0',
                    timestamp: Date.now(),
                    responseTime: {
                        average: 0,
                        min: 0,
                        max: 0,
                        total: 0
                    },
                    throughput: {
                        requestsPerSecond: 0,
                        bytesPerSecond: 0,
                        operationsPerSecond: 0,
                        dataProcessedPerSecond: 0
                    }
                }
            },
            context: {
                taskId: taskId || 'unknown',
                ...(error && {
                    error: {
                        name: error.name,
                        message: error.message,
                        stack: error.stack
                    }
                })
            }
        };
    }

    // ─── Public Logging Methods ───────────────────────────────────────────────────

    async debug(message: string, agentName?: string | null, taskId?: string): Promise<void> {
        const log = this.createLog(message, 'debug', agentName, taskId);
        await this.emitLogCreated(log);
    }

    async info(message: string, agentName?: string | null, taskId?: string): Promise<void> {
        const log = this.createLog(message, 'info', agentName, taskId);
        await this.emitLogCreated(log);
    }

    async warn(message: string, agentName?: string | null, taskId?: string): Promise<void> {
        const log = this.createLog(message, 'warn', agentName, taskId);
        await this.emitLogCreated(log);
    }

    async error(message: string, agentName?: string | null, taskId?: string, error?: Error): Promise<void> {
        const log = this.createLog(message, 'error', agentName, taskId, error);
        await this.emitLogCreated(log);
    }

    /**
     * Initialize the emitter with optional configuration
     * @param params - Initialization parameters
     * @param params.logLevel - Initial log level (default: 'info')
     * @param params.metrics - Initial metrics configuration
     * @param params.handlers - Pre-configured event handlers
     */
    public async initialize(params?: Record<string, unknown>): Promise<void> {
        try {
            // Track initialization metrics
            await this.metricsManager.trackMetric({
                domain: MetricDomain.WORKFLOW,
                type: MetricType.PERFORMANCE,
                value: 0,
                timestamp: Date.now(),
                metadata: {
                    component: 'LogEventEmitter',
                    operation: 'initialize',
                    params
                }
            });

            // Register pre-configured handlers if provided
            if (params?.handlers && Array.isArray(params.handlers)) {
                for (const handler of params.handlers) {
                    if (handler.type && handler.callback) {
                        this.on(handler.type, handler.callback);
                    }
                }
            }

            // Log initialization
            await this.info('Log event emitter initialized');

            // Handle status transition
            await this.handleStatusTransition({
                entity: 'agent' as IStatusEntity,
                entityId: this.constructor.name,
                currentStatus: AGENT_STATUS_enum.INITIAL as IStatusType,
                targetStatus: AGENT_STATUS_enum.IDLE as IStatusType,
                context: {
                    component: this.constructor.name,
                    operation: 'initialize',
                    params
                }
            });
        } catch (error) {
            await this.handleError(error, 'Failed to initialize log event emitter', ERROR_KINDS.InitializationError);
            throw error;
        }
    }

    /**
     * Handle status transitions
     */
    protected async handleStatusTransition(params: {
        entity: IStatusEntity;
        entityId: string;
        currentStatus: IStatusType;
        targetStatus: IStatusType;
        context?: Record<string, unknown>;
    }): Promise<boolean> {
        try {
            const transitionContext: IStatusTransitionContext = {
                entity: params.entity,
                entityId: params.entityId,
                currentStatus: params.currentStatus,
                targetStatus: params.targetStatus,
                operation: `${params.entity}_status_transition`,
                phase: 'execution',
                startTime: Date.now(),
                duration: 0,
                metadata: createBaseMetadata('LogEventEmitter', 'transition'),
                context: params.context
            };

            return await this.statusManager.transition(transitionContext);
        } catch (error) {
            await this.handleError(error, 'Status transition failed');
            return false;
        }
    }

    /**
     * Handle errors with proper logging and metrics
     */
    protected async handleError(error: unknown, context: string, errorType: IErrorKind = ERROR_KINDS.SystemError): Promise<void> {
        const errorObj = createError({
            message: error instanceof Error ? error.message : String(error),
            type: errorType,
            context: {
                component: this.constructor.name,
                operation: context,
                error: error instanceof Error ? error : new Error(String(error))
            }
        });

        await this.error(errorObj.message, null, undefined, errorObj);

        await this.metricsManager.trackMetric({
            domain: MetricDomain.WORKFLOW,
            type: MetricType.PERFORMANCE,
            value: 1,
            timestamp: Date.now(),
            metadata: {
                errorType,
                errorContext: context,
                component: this.constructor.name
            }
        });
    }

    /**
     * Validate manager parameters
     * @param params - Parameters to validate
     * @returns True if parameters are valid, false otherwise
     */
    public async validate(params: unknown): Promise<boolean> {
        const isValid = params === undefined || (typeof params === 'object' && params !== null);
        if (!isValid) {
            await this.warn('Invalid initialization parameters');
            return false;
        }

        // Validate specific parameters if provided
        if (params && typeof params === 'object') {
            const config = params as Record<string, unknown>;
            
            // Validate handlers if provided
            if (config.handlers && !Array.isArray(config.handlers)) {
                await this.warn('Invalid handlers configuration');
                return false;
            }

            // Validate metrics if provided
            if (config.metrics && typeof config.metrics !== 'object') {
                await this.warn('Invalid metrics configuration');
                return false;
            }
        }

        return true;
    }

    /**
     * Get manager metadata
     */
    public getMetadata(): IBaseManagerMetadata {
        return {
            category: this.category,
            operation: 'emit',
            duration: 0,
            status: 'success',
            agent: {
                id: '',
                name: '',
                role: '',
                status: AGENT_STATUS_enum.INITIAL
            },
            timestamp: Date.now(),
            component: 'LogEventEmitter'
        };
    }
}

export default LogEventEmitter.getInstance();
