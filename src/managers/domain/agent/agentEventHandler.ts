/**
 * @file agentEventHandler.ts
 * @path src/managers/domain/agent/agentEventHandler.ts
 * @description Agent event handler implementation
 */

// Core imports
import { CoreManager } from '../../core/coreManager';

// Internal domain managers
import { AgentStateManager } from './agentStateManager';
import { AgentEventEmitter } from './agentEventEmitter';

// Common imports
import { createError, ERROR_KINDS } from '../../../types/common/errorTypes';
import { MANAGER_CATEGORY_enum } from '../../../types/common/enumTypes';

// Agent domain imports
import { AGENT_EVENT_TYPE } from '../../../types/agent/agentEventTypes';
import { STATE_CATEGORY } from '../../../types/agent/agentStateTypes';

// Type imports from common domain
import type { IBaseError } from '../../../types/common/errorTypes';

// Type imports from agent domain
import type { IBaseManager, IBaseManagerMetadata } from '../../../types/agent/agentManagerTypes';
import type { 
    IAgentEventHandler,
    IAgentCreatedEvent,
    IAgentUpdatedEvent,
    IAgentDeletedEvent,
    IAgentStatusChangedEvent,
    IAgentIterationStartedEvent,
    IAgentIterationCompletedEvent,
    IAgentIterationFailedEvent,
    IAgentMetricsUpdatedEvent,
    IAgentConfigUpdatedEvent,
    IAgentValidationCompletedEvent,
    IAgentErrorOccurredEvent,
    IAgentErrorHandledEvent,
    IAgentErrorRecoveryStartedEvent,
    IAgentErrorRecoveryCompletedEvent,
    IAgentErrorRecoveryFailedEvent
} from '../../../types/agent/agentEventTypes';
import type { IStateHistoryEntry } from '../../../types/agent/agentStateTypes';
import type { IAgentExecutionErrorContext } from '../../../types/agent/agentExecutionTypes';

export class AgentEventHandler extends CoreManager implements IAgentEventHandler, IBaseManager {
    protected static _instance: AgentEventHandler;
    private readonly stateManager: AgentStateManager;
    protected override readonly eventEmitter: AgentEventEmitter;
    public readonly category: MANAGER_CATEGORY_enum = MANAGER_CATEGORY_enum.SERVICE;

    protected constructor() {
        super();
        this.stateManager = AgentStateManager.getInstance();
        this.eventEmitter = AgentEventEmitter.getInstance();
        this.registerDomainManager('AgentEventHandler', this);
    }

    private createBaseError(message: string, type: keyof typeof ERROR_KINDS = 'StateError'): IBaseError {
        return createError({
            message,
            type: ERROR_KINDS[type],
            context: {
                component: this.constructor.name,
                timestamp: Date.now()
            }
        });
    }

    private convertToBaseError(error: Error | IBaseError): IBaseError {
        if ('type' in error) {
            return error as IBaseError;
        }
        return this.createBaseError(error.message, 'ExecutionError');
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
                status: ''
            },
            timestamp: Date.now(),
            component: this.constructor.name
        };
    }

    public async initialize(): Promise<void> {
        await this.safeExecute(async () => {
            this.logInfo('Initializing AgentEventHandler');
            // Additional initialization if needed
        }, 'initialize');
    }

    public async validate(params: unknown): Promise<boolean> {
        return true;
    }

    // ─── Event Handler Methods ─────────────────────────────────────────────────

    public async onAgentCreated(event: IAgentCreatedEvent): Promise<void> {
        await this.safeExecute(async () => {
            this.logInfo('Agent created', { agentId: event.agentId });
            await this.stateManager.addAgent(event.agentType);

            const historyEntry: IStateHistoryEntry = {
                timestamp: new Date(),
                action: 'AGENT_CREATED',
                category: STATE_CATEGORY.CORE,
                details: {
                    agentId: event.agentId,
                    agentType: event.agentType.name
                }
            };

            const executionState = {
                // Initialize executionState with default values or as per your logic
                core: {
                    status: event.agentType.status || 'INITIAL',
                    thinking: false,
                    busy: false
                },
                timing: {
                    startTime: new Date(),
                    lastActiveTime: new Date(),
                    timeouts: {
                        thinking: 30000,
                        execution: 300000,
                        idle: 60000
                    }
                },
                error: {
                    errorCount: 0,
                    retryCount: 0,
                    maxRetries: 3,
                    errorHistory: []
                },
                assignment: {
                    assignedTasks: [],
                    completedTasks: [],
                    failedTasks: [],
                    blockedTasks: [],
                    iterations: 0,
                    maxIterations: 10,
                    taskCapacity: 5
                },
                stateMetrics: {
                    currentState: 'active',
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
                        successRate: 1,
                        averageIterations: 0
                    },
                    timestamp: Date.now(),
                    component: 'AgentMetricsManager',
                    category: 'metrics',
                    version: '1.0.0'
                },
                llmMetrics: {
                    resources: {
                        cpuUsage: 0,
                        memoryUsage: 0,
                        diskIO: { read: 0, write: 0 },
                        networkUsage: { upload: 0, download: 0 },
                        gpuMemoryUsage: 0,
                        modelMemoryAllocation: {
                            weights: 0,
                            cache: 0,
                            workspace: 0
                        },
                        timestamp: Date.now()
                    },
                    performance: {
                        executionTime: { total: 0, average: 0, min: 0, max: 0 },
                        latency: { total: 0, average: 0, min: 0, max: 0 },
                        throughput: { operationsPerSecond: 0, dataProcessedPerSecond: 0 },
                        responseTime: { total: 0, average: 0, min: 0, max: 0 },
                        queueLength: 0,
                        errorRate: 0,
                        successRate: 1,
                        errorMetrics: { totalErrors: 0, errorRate: 0 },
                        resourceUtilization: {
                            cpuUsage: 0,
                            memoryUsage: 0,
                            diskIO: { read: 0, write: 0 },
                            networkUsage: { upload: 0, download: 0 },
                            gpuMemoryUsage: 0,
                            modelMemoryAllocation: {
                                weights: 0,
                                cache: 0,
                                workspace: 0
                            },
                            timestamp: Date.now()
                        },
                        tokensPerSecond: 0,
                        coherenceScore: 1,
                        temperatureImpact: 0,
                        timestamp: Date.now()
                    },
                    usage: {
                        totalRequests: 0,
                        activeInstances: 0,
                        activeUsers: 0,
                        requestsPerSecond: 0,
                        averageResponseLength: 0,
                        averageResponseSize: 0,
                        peakMemoryUsage: 0,
                        uptime: 0,
                        rateLimit: {
                            current: 0,
                            limit: 100,
                            remaining: 100,
                            resetTime: Date.now() + 3600000
                        },
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
                        timestamp: Date.now()
                    },
                    timestamp: Date.now()
                },
                history: [historyEntry],
                transitions: []
            };

            await this.stateManager.updateAgent(event.agentId, {
                ...event.agentType,
                executionState
            });
        }, 'onAgentCreated');
    }

    public async onAgentUpdated(event: IAgentUpdatedEvent): Promise<void> {
        await this.safeExecute(async () => {
            this.logInfo('Agent updated', { agentId: event.agentId });
            await this.stateManager.updateAgent(event.agentId, event.newState);
        }, 'onAgentUpdated');
    }

    public async onAgentDeleted(event: IAgentDeletedEvent): Promise<void> {
        await this.safeExecute(async () => {
            this.logInfo('Agent deleted', { agentId: event.agentId });
            await this.stateManager.removeAgent(event.agentId);
        }, 'onAgentDeleted');
    }

    public async onAgentStatusChanged(event: IAgentStatusChangedEvent): Promise<void> {
        await this.safeExecute(async () => {
            this.logInfo(`Status changed: ${event.previousStatus} -> ${event.newStatus}`, { agentId: event.agentId });
            const agent = this.stateManager.getAgent(event.agentId);
            if (!agent) {
                throw this.createBaseError(`Agent not found: ${event.agentId}`);
            }

            if (agent.executionState) {
                const historyEntry: IStateHistoryEntry = {
                    timestamp: new Date(),
                    action: 'STATUS_CHANGED',
                    category: STATE_CATEGORY.CORE,
                    details: {
                        previousStatus: event.previousStatus,
                        newStatus: event.newStatus,
                        reason: event.reason
                    }
                };
                agent.executionState.history.push(historyEntry);
                agent.executionState.core.status = event.newStatus;
            }

            await this.stateManager.updateAgent(event.agentId, agent);
        }, 'onAgentStatusChanged');
    }

    public async onAgentIterationStarted(event: IAgentIterationStartedEvent): Promise<void> {
        await this.safeExecute(async () => {
            this.logInfo(`Iteration started: ${event.iterationId}`, { agentId: event.agentId });
            const agent = this.stateManager.getAgent(event.agentId);
            if (!agent) {
                throw this.createBaseError(`Agent not found: ${event.agentId}`);
            }

            if (agent.executionState) {
                agent.executionState.assignment.iterations++;
                agent.executionState.timing.lastActiveTime = new Date();
                agent.executionState.core.thinking = true;

                const historyEntry: IStateHistoryEntry = {
                    timestamp: new Date(),
                    action: 'ITERATION_STARTED',
                    category: STATE_CATEGORY.CORE,
                    details: {
                        iterationId: event.iterationId,
                        iterationCount: agent.executionState.assignment.iterations
                    }
                };
                agent.executionState.history.push(historyEntry);

                await this.stateManager.updateAgent(event.agentId, agent);
            }
        }, 'onAgentIterationStarted');
    }

    public async onAgentIterationCompleted(event: IAgentIterationCompletedEvent): Promise<void> {
        await this.safeExecute(async () => {
            this.logInfo(`Iteration completed: ${event.iterationId}`, { agentId: event.agentId });
            const agent = this.stateManager.getAgent(event.agentId);
            if (!agent) {
                throw this.createBaseError(`Agent not found: ${event.agentId}`);
            }

            if (agent.executionState) {
                agent.executionState.timing.lastActiveTime = new Date();
                agent.executionState.core.thinking = false;

                const historyEntry: IStateHistoryEntry = {
                    timestamp: new Date(),
                    action: 'ITERATION_COMPLETED',
                    category: STATE_CATEGORY.CORE,
                    details: {
                        iterationId: event.iterationId,
                        result: event.result
                    }
                };
                agent.executionState.history.push(historyEntry);

                await this.stateManager.updateAgent(event.agentId, agent);
            }
        }, 'onAgentIterationCompleted');
    }

    public async onAgentIterationFailed(event: IAgentIterationFailedEvent): Promise<void> {
        await this.safeExecute(async () => {
            this.logError(`Iteration failed: ${event.iterationId}`, event.error);
            const agent = this.stateManager.getAgent(event.agentId);
            if (!agent) {
                throw this.createBaseError(`Agent not found: ${event.agentId}`);
            }

            if (agent.executionState) {
                agent.executionState.timing.lastActiveTime = new Date();
                agent.executionState.core.thinking = false;
                agent.executionState.error.errorCount++;
                agent.executionState.error.lastError = this.convertToBaseError(event.error);

                const historyEntry: IStateHistoryEntry = {
                    timestamp: new Date(),
                    action: 'ITERATION_FAILED',
                    category: STATE_CATEGORY.ERROR,
                    details: {
                        iterationId: event.iterationId,
                        error: event.error.message
                    }
                };
                agent.executionState.history.push(historyEntry);

                await this.stateManager.updateAgent(event.agentId, agent);

                const errorContext: IAgentExecutionErrorContext = {
                    operation: 'iteration',
                    state: agent
                };

                await this.eventEmitter.emitAgentErrorOccurred({
                    agentId: event.agentId,
                    error: this.createBaseError(event.error.message, 'ExecutionError'),
                    context: errorContext
                });
            }
        }, 'onAgentIterationFailed');
    }

    public async onAgentMetricsUpdated(event: IAgentMetricsUpdatedEvent): Promise<void> {
        await this.safeExecute(async () => {
            this.logInfo('Metrics updated', { agentId: event.agentId });
            const agent = this.stateManager.getAgent(event.agentId);
            if (!agent) {
                throw this.createBaseError(`Agent not found: ${event.agentId}`);
            }

            if (agent.executionState) {
                const now = Date.now();
                const newMetrics = {
                    resources: {
                        cpuUsage: event.newMetrics.resources.cpuUsage,
                        memoryUsage: event.newMetrics.resources.memoryUsage,
                        diskIO: event.newMetrics.resources.diskIO,
                        networkUsage: event.newMetrics.resources.networkUsage,
                        gpuMemoryUsage: 0,
                        modelMemoryAllocation: {
                            weights: 0,
                            cache: 0,
                            workspace: 0
                        },
                        timestamp: now
                    },
                    performance: {
                        ...event.newMetrics.performance,
                        resourceUtilization: {
                            cpuUsage: event.newMetrics.resources.cpuUsage,
                            memoryUsage: event.newMetrics.resources.memoryUsage,
                            diskIO: event.newMetrics.resources.diskIO,
                            networkUsage: event.newMetrics.resources.networkUsage,
                            gpuMemoryUsage: 0,
                            modelMemoryAllocation: {
                                weights: 0,
                                cache: 0,
                                workspace: 0
                            },
                            timestamp: now
                        },
                        tokensPerSecond: 0,
                        coherenceScore: 1,
                        temperatureImpact: 0,
                        timestamp: now
                    },
                    usage: {
                        totalRequests: event.newMetrics.usage.totalRequests,
                        requestsPerSecond: event.newMetrics.usage.requestsPerSecond,
                        peakMemoryUsage: event.newMetrics.usage.peakMemoryUsage,
                        uptime: event.newMetrics.usage.uptime,
                        rateLimit: event.newMetrics.usage.rateLimit,
                        activeInstances: 0,
                        activeUsers: 0,
                        averageResponseLength: 0,
                        averageResponseSize: 0,
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
                        timestamp: now
                    },
                    timestamp: now
                };

                // Use Object.assign to update read-only property
                Object.assign(agent.executionState.llmMetrics, newMetrics);

                const historyEntry: IStateHistoryEntry = {
                    timestamp: new Date(),
                    action: 'METRICS_UPDATED',
                    category: STATE_CATEGORY.METRICS,
                    details: {
                        metrics: agent.executionState.llmMetrics
                    }
                };
                agent.executionState.history.push(historyEntry);

                await this.stateManager.updateAgent(event.agentId, agent);
            }
        }, 'onAgentMetricsUpdated');
    }

    public async onAgentConfigUpdated(event: IAgentConfigUpdatedEvent): Promise<void> {
        await this.safeExecute(async () => {
            this.logInfo('Config updated', { agentId: event.agentId });
            const agent = this.stateManager.getAgent(event.agentId);
            if (!agent) {
                throw this.createBaseError(`Agent not found: ${event.agentId}`);
            }

            if (agent.executionState) {
                agent.executionState.timing.lastActiveTime = new Date();

                const historyEntry: IStateHistoryEntry = {
                    timestamp: new Date(),
                    action: 'CONFIG_UPDATED',
                    category: STATE_CATEGORY.CORE,
                    details: {
                        previousConfig: event.previousConfig,
                        newConfig: event.newConfig
                    }
                };
                agent.executionState.history.push(historyEntry);

                await this.stateManager.updateAgent(event.agentId, agent);
            }
        }, 'onAgentConfigUpdated');
    }

    public async onAgentValidationCompleted(event: IAgentValidationCompletedEvent): Promise<void> {
        await this.safeExecute(async () => {
            this.logInfo('Validation completed', { agentId: event.agentId });
            if (!event.validationResult.isValid) {
                const agent = this.stateManager.getAgent(event.agentId);
                if (!agent) {
                    throw this.createBaseError(`Agent not found: ${event.agentId}`);
                }

                if (agent.executionState) {
                    const historyEntry: IStateHistoryEntry = {
                        timestamp: new Date(),
                        action: 'VALIDATION_FAILED',
                        category: STATE_CATEGORY.ERROR,
                        details: {
                            errors: event.validationResult.errors,
                            warnings: event.validationResult.warnings
                        }
                    };
                    agent.executionState.history.push(historyEntry);

                    const errorContext: IAgentExecutionErrorContext = {
                        operation: 'validation',
                        state: agent,
                        validationResult: event.validationResult
                    };

                    await this.eventEmitter.emitAgentErrorOccurred({
                        agentId: event.agentId,
                        error: this.createBaseError(
                            event.validationResult.errors.join(', '),
                            'ValidationError'
                        ),
                        context: errorContext
                    });
                }
            }
        }, 'onAgentValidationCompleted');
    }

    public async onAgentErrorOccurred(event: IAgentErrorOccurredEvent): Promise<void> {
        await this.safeExecute(async () => {
            this.logError('Error occurred', event.error);
            const agent = this.stateManager.getAgent(event.agentId);
            if (!agent) {
                throw this.createBaseError(`Agent not found: ${event.agentId}`);
            }

            if (agent.executionState) {
                agent.executionState.error.errorCount++;
                agent.executionState.error.lastError = this.convertToBaseError(event.error);
                agent.executionState.timing.lastActiveTime = new Date();

                const historyEntry: IStateHistoryEntry = {
                    timestamp: new Date(),
                    action: 'ERROR_OCCURRED',
                    category: STATE_CATEGORY.ERROR,
                    details: {
                        error: event.error.message,
                        context: event.context
                    }
                };
                agent.executionState.history.push(historyEntry);

                await this.stateManager.updateAgent(event.agentId, agent);
            }
        }, 'onAgentErrorOccurred');
    }

    public async onAgentErrorHandled(event: IAgentErrorHandledEvent): Promise<void> {
        await this.safeExecute(async () => {
            this.logInfo('Error handled', { agentId: event.agentId });
            const agent = this.stateManager.getAgent(event.agentId);
            if (!agent) {
                throw this.createBaseError(`Agent not found: ${event.agentId}`);
            }

            if (agent.executionState) {
                agent.executionState.error.lastError = undefined;
                agent.executionState.timing.lastActiveTime = new Date();

                const historyEntry: IStateHistoryEntry = {
                    timestamp: new Date(),
                    action: 'ERROR_HANDLED',
                    category: STATE_CATEGORY.ERROR,
                    details: {
                        error: this.convertToBaseError(event.error),
                        task: event.task,
                        context: event.context
                    }
                };
                agent.executionState.history.push(historyEntry);

                await this.stateManager.updateAgent(event.agentId, agent);
            }
        }, 'onAgentErrorHandled');
    }

    public async onAgentErrorRecoveryStarted(event: IAgentErrorRecoveryStartedEvent): Promise<void> {
        await this.safeExecute(async () => {
            this.logInfo('Error recovery started', { agentId: event.agentId });
            const agent = this.stateManager.getAgent(event.agentId);
            if (!agent) {
                throw this.createBaseError(`Agent not found: ${event.agentId}`);
            }

            if (agent.executionState) {
                agent.executionState.timing.lastActiveTime = new Date();

                const historyEntry: IStateHistoryEntry = {
                    timestamp: new Date(),
                    action: 'ERROR_RECOVERY_STARTED',
                    category: STATE_CATEGORY.ERROR,
                    details: {
                        error: this.convertToBaseError(event.error),
                        context: event.context
                    }
                };
                agent.executionState.history.push(historyEntry);

                await this.stateManager.updateAgent(event.agentId, agent);
            }
        }, 'onAgentErrorRecoveryStarted');
    }

    public async onAgentErrorRecoveryCompleted(event: IAgentErrorRecoveryCompletedEvent): Promise<void> {
        await this.safeExecute(async () => {
            this.logInfo('Error recovery completed', { agentId: event.agentId });
            const agent = this.stateManager.getAgent(event.agentId);
            if (!agent) {
                throw this.createBaseError(`Agent not found: ${event.agentId}`);
            }

            if (agent.executionState) {
                agent.executionState.error.lastError = undefined;
                agent.executionState.timing.lastActiveTime = new Date();

                const historyEntry: IStateHistoryEntry = {
                    timestamp: new Date(),
                    action: 'ERROR_RECOVERY_COMPLETED',
                    category: STATE_CATEGORY.ERROR,
                    details: {
                        error: this.convertToBaseError(event.error),
                        context: event.context
                    }
                };
                agent.executionState.history.push(historyEntry);

                await this.stateManager.updateAgent(event.agentId, agent);
            }
        }, 'onAgentErrorRecoveryCompleted');
    }

    public async onAgentErrorRecoveryFailed(event: IAgentErrorRecoveryFailedEvent): Promise<void> {
        await this.safeExecute(async () => {
            this.logError('Error recovery failed', event.error);
            const agent = this.stateManager.getAgent(event.agentId);
            if (!agent) {
                throw this.createBaseError(`Agent not found: ${event.agentId}`);
            }

            if (agent.executionState) {
                agent.executionState.error.lastError = this.convertToBaseError(event.error);
                agent.executionState.timing.lastActiveTime = new Date();

                const historyEntry: IStateHistoryEntry = {
                    timestamp: new Date(),
                    action: 'ERROR_RECOVERY_FAILED',
                    category: STATE_CATEGORY.ERROR,
                    details: {
                        error: this.convertToBaseError(event.error),
                        context: event.context
                    }
                };
                agent.executionState.history.push(historyEntry);

                await this.stateManager.updateAgent(event.agentId, agent);

                const errorContext: IAgentExecutionErrorContext = {
                    operation: 'error_recovery',
                    state: agent,
                    recoveryAttempts: agent.executionState.error.retryCount
                };

                await this.eventEmitter.emitAgentErrorOccurred({
                    agentId: event.agentId,
                    error: this.createBaseError(event.error.message, 'ExecutionError'),
                    context: errorContext
                });
            }
        }, 'onAgentErrorRecoveryFailed');
    }

    public cleanup(): void {
        // No cleanup needed as we're using singletons
    }
}

export default AgentEventHandler.getInstance();
