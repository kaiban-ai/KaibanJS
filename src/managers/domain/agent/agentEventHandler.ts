/**
 * @file agentEventHandler.ts
 * @path src/managers/domain/agent/agentEventHandler.ts
 * @description Agent event handler implementation
 */

// Core imports
import { CoreManager } from '../../core/coreManager';
import { BaseEventEmitter } from '../../core/eventEmitter';

// Internal domain managers
import { AgentStateManager } from './agentStateManager';
import { AgentEventEmitter } from './agentEventEmitter';

// Common imports
import { ERROR_KINDS } from '../../../types/common/errorTypes';
import { MANAGER_CATEGORY_enum, AGENT_STATUS_enum, ERROR_SEVERITY_enum } from '../../../types/common/enumTypes';

// Agent domain imports
import { AGENT_EVENT_TYPE } from '../../../types/agent/agentEventTypes';

// Type imports from common domain
import type { IBaseError } from '../../../types/common/errorTypes';
import type { IErrorMetrics } from '../../../types/metrics/base/errorMetrics';

// Type imports from agent domain
import type { IBaseManager, IBaseManagerMetadata } from '../../../types/agent/agentManagerTypes';
import type { IAgentExecutionState, IAgentError } from '../../../types/agent/agentBaseTypes';
import type { 
    IAgentEventHandler,
    IAgentCreatedEvent,
    IAgentUpdatedEvent,
    IAgentDeletedEvent,
    IAgentStatusChangeEvent,
    IAgentIterationStartedEvent,
    IAgentIterationCompletedEvent,
    IAgentIterationFailedEvent,
    IAgentMetricsUpdatedEvent,
    IAgentConfigUpdatedEvent,
    IAgentValidationEvent,
    IAgentErrorEvent,
    IAgentExecutionEvent,
    AgentEvent,
    IAgentEventMetrics
} from '../../../types/agent/agentEventTypes';
import type { IAgentPerformanceMetrics } from '../../../types/agent/agentMetricTypes';

export class AgentEventHandler extends CoreManager implements IAgentEventHandler, IBaseManager {
    protected static _instance: AgentEventHandler;
    private readonly stateManager: AgentStateManager;
    protected override readonly eventEmitter: BaseEventEmitter;
    public readonly category: MANAGER_CATEGORY_enum = MANAGER_CATEGORY_enum.SERVICE;

    protected constructor() {
        super();
        this.stateManager = AgentStateManager.getInstance();
        this.eventEmitter = AgentEventEmitter.getInstance() as unknown as BaseEventEmitter;
        this.registerDomainManager('AgentEventHandler', this);
    }

    public static override getInstance(): AgentEventHandler {
        if (!AgentEventHandler._instance) {
            AgentEventHandler._instance = new AgentEventHandler();
        }
        return AgentEventHandler._instance;
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

    public async initialize(): Promise<void> {
        await this.safeExecute(async () => {
            this.logInfo('Initializing AgentEventHandler');
        }, 'initialize');
    }

    public async validate(_params: unknown): Promise<boolean> {
        return true;
    }

    private createErrorHistory(
        existingHistory: { readonly timestamp: Date; readonly error: Error; readonly context?: Record<string, unknown> }[] | undefined,
        newError: Error,
        context: Record<string, unknown>
    ): { readonly timestamp: Date; readonly error: Error; readonly context?: Record<string, unknown> }[] {
        return [
            ...(existingHistory || []),
            {
                timestamp: new Date(),
                error: newError,
                context
            }
        ];
    }

    public createBaseError(
        message: string, 
        type: keyof typeof ERROR_KINDS = 'StateError'
    ): IAgentError {
        const baseError = new Error(message);
        const timestamp = Date.now();
        const errorContext = {
            component: this.constructor.name,
            timestamp
        } as const;

        return {
            name: type,
            message: baseError.message,
            stack: baseError.stack,
            type: ERROR_KINDS[type],
            errorCount: 1,
            errorHistory: [{
                timestamp: new Date(),
                error: baseError,
                context: errorContext
            }],
            context: errorContext
        } satisfies IAgentError;
    }

    public createErrorMetrics(error: Error | IBaseError, type: keyof typeof ERROR_KINDS): IErrorMetrics {
        return {
            count: 1,
            type,
            severity: ERROR_SEVERITY_enum.ERROR,
            timestamp: Date.now(),
            message: error.message
        };
    }

    protected override createAgentEventMetrics(): IAgentEventMetrics {
        const now = Date.now();
        return {
            timestamp: now,
            component: this.constructor.name,
            category: 'agent',
            version: '1.0.0',
            errors: {
                count: 0,
                type: ERROR_KINDS.SystemError,
                severity: ERROR_SEVERITY_enum.ERROR,
                timestamp: now,
                message: ''
            },
            warnings: [],
            info: [],
            resources: {
                timestamp: now,
                component: this.constructor.name,
                category: 'resources',
                version: '1.0.0',
                usage: 0,
                limit: 100,
                available: 100,
                cognitive: {
                    timestamp: now,
                    component: this.constructor.name,
                    category: 'cognitive',
                    version: '1.0.0',
                    usage: 0,
                    limit: 100,
                    available: 100,
                    memoryAllocation: 0,
                    cognitiveLoad: 0,
                    processingCapacity: 1,
                    contextUtilization: 0
                },
                cpuUsage: 0,
                memoryUsage: 0,
                diskIO: { read: 0, write: 0 },
                networkUsage: { upload: 0, download: 0 }
            },
            performance: {
                timestamp: now,
                component: this.constructor.name,
                category: 'performance',
                version: '1.0.0',
                duration: 0,
                success: true,
                errorCount: 0,
                thinking: {
                    timestamp: now,
                    component: this.constructor.name,
                    category: 'thinking',
                    version: '1.0.0',
                    duration: 0,
                    success: true,
                    errorCount: 0,
                    reasoningTime: { total: 0, average: 0, min: 0, max: 0 },
                    planningTime: { total: 0, average: 0, min: 0, max: 0 },
                    learningTime: { total: 0, average: 0, min: 0, max: 0 },
                    decisionConfidence: 1,
                    learningEfficiency: 1
                },
                taskSuccessRate: 1,
                goalAchievementRate: 1,
                responseTime: { total: 0, average: 0, min: 0, max: 0 },
                throughput: {
                    requestsPerSecond: 0,
                    bytesPerSecond: 0,
                    operationsPerSecond: 0,
                    dataProcessedPerSecond: 0
                }
            },
            usage: {
                totalRequests: 0,
                activeUsers: 0,
                requestsPerSecond: 0,
                averageResponseSize: 0,
                peakMemoryUsage: 0,
                uptime: 0,
                rateLimit: {
                    current: 0,
                    limit: 100,
                    remaining: 100,
                    resetTime: now + 3600000
                },
                timestamp: now,
                component: this.constructor.name,
                category: 'usage',
                version: '1.0.0',
                state: {
                    timestamp: now,
                    component: this.constructor.name,
                    category: 'state',
                    version: '1.0.0',
                    currentState: 'initial',
                    stateTime: 0,
                    transitionCount: 0,
                    failedTransitions: 0,
                    blockedTaskCount: 0,
                    historyEntryCount: 0,
                    lastHistoryUpdate: now,
                    taskStats: {
                        completedCount: 0,
                        failedCount: 0,
                        averageDuration: 0,
                        successRate: 1,
                        averageIterations: 0
                    }
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
                }
            },
            iterations: 0,
            executionTime: 0,
            llmMetrics: {},
            thinkingMetrics: {
                reasoningTime: 0,
                planningTime: 0,
                learningTime: 0,
                decisionConfidence: 0,
                learningEfficiency: 0,
                startTime: now
            }
        };
    }

    // ─── IAgentEventHandler Implementation ─────────────────────────────────────

    public async handleEvent(event: AgentEvent): Promise<void> {
        await this.safeExecute(async () => {
            if (!await this.validateEvent(event)) {
                throw this.createBaseError(`Invalid event: ${event.type}`);
            }

            switch (event.type) {
                case AGENT_EVENT_TYPE.AGENT_CREATED:
                    await this.onAgentCreated(event as IAgentCreatedEvent);
                    break;
                case AGENT_EVENT_TYPE.AGENT_UPDATED:
                    await this.onAgentUpdated(event as IAgentUpdatedEvent);
                    break;
                case AGENT_EVENT_TYPE.AGENT_DELETED:
                    await this.onAgentDeleted(event as IAgentDeletedEvent);
                    break;
                case AGENT_EVENT_TYPE.AGENT_STATUS_CHANGED:
                    await this.onAgentStatusChanged(event as IAgentStatusChangeEvent);
                    break;
                case AGENT_EVENT_TYPE.AGENT_ITERATION_STARTED:
                    await this.onAgentIterationStarted(event as IAgentIterationStartedEvent);
                    break;
                case AGENT_EVENT_TYPE.AGENT_ITERATION_COMPLETED:
                    await this.onAgentIterationCompleted(event as IAgentIterationCompletedEvent);
                    break;
                case AGENT_EVENT_TYPE.AGENT_ITERATION_FAILED:
                    await this.onAgentIterationFailed(event as IAgentIterationFailedEvent);
                    break;
                case AGENT_EVENT_TYPE.AGENT_METRICS_UPDATED:
                    await this.onAgentMetricsUpdated(event as IAgentMetricsUpdatedEvent);
                    break;
                case AGENT_EVENT_TYPE.AGENT_CONFIG_UPDATED:
                    await this.onAgentConfigUpdated(event as IAgentConfigUpdatedEvent);
                    break;
                case AGENT_EVENT_TYPE.AGENT_ERROR:
                    await this.onAgentError(event as IAgentErrorEvent);
                    break;
                case AGENT_EVENT_TYPE.AGENT_EXECUTION:
                    await this.onAgentExecution(event as IAgentExecutionEvent);
                    break;
                case AGENT_EVENT_TYPE.AGENT_VALIDATION:
                    await this.onAgentValidation(event as IAgentValidationEvent);
                    break;
                default: {
                    const eventType = (event as { type: string }).type;
                    throw this.createBaseError(`Unhandled event type: ${eventType}`);
                }
            }
        }, 'handleEvent');
    }

    public async validateEvent(event: AgentEvent): Promise<boolean> {
        if (!event.agentId || !event.type) {
            return false;
        }

        const agent = this.stateManager.getAgent(event.agentId);
        if (!agent) {
            return false;
        }

        return true;
    }

    // ─── Event Handler Methods ─────────────────────────────────────────────────

    private async onAgentCreated(event: IAgentCreatedEvent): Promise<void> {
        await this.safeExecute(async () => {
            this.logInfo('Agent created', { agentId: event.agentId });
            await this.stateManager.addAgent(event.agentType);

            const now = new Date();
            const executionState: IAgentExecutionState = {
                currentStep: 0,
                totalSteps: 0,
                startTime: now,
                lastUpdate: now,
                status: AGENT_STATUS_enum.INITIAL
            };

            const baseMetrics = this.createAgentEventMetrics();
            await this.stateManager.updateAgent(event.agentId, {
                ...event.agentType,
                executionState,
                metrics: baseMetrics
            });
        }, 'onAgentCreated');
    }

    private async onAgentUpdated(event: IAgentUpdatedEvent): Promise<void> {
        await this.safeExecute(async () => {
            this.logInfo('Agent updated', { agentId: event.agentId });
            const agent = this.stateManager.getAgent(event.agentId);
            if (!agent) {
                throw this.createBaseError(`Agent not found: ${event.agentId}`);
            }

            const updatedState: IAgentExecutionState = {
                ...agent.executionState,
                ...event.newState,
                currentStep: agent.executionState.currentStep,
                totalSteps: agent.executionState.totalSteps,
                startTime: agent.executionState.startTime,
                status: agent.executionState.status,
                lastUpdate: new Date()
            };

            const currentMetrics: IAgentEventMetrics = agent.metrics as IAgentEventMetrics || this.createAgentEventMetrics();
            const updatedMetrics: IAgentEventMetrics = {
                ...currentMetrics,
                timestamp: Date.now(),
                component: this.constructor.name,
                category: 'agent',
                version: '1.0.0'
            };

            await this.stateManager.updateAgent(event.agentId, {
                ...agent,
                executionState: updatedState,
                metrics: updatedMetrics
            });
        }, 'onAgentUpdated');
    }

    private async onAgentDeleted(event: IAgentDeletedEvent): Promise<void> {
        await this.safeExecute(async () => {
            this.logInfo('Agent deleted', { agentId: event.agentId });
            await this.stateManager.removeAgent(event.agentId);
        }, 'onAgentDeleted');
    }

    private async onAgentStatusChanged(event: IAgentStatusChangeEvent): Promise<void> {
        await this.safeExecute(async () => {
            this.logInfo(`Status changed: ${event.previousStatus} -> ${event.newStatus}`, { agentId: event.agentId });
            const agent = this.stateManager.getAgent(event.agentId);
            if (!agent) {
                throw this.createBaseError(`Agent not found: ${event.agentId}`);
            }

            const updatedState: IAgentExecutionState = {
                ...agent.executionState,
                currentStep: agent.executionState.currentStep,
                totalSteps: agent.executionState.totalSteps,
                startTime: agent.executionState.startTime,
                status: event.newStatus,
                lastUpdate: new Date()
            };

            const currentMetrics: IAgentEventMetrics = agent.metrics as IAgentEventMetrics || this.createAgentEventMetrics();
            const updatedMetrics: IAgentEventMetrics = {
                ...currentMetrics,
                timestamp: Date.now(),
                component: this.constructor.name,
                category: 'agent',
                version: '1.0.0'
            };

            await this.stateManager.updateAgent(event.agentId, {
                ...agent,
                executionState: updatedState,
                metrics: updatedMetrics
            });
        }, 'onAgentStatusChanged');
    }

    private async onAgentIterationStarted(event: IAgentIterationStartedEvent): Promise<void> {
        await this.safeExecute(async () => {
            this.logInfo(`Iteration started: ${event.iterationId}`, { agentId: event.agentId });
            const agent = this.stateManager.getAgent(event.agentId);
            if (!agent) {
                throw this.createBaseError(`Agent not found: ${event.agentId}`);
            }

            const updatedState: IAgentExecutionState = {
                ...agent.executionState,
                currentStep: agent.executionState.currentStep + 1,
                totalSteps: agent.executionState.totalSteps,
                startTime: agent.executionState.startTime,
                status: agent.executionState.status,
                lastUpdate: new Date()
            };

            const currentMetrics: IAgentEventMetrics = agent.metrics as IAgentEventMetrics || this.createAgentEventMetrics();
            const updatedMetrics: IAgentEventMetrics = {
                ...currentMetrics,
                timestamp: Date.now(),
                component: this.constructor.name,
                category: 'agent',
                version: '1.0.0'
            };

            await this.stateManager.updateAgent(event.agentId, {
                ...agent,
                executionState: updatedState,
                metrics: updatedMetrics
            });
        }, 'onAgentIterationStarted');
    }

    private async onAgentIterationCompleted(event: IAgentIterationCompletedEvent): Promise<void> {
        await this.safeExecute(async () => {
            this.logInfo(`Iteration completed: ${event.iterationId}`, { agentId: event.agentId });
            const agent = this.stateManager.getAgent(event.agentId);
            if (!agent) {
                throw this.createBaseError(`Agent not found: ${event.agentId}`);
            }

            const updatedState: IAgentExecutionState = {
                ...agent.executionState,
                currentStep: agent.executionState.currentStep,
                totalSteps: agent.executionState.totalSteps,
                startTime: agent.executionState.startTime,
                status: agent.executionState.status,
                lastUpdate: new Date()
            };

            const currentMetrics: IAgentEventMetrics = agent.metrics as IAgentEventMetrics || this.createAgentEventMetrics();
            const updatedMetrics: IAgentEventMetrics = {
                ...currentMetrics,
                performance: {
                    ...currentMetrics.performance as IAgentPerformanceMetrics,
                    success: true,
                    timestamp: Date.now(),
                    component: this.constructor.name,
                    category: 'performance',
                    version: '1.0.0'
                } as IAgentPerformanceMetrics,
                timestamp: Date.now(),
                component: this.constructor.name,
                category: 'agent',
                version: '1.0.0'
            };

            await this.stateManager.updateAgent(event.agentId, {
                ...agent,
                executionState: updatedState,
                metrics: updatedMetrics
            });
        }, 'onAgentIterationCompleted');
    }

    private async onAgentIterationFailed(event: IAgentIterationFailedEvent): Promise<void> {
        await this.safeExecute(async () => {
            this.logError(`Iteration failed: ${event.iterationId}`, event.error);
            const agent = this.stateManager.getAgent(event.agentId);
            if (!agent) {
                throw this.createBaseError(`Agent not found: ${event.agentId}`);
            }

            const errorMetric = this.createErrorMetrics(event.error, 'ExecutionError');

            const updatedState: IAgentExecutionState = {
                ...agent.executionState,
                error: {
                    name: 'ExecutionError',
                    message: event.error.message,
                    stack: event.error.stack,
                    type: ERROR_KINDS.ExecutionError,
                    errorCount: (agent.executionState.error?.errorCount || 0) + 1,
                    errorHistory: this.createErrorHistory(
                        agent.executionState.error?.errorHistory,
                        event.error,
                        {
                            component: this.constructor.name,
                            timestamp: Date.now(),
                            iterationId: event.iterationId
                        }
                    ),
                    context: {
                        component: this.constructor.name,
                        timestamp: Date.now(),
                        iterationId: event.iterationId
                    }
                } satisfies IAgentError,
                lastUpdate: new Date()
            };

            const currentMetrics: IAgentEventMetrics = agent.metrics as IAgentEventMetrics || this.createAgentEventMetrics();
            const updatedMetrics: IAgentEventMetrics = {
                ...currentMetrics,
                errors: errorMetric,
                warnings: [...(currentMetrics.warnings || [])],
                info: [...(currentMetrics.info || [])],
                resources: currentMetrics.resources,
                performance: {
                    ...currentMetrics.performance as IAgentPerformanceMetrics,
                    success: false,
                    errorCount: ((currentMetrics.performance as IAgentPerformanceMetrics).errorCount || 0) + 1,
                    timestamp: Date.now(),
                    component: this.constructor.name,
                    category: 'performance',
                    version: '1.0.0'
                } as IAgentPerformanceMetrics,
                usage: currentMetrics.usage,
                timestamp: Date.now(),
                component: this.constructor.name,
                category: 'agent',
                version: '1.0.0'
            };

            await this.stateManager.updateAgent(event.agentId, {
                ...agent,
                executionState: updatedState,
                metrics: updatedMetrics
            });
        }, 'onAgentIterationFailed');
    }

    private async onAgentMetricsUpdated(event: IAgentMetricsUpdatedEvent): Promise<void> {
        await this.safeExecute(async () => {
            this.logInfo('Metrics updated', { agentId: event.agentId });
            const agent = this.stateManager.getAgent(event.agentId);
            if (!agent) {
                throw this.createBaseError(`Agent not found: ${event.agentId}`);
            }

            const updatedState: IAgentExecutionState = {
                ...agent.executionState,
                currentStep: agent.executionState.currentStep,
                totalSteps: agent.executionState.totalSteps,
                startTime: agent.executionState.startTime,
                status: agent.executionState.status,
                lastUpdate: new Date()
            };

            const currentMetrics: IAgentEventMetrics = agent.metrics as IAgentEventMetrics || this.createAgentEventMetrics();
            const updatedMetrics: IAgentEventMetrics = {
                ...currentMetrics,
                ...event.newMetrics,
                errors: currentMetrics.errors,
                warnings: [...(currentMetrics.warnings || [])],
                info: [...(currentMetrics.info || [])],
                resources: currentMetrics.resources,
                performance: currentMetrics.performance,
                usage: currentMetrics.usage,
                timestamp: Date.now(),
                component: this.constructor.name,
                category: 'agent',
                version: '1.0.0'
            };

            await this.stateManager.updateAgent(event.agentId, {
                ...agent,
                executionState: updatedState,
                metrics: updatedMetrics
            });
        }, 'onAgentMetricsUpdated');
    }

    private async onAgentConfigUpdated(event: IAgentConfigUpdatedEvent): Promise<void> {
        await this.safeExecute(async () => {
            this.logInfo('Config updated', { agentId: event.agentId });
            const agent = this.stateManager.getAgent(event.agentId);
            if (!agent) {
                throw this.createBaseError(`Agent not found: ${event.agentId}`);
            }

            const updatedState: IAgentExecutionState = {
                ...agent.executionState,
                currentStep: agent.executionState.currentStep,
                totalSteps: agent.executionState.totalSteps,
                startTime: agent.executionState.startTime,
                status: agent.executionState.status,
                lastUpdate: new Date()
            };

            const currentMetrics: IAgentEventMetrics = agent.metrics as IAgentEventMetrics || this.createAgentEventMetrics();
            const updatedMetrics: IAgentEventMetrics = {
                ...currentMetrics,
                timestamp: Date.now(),
                component: this.constructor.name,
                category: 'agent',
                version: '1.0.0'
            };

            await this.stateManager.updateAgent(event.agentId, {
                ...agent,
                executionState: updatedState,
                metrics: updatedMetrics,
                ...event.changes
            });
        }, 'onAgentConfigUpdated');
    }

    private async onAgentError(event: IAgentErrorEvent): Promise<void> {
        await this.safeExecute(async () => {
            this.logError(`Error occurred: ${event.error.message}`, event.error);
            const agent = this.stateManager.getAgent(event.agentId);
            if (!agent) {
                throw this.createBaseError(`Agent not found: ${event.agentId}`);
            }

            const errorMetric = this.createErrorMetrics(event.error, 'ExecutionError');
            const updatedState: IAgentExecutionState = {
                ...agent.executionState,
                currentStep: agent.executionState.currentStep,
                totalSteps: agent.executionState.totalSteps,
                startTime: agent.executionState.startTime,
                status: agent.executionState.status,
                error: {
                    name: 'ExecutionError',
                    message: event.error.message,
                    stack: event.error.stack,
                    type: ERROR_KINDS.ExecutionError,
                    errorCount: (agent.executionState.error?.errorCount || 0) + 1,
                    errorHistory: this.createErrorHistory(
                        agent.executionState.error?.errorHistory,
                        event.error,
                        {
                            component: this.constructor.name,
                            timestamp: Date.now(),
                            operation: event.operation
                        }
                    ),
                    context: {
                        component: this.constructor.name,
                        timestamp: Date.now(),
                        operation: event.operation
                    }
                } satisfies IAgentError,
                lastUpdate: new Date()
            };

            const currentMetrics: IAgentEventMetrics = agent.metrics as IAgentEventMetrics || this.createAgentEventMetrics();
            const updatedMetrics: IAgentEventMetrics = {
                ...currentMetrics,
                errors: errorMetric,
                warnings: [...(currentMetrics.warnings || [])],
                info: [...(currentMetrics.info || [])],
                resources: currentMetrics.resources,
                performance: {
                    ...currentMetrics.performance as IAgentPerformanceMetrics,
                    success: false,
                    errorCount: ((currentMetrics.performance as IAgentPerformanceMetrics).errorCount || 0) + 1,
                    timestamp: Date.now(),
                    component: this.constructor.name,
                    category: 'performance',
                    version: '1.0.0'
                } as IAgentPerformanceMetrics,
                usage: currentMetrics.usage,
                timestamp: Date.now(),
                component: this.constructor.name,
                category: 'agent',
                version: '1.0.0'
            };

            await this.stateManager.updateAgent(event.agentId, {
                ...agent,
                executionState: updatedState,
                metrics: updatedMetrics
            });
        }, 'onAgentError');
    }

    private async onAgentExecution(event: IAgentExecutionEvent): Promise<void> {
        await this.safeExecute(async () => {
            this.logInfo(`Execution ${event.success ? 'completed' : 'failed'}: ${event.operation}`, { agentId: event.agentId });
            const agent = this.stateManager.getAgent(event.agentId);
            if (!agent) {
                throw this.createBaseError(`Agent not found: ${event.agentId}`);
            }

            const updatedState: IAgentExecutionState = {
                ...agent.executionState,
                currentStep: agent.executionState.currentStep,
                totalSteps: agent.executionState.totalSteps,
                startTime: agent.executionState.startTime,
                status: agent.executionState.status,
                lastUpdate: new Date()
            };

            const currentMetrics: IAgentEventMetrics = agent.metrics as IAgentEventMetrics || this.createAgentEventMetrics();
            const updatedMetrics: IAgentEventMetrics = {
                ...currentMetrics,
                performance: {
                    ...currentMetrics.performance as IAgentPerformanceMetrics,
                    success: event.success,
                    duration: event.duration,
                    timestamp: Date.now(),
                    component: this.constructor.name,
                    category: 'performance',
                    version: '1.0.0'
                } as IAgentPerformanceMetrics,
                timestamp: Date.now(),
                component: this.constructor.name,
                category: 'agent',
                version: '1.0.0'
            };

            await this.stateManager.updateAgent(event.agentId, {
                ...agent,
                executionState: updatedState,
                metrics: updatedMetrics
            });
        }, 'onAgentExecution');
    }

    private async onAgentValidation(event: IAgentValidationEvent): Promise<void> {
        await this.safeExecute(async () => {
            this.logInfo(`Validation ${event.isValid ? 'passed' : 'failed'}`, { agentId: event.agentId });
            const agent = this.stateManager.getAgent(event.agentId);
            if (!agent) {
                throw this.createBaseError(`Agent not found: ${event.agentId}`);
            }

            const updatedState: IAgentExecutionState = {
                ...agent.executionState,
                currentStep: agent.executionState.currentStep,
                totalSteps: agent.executionState.totalSteps,
                startTime: agent.executionState.startTime,
                status: agent.executionState.status,
                lastUpdate: new Date()
            };

            const currentMetrics: IAgentEventMetrics = agent.metrics as IAgentEventMetrics || this.createAgentEventMetrics();
            const updatedMetrics: IAgentEventMetrics = {
                ...currentMetrics,
                warnings: [...(currentMetrics.warnings || []), ...event.warnings],
                info: [...(currentMetrics.info || [])],
                performance: {
                    ...currentMetrics.performance as IAgentPerformanceMetrics,
                    success: event.isValid,
                    timestamp: Date.now(),
                    component: this.constructor.name,
                    category: 'performance',
                    version: '1.0.0'
                } as IAgentPerformanceMetrics,
                timestamp: Date.now(),
                component: this.constructor.name,
                category: 'agent',
                version: '1.0.0'
            };

            const updatedMetricsWithValidation: IAgentEventMetrics = {
                ...updatedMetrics,
                info: [
                    ...updatedMetrics.info,
                    event.validationResult ? JSON.stringify(event.validationResult) : ''
                ]
            };

            await this.stateManager.updateAgent(event.agentId, {
                ...agent,
                executionState: updatedState,
                metrics: updatedMetricsWithValidation
            });
        }, 'onAgentValidation');
    }
}

export default AgentEventHandler.getInstance();
