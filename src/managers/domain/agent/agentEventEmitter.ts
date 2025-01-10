/**
 * @file agentEventEmitter.ts
 * @path src/managers/domain/agent/agentEventEmitter.ts
 * @description Agent-specific event emitter implementation
 */

// Runtime imports
import { CoreManager } from '../../core/coreManager';
import { BaseEventEmitter } from '../../core/eventEmitter';
import { v4 as uuidv4 } from 'uuid';
import { createBaseMetadata } from '../../../types/common/baseTypes';
import { MANAGER_CATEGORY_enum, AGENT_STATUS_enum } from '../../../types/common/enumTypes';
import { ERROR_KINDS } from '../../../types/common/errorTypes';
import { METRIC_DOMAIN_enum as MetricDomain, METRIC_TYPE_enum as MetricType } from '../../../types/common/enumTypes';
import type { IMetricType } from '../../../types/metrics/base/metricTypes';
import { AGENT_EVENT_TYPE } from '../../../types/agent/agentEventTypes';

// Type-only imports from common domain
import type {
    IEventEmitter,
    IEventHandler,
    IBaseEvent
} from '../../../types/common/baseTypes';

// Runtime imports from agent domain
import { IBaseManagerMetadata } from '../../../types/agent/agentManagerTypes';
import { AgentMetricsManager } from './agentMetricsManager';
import { ErrorManager } from '../../core/errorManager';
import { MetricsManager } from '../../core/metricsManager';
import type {
    IAgentCreatedEvent,
    IAgentUpdatedEvent,
    IAgentDeletedEvent,
    IAgentStatusChangeEvent,
    IAgentErrorEvent,
    IAgentExecutionEvent,
    IAgentValidationEvent,
    IAgentValidationCompletedEvent,
    IAgentErrorOccurredEvent,
    IAgentErrorHandledEvent,
    IAgentIterationStartedEvent,
    IAgentIterationCompletedEvent,
    IAgentIterationFailedEvent,
    IAgentMetricsUpdatedEvent,
    IAgentConfigUpdatedEvent,
    IAgentEventMetadata
} from '../../../types/agent/agentEventTypes';

// Metric types needed for implementation
import type { 
    IAgentPerformanceMetrics,
    IAgentUsageMetrics
} from '../../../types/agent/agentMetricTypes';

export class AgentEventEmitter extends CoreManager implements IEventEmitter {
    protected static _instance: AgentEventEmitter;
    protected readonly eventEmitter: BaseEventEmitter;
    protected readonly metricsManager: MetricsManager;
    protected readonly agentMetricsManager: AgentMetricsManager;
    protected readonly errorManager: ErrorManager;
    public readonly category: MANAGER_CATEGORY_enum = MANAGER_CATEGORY_enum.SERVICE;

    protected constructor() {
        super();
        this.eventEmitter = BaseEventEmitter.getInstance();
        this.metricsManager = MetricsManager.getInstance();
        this.agentMetricsManager = AgentMetricsManager.getInstance();
        this.errorManager = ErrorManager.getInstance();
        this.registerDomainManager('AgentEventEmitter', this);
    }

    public static getInstance(): AgentEventEmitter {
        if (!AgentEventEmitter._instance) {
            AgentEventEmitter._instance = new AgentEventEmitter();
        }
        return AgentEventEmitter._instance;
    }

    // ─── IEventEmitter Implementation ────────────────────────────────────────────

    public async emit<T extends IBaseEvent>(event: T): Promise<void> {
        await this.eventEmitter.emit(event);
    }

    public on<T extends IBaseEvent>(eventType: string, handler: IEventHandler<T>): void {
        this.eventEmitter.on(eventType, handler);
    }

    public off<T extends IBaseEvent>(eventType: string, handler: IEventHandler<T>): void {
        this.eventEmitter.off(eventType, handler);
    }

    // ─── Agent-specific Event Methods ──────────────────────────────────────────────

    private createDefaultPerformanceMetrics(): IAgentPerformanceMetrics {
        return {
            thinking: {
                reasoningTime: { average: 0, min: 0, max: 0 },
                planningTime: { average: 0, min: 0, max: 0 },
                learningTime: { average: 0, min: 0, max: 0 },
                decisionConfidence: 0,
                learningEfficiency: 0,
                duration: 0,
                success: true,
                errorCount: 0,
                timestamp: Date.now(),
                component: this.constructor.name,
                category: 'THINKING',
                version: '1.0.0'
            },
            taskSuccessRate: 0,
            goalAchievementRate: 0,
            responseTime: { average: 0, min: 0, max: 0 },
            throughput: { requestsPerSecond: 0, bytesPerSecond: 0 },
            duration: 0,
            success: true,
            errorCount: 0,
            component: this.constructor.name,
            category: 'PERFORMANCE',
            version: '1.0.0',
            timestamp: Date.now()
        };
    }

    private createDefaultUsageMetrics(): IAgentUsageMetrics {
        return {
            state: {
                currentState: 'INITIAL',
                stateTime: 0,
                transitionCount: 0,
                failedTransitions: 0,
                blockedTaskCount: 0,
                historyEntryCount: 0,
                lastHistoryUpdate: Date.now(),
                taskStats: {
                    completedCount: 0,
                    failedCount: 0,
                    averageDuration: 0,
                    successRate: 0,
                    averageIterations: 0
                },
                timestamp: Date.now(),
                component: this.constructor.name,
                category: 'STATE',
                version: '1.0.0'
            },
            toolUsageFrequency: {},
            taskCompletionCount: 0,
            averageTaskTime: 0,
            costs: {
                totalCost: 0,
                inputCost: 0,
                outputCost: 0,
                currency: 'USD',
                breakdown: {
                    promptTokens: { count: 0, cost: 0 },
                    completionTokens: { count: 0, cost: 0 }
                }
            },
            totalRequests: 0,
            activeUsers: 0,
            requestsPerSecond: 0,
            averageResponseSize: 0,
            peakMemoryUsage: process.memoryUsage().heapUsed,
            uptime: process.uptime(),
            rateLimit: {
                current: 0,
                limit: 1000,
                remaining: 1000,
                resetTime: Date.now() + 3600000
            },
            timestamp: Date.now(),
            component: this.constructor.name,
            category: 'USAGE',
            version: '1.0.0'
        };
    }

    protected async createAgentMetadata(
        operation: string,
        agentId: string,
        category: string
    ): Promise<IAgentEventMetadata> {
        const startTime = Date.now();
        
        try {
            // Get base metadata from CoreManager
            const baseMetadata = createBaseMetadata(this.constructor.name, operation);
            
            // Get metrics from MetricsManager
            const initialMetrics = await this.metricsManager.get({
                domain: MetricDomain.AGENT,
                type: MetricType.PERFORMANCE as IMetricType,
                timeRange: 'hour'
            });
            
            // Get agent metrics
            const metricsResult = await this.agentMetricsManager.get();

            // Convert base metrics to agent-specific metrics
            const agentMetrics = metricsResult.success && metricsResult.data ? {
                performance: {
                    ...this.createDefaultPerformanceMetrics(),
                    ...(metricsResult.data as any).performance,
                },
                usage: {
                    ...this.createDefaultUsageMetrics(),
                    ...(metricsResult.data as any).usage,
                }
            } : null;

            // Track metric creation
            await this.metricsManager.trackMetric({
                domain: MetricDomain.WORKFLOW,
                type: MetricType.PERFORMANCE,
                value: Date.now() - startTime,
                timestamp: startTime,
                metadata: {
                    operation: 'create_agent_metadata',
                    component: this.constructor.name,
                    initialMetrics
                }
            });

            this.logDebug('Created agent metadata', { 
                operation, 
                agentId, 
                category 
            });

            return {
                ...baseMetadata,
                category,
                source: this.constructor.name,
                correlationId: uuidv4(),
                agent: {
                    id: agentId,
                    name: '', // Will be populated by agent manager
                    role: '', // Will be populated by agent manager
                    status: AGENT_STATUS_enum.INITIAL.toString(),
                metrics: {
                    performance: agentMetrics?.performance || this.createDefaultPerformanceMetrics(),
                    resources: {
                        cognitive: {
                            usage: 0,
                            limit: 100,
                            available: 100,
                            memoryAllocation: 0,
                            cognitiveLoad: 0,
                            processingCapacity: 1,
                            contextUtilization: 0,
                            timestamp: Date.now(),
                            component: this.constructor.name,
                            category: 'COGNITIVE',
                            version: '1.0.0'
                        },
                        cpuUsage: 0,
                        memoryUsage: process.memoryUsage().heapUsed,
                        diskIO: {
                            read: 0,
                            write: 0
                        },
                        networkUsage: {
                            upload: 0,
                            download: 0
                        },
                        usage: 0,
                        limit: 100,
                        available: 100,
                        timestamp: Date.now(),
                        component: this.constructor.name,
                        category: 'RESOURCE',
                        version: '1.0.0'
                    },
                    usage: agentMetrics?.usage || this.createDefaultUsageMetrics(),
                    iterations: 0,
                    executionTime: 0,
                    llmMetrics: {
                        promptTokens: 0,
                        completionTokens: 0,
                        totalTokens: 0
                    }
                }
                }
            };
        } catch (error) {
            await this.errorManager.handleError(
                error,
                `Failed to create agent metadata: ${operation}`,
                ERROR_KINDS.ValidationError
            );
            throw error;
        }
    }

    public async emitAgentCreated(params: Omit<IAgentCreatedEvent, 'id' | 'type' | 'timestamp' | 'metadata'>): Promise<void> {
        const metadata = await this.createAgentMetadata('agent_created', params.agentId, 'LIFECYCLE');
        const event: IAgentCreatedEvent = {
            id: uuidv4(),
            timestamp: Date.now(),
            type: AGENT_EVENT_TYPE.AGENT_CREATED,
            ...params,
            metadata
        };
        await this.emit(event);
    }

    public async emitAgentUpdated(params: Omit<IAgentUpdatedEvent, 'id' | 'type' | 'timestamp' | 'metadata'>): Promise<void> {
        const metadata = await this.createAgentMetadata('agent_updated', params.agentId, 'LIFECYCLE');
        const event: IAgentUpdatedEvent = {
            id: uuidv4(),
            timestamp: Date.now(),
            type: AGENT_EVENT_TYPE.AGENT_UPDATED,
            ...params,
            metadata
        };
        await this.emit(event);
    }

    public async emitAgentDeleted(params: Omit<IAgentDeletedEvent, 'id' | 'type' | 'timestamp' | 'metadata'>): Promise<void> {
        const metadata = await this.createAgentMetadata('agent_deleted', params.agentId, 'LIFECYCLE');
        const event: IAgentDeletedEvent = {
            id: uuidv4(),
            timestamp: Date.now(),
            type: AGENT_EVENT_TYPE.AGENT_DELETED,
            ...params,
            metadata
        };
        await this.emit(event);
    }

    public async emitAgentStatusChanged(params: Omit<IAgentStatusChangeEvent, 'id' | 'type' | 'timestamp' | 'metadata'>): Promise<void> {
        const metadata = await this.createAgentMetadata('agent_status_changed', params.agentId, 'STATE');
        const event: IAgentStatusChangeEvent = {
            id: uuidv4(),
            timestamp: Date.now(),
            type: AGENT_EVENT_TYPE.AGENT_STATUS_CHANGED,
            ...params,
            metadata
        };
        await this.emit(event);
    }

    public async emitAgentIterationStarted(params: Omit<IAgentIterationStartedEvent, 'id' | 'type' | 'timestamp' | 'metadata'>): Promise<void> {
        const metadata = await this.createAgentMetadata('agent_iteration_started', params.agentId, 'ITERATION');
        const event: IAgentIterationStartedEvent = {
            id: uuidv4(),
            timestamp: Date.now(),
            type: AGENT_EVENT_TYPE.AGENT_ITERATION_STARTED,
            ...params,
            metadata
        };
        await this.emit(event);
    }

    public async emitAgentIterationCompleted(params: Omit<IAgentIterationCompletedEvent, 'id' | 'type' | 'timestamp' | 'metadata'>): Promise<void> {
        const metadata = await this.createAgentMetadata('agent_iteration_completed', params.agentId, 'ITERATION');
        const event: IAgentIterationCompletedEvent = {
            id: uuidv4(),
            timestamp: Date.now(),
            type: AGENT_EVENT_TYPE.AGENT_ITERATION_COMPLETED,
            ...params,
            metadata
        };
        await this.emit(event);
    }

    public async emitAgentIterationFailed(params: Omit<IAgentIterationFailedEvent, 'id' | 'type' | 'timestamp' | 'metadata'>): Promise<void> {
        const metadata = await this.createAgentMetadata('agent_iteration_failed', params.agentId, 'ITERATION');
        const event: IAgentIterationFailedEvent = {
            id: uuidv4(),
            timestamp: Date.now(),
            type: AGENT_EVENT_TYPE.AGENT_ITERATION_FAILED,
            ...params,
            metadata
        };
        await this.emit(event);
    }

    public async emitAgentMetricsUpdated(params: Omit<IAgentMetricsUpdatedEvent, 'id' | 'type' | 'timestamp' | 'metadata'>): Promise<void> {
        const metadata = await this.createAgentMetadata('agent_metrics_updated', params.agentId, 'METRICS');
        const event: IAgentMetricsUpdatedEvent = {
            id: uuidv4(),
            timestamp: Date.now(),
            type: AGENT_EVENT_TYPE.AGENT_METRICS_UPDATED,
            ...params,
            metadata
        };
        await this.emit(event);
    }

    public async emitAgentConfigUpdated(params: Omit<IAgentConfigUpdatedEvent, 'id' | 'type' | 'timestamp' | 'metadata'>): Promise<void> {
        const metadata = await this.createAgentMetadata('agent_config_updated', params.agentId, 'CONFIG');
        const event: IAgentConfigUpdatedEvent = {
            id: uuidv4(),
            timestamp: Date.now(),
            type: AGENT_EVENT_TYPE.AGENT_CONFIG_UPDATED,
            ...params,
            metadata
        };
        await this.emit(event);
    }

    public async emitAgentValidationCompleted(params: Omit<IAgentValidationCompletedEvent, 'id' | 'type' | 'timestamp' | 'metadata'>): Promise<void> {
        const metadata = await this.createAgentMetadata('agent_validation_completed', params.agentId, 'VALIDATION');
        const event: IAgentValidationCompletedEvent = {
            id: uuidv4(),
            timestamp: Date.now(),
            type: AGENT_EVENT_TYPE.AGENT_VALIDATION_COMPLETED,
            ...params,
            metadata
        };
        await this.emit(event);
    }

    public async emitAgentErrorOccurred(params: Omit<IAgentErrorOccurredEvent, 'id' | 'type' | 'timestamp' | 'metadata'>): Promise<void> {
        const metadata = await this.createAgentMetadata('agent_error_occurred', params.agentId, 'ERROR');
        const event: IAgentErrorOccurredEvent = {
            id: uuidv4(),
            timestamp: Date.now(),
            type: AGENT_EVENT_TYPE.AGENT_ERROR_OCCURRED,
            ...params,
            metadata
        };
        await this.emit(event);
    }

    public async emitAgentErrorHandled(params: Omit<IAgentErrorHandledEvent, 'id' | 'type' | 'timestamp' | 'metadata'>): Promise<void> {
        const metadata = await this.createAgentMetadata('agent_error_handled', params.agentId, 'ERROR');
        const event: IAgentErrorHandledEvent = {
            id: uuidv4(),
            timestamp: Date.now(),
            type: AGENT_EVENT_TYPE.AGENT_ERROR_HANDLED,
            ...params,
            metadata
        };
        await this.emit(event);
    }

    public async emitAgentError(params: Omit<IAgentErrorEvent, 'id' | 'type' | 'timestamp' | 'metadata'>): Promise<void> {
        const metadata = await this.createAgentMetadata('agent_error', params.agentId, 'ERROR');
        const event: IAgentErrorEvent = {
            id: uuidv4(),
            timestamp: Date.now(),
            type: AGENT_EVENT_TYPE.AGENT_ERROR,
            ...params,
            metadata
        };
        await this.emit(event);
    }

    public async emitAgentExecution(params: Omit<IAgentExecutionEvent, 'id' | 'type' | 'timestamp' | 'metadata'>): Promise<void> {
        const metadata = await this.createAgentMetadata('agent_execution', params.agentId, 'EXECUTION');
        const event: IAgentExecutionEvent = {
            id: uuidv4(),
            timestamp: Date.now(),
            type: AGENT_EVENT_TYPE.AGENT_EXECUTION,
            ...params,
            metadata
        };
        await this.emit(event);
    }

    public async emitAgentValidation(params: Omit<IAgentValidationEvent, 'id' | 'type' | 'timestamp' | 'metadata'>): Promise<void> {
        const metadata = await this.createAgentMetadata('agent_validation', params.agentId, 'VALIDATION');
        const event: IAgentValidationEvent = {
            id: uuidv4(),
            timestamp: Date.now(),
            type: AGENT_EVENT_TYPE.AGENT_VALIDATION,
            ...params,
            metadata
        };
        await this.emit(event);
    }

    public cleanup(): void {
        // No cleanup needed
    }

    // ─── IBaseManager Implementation ────────────────────────────────────────────

    public async initialize(): Promise<void> {
        // No initialization needed
    }

    public async validate(): Promise<boolean> {
        return true;
    }

    public getMetadata(): IBaseManagerMetadata {
        return {
            category: this.category,
            operation: 'event_handling',
            duration: 0,
            status: 'success',
            agent: {
                id: '',
                name: '',
                role: '',
                status: AGENT_STATUS_enum.INITIAL
            },
            timestamp: Date.now(),
            component: this.constructor.name
        };
    }
}

export default AgentEventEmitter.getInstance();
