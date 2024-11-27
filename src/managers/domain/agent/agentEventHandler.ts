/**
 * @file agentEventHandler.ts
 * @path src/managers/domain/agent/agentEventHandler.ts
 * @description Agent event handler implementation
 *
 * @module @managers/domain/agent
 */

import { CoreManager } from '../../core/coreManager';
import { AgentStateManager } from './agentStateManager';
import { AgentEventEmitter } from './agentEventEmitter';
import { createError } from '../../../types/common/commonErrorTypes';
import { AGENT_STATUS_enum } from '../../../types/common/commonEnums';
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
import type { IAgentExecutionState } from '../../../types/agent/agentStateTypes';
import type { IAgentExecutionErrorContext } from '../../../types/agent/agentExecutionTypes';
import type { IStandardCostDetails } from '../../../types/common/commonMetricTypes';

export class AgentEventHandler extends CoreManager implements IAgentEventHandler {
    protected static _instance: AgentEventHandler;
    private readonly stateManager: AgentStateManager;
    private readonly eventEmitter: AgentEventEmitter;

    protected constructor() {
        super();
        this.stateManager = AgentStateManager.getInstance();
        this.eventEmitter = AgentEventEmitter.getInstance();
        this.registerDomainManager('AgentEventHandler', this);
    }

    public static override getInstance(): AgentEventHandler {
        if (!AgentEventHandler._instance) {
            AgentEventHandler._instance = new AgentEventHandler();
        }
        return AgentEventHandler._instance;
    }

    // ─── Event Handler Methods ─────────────────────────────────────────────────

public async onAgentCreated(event: IAgentCreatedEvent): Promise<void> {
    await this.safeExecute(async () => {
        this.logInfo('Agent created', event.agentId);
        await this.stateManager.addAgent(event.agentType);

        const executionState: IAgentExecutionState = {
            status: AGENT_STATUS_enum.INITIAL,
            thinking: false,
            busy: false,
            startTime: new Date(),
            lastActiveTime: new Date(),
            errorCount: 0,
            retryCount: 0,
            maxRetries: 3,
            assignedTasks: [],
            completedTasks: [],
            failedTasks: [],
            blockedTasks: [],
            iterations: 0,
            maxIterations: 10,
            performance: {
                completedTaskCount: 0,
                failedTaskCount: 0,
                averageTaskDuration: 0,
                successRate: 1,
                averageIterationsPerTask: 0
            },
            metrics: {
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
                    requestsPerSecond: 0,
                    averageResponseLength: 0,
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
            history: [{
                timestamp: new Date(),
                action: 'AGENT_CREATED',
                details: {
                    agentId: event.agentId,
                    agentType: event.agentType.name
                }
            }]
        };

        await this.stateManager.updateAgent(event.agentId, {
            ...event.agentType,
            executionState
        });
    }, 'onAgentCreated');
}

    public async onAgentUpdated(event: IAgentUpdatedEvent): Promise<void> {
        await this.safeExecute(async () => {
            this.logInfo('Agent updated', event.agentId);
            await this.stateManager.updateAgent(event.agentId, event.newState);
        }, 'onAgentUpdated');
    }

    public async onAgentDeleted(event: IAgentDeletedEvent): Promise<void> {
        await this.safeExecute(async () => {
            this.logInfo('Agent deleted', event.agentId);
            await this.stateManager.removeAgent(event.agentId);
        }, 'onAgentDeleted');
    }

    public async onAgentStatusChanged(event: IAgentStatusChangedEvent): Promise<void> {
        await this.safeExecute(async () => {
            this.logInfo(`Status changed: ${event.previousStatus} -> ${event.newStatus}`, event.agentId);
            const agent = this.stateManager.getAgent(event.agentId);
            if (!agent) {
                throw createError({
                    message: `Agent not found: ${event.agentId}`,
                    type: 'StateError',
                    context: { event }
                });
            }

            if (agent.executionState) {
                agent.executionState.history.push({
                    timestamp: new Date(),
                    action: 'STATUS_CHANGED',
                    details: {
                        previousStatus: event.previousStatus,
                        newStatus: event.newStatus,
                        reason: event.reason
                    }
                });
            }

            await this.stateManager.updateAgent(event.agentId, {
                ...agent,
                status: event.newStatus
            });
        }, 'onAgentStatusChanged');
    }

    public async onAgentIterationStarted(event: IAgentIterationStartedEvent): Promise<void> {
        await this.safeExecute(async () => {
            this.logInfo(`Iteration started: ${event.iterationId}`, event.agentId);
            const agent = this.stateManager.getAgent(event.agentId);
            if (!agent) {
                throw createError({
                    message: `Agent not found: ${event.agentId}`,
                    type: 'StateError',
                    context: { event }
                });
            }

            if (agent.executionState) {
                agent.executionState.iterations++;
                agent.executionState.lastActiveTime = new Date();
                agent.executionState.thinking = true;
                agent.executionState.history.push({
                    timestamp: new Date(),
                    action: 'ITERATION_STARTED',
                    details: {
                        iterationId: event.iterationId,
                        iterationCount: agent.executionState.iterations
                    }
                });
                await this.stateManager.updateAgent(event.agentId, agent);
            }
        }, 'onAgentIterationStarted');
    }

    public async onAgentIterationCompleted(event: IAgentIterationCompletedEvent): Promise<void> {
        await this.safeExecute(async () => {
            this.logInfo(`Iteration completed: ${event.iterationId}`, event.agentId);
            const agent = this.stateManager.getAgent(event.agentId);
            if (!agent) {
                throw createError({
                    message: `Agent not found: ${event.agentId}`,
                    type: 'StateError',
                    context: { event }
                });
            }

            if (agent.executionState) {
                agent.executionState.lastActiveTime = new Date();
                agent.executionState.thinking = false;
                agent.executionState.history.push({
                    timestamp: new Date(),
                    action: 'ITERATION_COMPLETED',
                    details: {
                        iterationId: event.iterationId,
                        result: event.result
                    }
                });
                await this.stateManager.updateAgent(event.agentId, agent);
            }
        }, 'onAgentIterationCompleted');
    }

    public async onAgentIterationFailed(event: IAgentIterationFailedEvent): Promise<void> {
        await this.safeExecute(async () => {
            this.logError(`Iteration failed: ${event.iterationId}`, event.agentId, undefined, event.error);
            const agent = this.stateManager.getAgent(event.agentId);
            if (!agent) {
                throw createError({
                    message: `Agent not found: ${event.agentId}`,
                    type: 'StateError',
                    context: { event }
                });
            }

            if (agent.executionState) {
                agent.executionState.lastActiveTime = new Date();
                agent.executionState.thinking = false;
                agent.executionState.errorCount++;
                agent.executionState.lastError = event.error;
                agent.executionState.history.push({
                    timestamp: new Date(),
                    action: 'ITERATION_FAILED',
                    details: {
                        iterationId: event.iterationId,
                        error: event.error.message
                    }
                });
                await this.stateManager.updateAgent(event.agentId, agent);
            }

            const errorContext: IAgentExecutionErrorContext = {
                operation: 'iteration',
                state: agent
            };

            await this.eventEmitter.emitAgentErrorOccurred({
                agentId: event.agentId,
                error: event.error,
                context: errorContext
            });
        }, 'onAgentIterationFailed');
    }

public async onAgentMetricsUpdated(event: IAgentMetricsUpdatedEvent): Promise<void> {
    await this.safeExecute(async () => {
        this.logInfo('Metrics updated', event.agentId);
        const agent = this.stateManager.getAgent(event.agentId);
        if (!agent) {
            throw createError({
                message: `Agent not found: ${event.agentId}`,
                type: 'StateError',
                context: { event }
            });
        }

        if (agent.executionState) {
            const now = Date.now();
            // Create LLM resource metrics structure
            const llmResourceMetrics = {
                cpuUsage: event.newMetrics.resources.cpuUsage,
                memoryUsage: event.newMetrics.resources.memoryUsage,
                diskIO: event.newMetrics.resources.diskIO,
                networkUsage: event.newMetrics.resources.networkUsage,
                gpuMemoryUsage: 0, // Default value for LLM-specific field
                modelMemoryAllocation: {
                    weights: 0,
                    cache: 0,
                    workspace: 0
                },
                timestamp: now
            };

            // Create base performance metrics
            const basePerformanceMetrics = {
                executionTime: event.newMetrics.performance.executionTime,
                latency: event.newMetrics.performance.latency,
                throughput: event.newMetrics.performance.throughput,
                responseTime: event.newMetrics.performance.responseTime,
                queueLength: event.newMetrics.performance.queueLength,
                errorRate: event.newMetrics.performance.errorRate,
                successRate: event.newMetrics.performance.successRate,
                errorMetrics: event.newMetrics.performance.errorMetrics
            };

            // Convert agent metrics to LLM metrics format
            agent.executionState.metrics = {
                resources: llmResourceMetrics,
                performance: {
                    ...basePerformanceMetrics,
                    resourceUtilization: llmResourceMetrics, // Use the same LLM resource metrics
                    tokensPerSecond: 0, // LLM-specific field
                    coherenceScore: 1, // LLM-specific field
                    temperatureImpact: 0, // LLM-specific field
                    timestamp: now
                },
                usage: {
                    totalRequests: event.newMetrics.usage.totalRequests,
                    requestsPerSecond: event.newMetrics.usage.requestsPerSecond,
                    peakMemoryUsage: event.newMetrics.usage.peakMemoryUsage,
                    uptime: event.newMetrics.usage.uptime,
                    rateLimit: event.newMetrics.usage.rateLimit,
                    activeInstances: 0, // LLM-specific field
                    averageResponseLength: 0, // LLM-specific field
                    tokenDistribution: { // LLM-specific field
                        prompt: 0,
                        completion: 0,
                        total: 0
                    },
                    modelDistribution: { // LLM-specific field
                        gpt4: 0,
                        gpt35: 0,
                        other: 0
                    },
                    timestamp: now
                },
                timestamp: now
            };

            // Add to history
            agent.executionState.history.push({
                timestamp: new Date(),
                action: 'METRICS_UPDATED',
                details: {
                    metrics: agent.executionState.metrics
                }
            });

            await this.stateManager.updateAgent(event.agentId, agent);
        }
    }, 'onAgentMetricsUpdated');
}

    public async onAgentConfigUpdated(event: IAgentConfigUpdatedEvent): Promise<void> {
        await this.safeExecute(async () => {
            this.logInfo('Config updated', event.agentId);
            const agent = this.stateManager.getAgent(event.agentId);
            if (!agent) {
                throw createError({
                    message: `Agent not found: ${event.agentId}`,
                    type: 'StateError',
                    context: { event }
                });
            }

            if (agent.executionState) {
                agent.executionState.lastActiveTime = new Date();
                agent.executionState.history.push({
                    timestamp: new Date(),
                    action: 'CONFIG_UPDATED',
                    details: {
                        previousConfig: event.previousConfig,
                        newConfig: event.newConfig
                    }
                });
                await this.stateManager.updateAgent(event.agentId, agent);
            }
        }, 'onAgentConfigUpdated');
    }

    public async onAgentValidationCompleted(event: IAgentValidationCompletedEvent): Promise<void> {
        await this.safeExecute(async () => {
            this.logInfo('Validation completed', event.agentId);
            if (!event.validationResult.isValid) {
                const agent = this.stateManager.getAgent(event.agentId);
                if (!agent) {
                    throw createError({
                        message: `Agent not found: ${event.agentId}`,
                        type: 'StateError',
                        context: { event }
                    });
                }

                if (agent.executionState) {
                    agent.executionState.history.push({
                        timestamp: new Date(),
                        action: 'VALIDATION_FAILED',
                        details: {
                            errors: event.validationResult.errors,
                            warnings: event.validationResult.warnings
                        }
                    });
                }

                const errorContext: IAgentExecutionErrorContext = {
                    operation: 'validation',
                    state: agent,
                    validationResult: event.validationResult
                };

                await this.eventEmitter.emitAgentErrorOccurred({
                    agentId: event.agentId,
                    error: new Error(event.validationResult.errors.join(', ')),
                    context: errorContext
                });
            }
        }, 'onAgentValidationCompleted');
    }

    public async onAgentErrorOccurred(event: IAgentErrorOccurredEvent): Promise<void> {
        await this.safeExecute(async () => {
            this.logError('Error occurred', event.agentId, undefined, event.error);
            const agent = this.stateManager.getAgent(event.agentId);
            if (!agent) {
                throw createError({
                    message: `Agent not found: ${event.agentId}`,
                    type: 'StateError',
                    context: { event }
                });
            }

            if (agent.executionState) {
                agent.executionState.errorCount++;
                agent.executionState.lastError = event.error;
                agent.executionState.lastActiveTime = new Date();
                agent.executionState.history.push({
                    timestamp: new Date(),
                    action: 'ERROR_OCCURRED',
                    details: {
                        error: event.error.message,
                        context: event.context
                    }
                });
                await this.stateManager.updateAgent(event.agentId, agent);
            }
        }, 'onAgentErrorOccurred');
    }

    public async onAgentErrorHandled(event: IAgentErrorHandledEvent): Promise<void> {
        await this.safeExecute(async () => {
            this.logInfo('Error handled', event.agentId);
            const agent = this.stateManager.getAgent(event.agentId);
            if (!agent) {
                throw createError({
                    message: `Agent not found: ${event.agentId}`,
                    type: 'StateError',
                    context: { event }
                });
            }

            if (agent.executionState) {
                agent.executionState.lastError = undefined;
                agent.executionState.lastActiveTime = new Date();
                agent.executionState.history.push({
                    timestamp: new Date(),
                    action: 'ERROR_HANDLED',
                    details: {
                        error: event.error,
                        task: event.task,
                        context: event.context
                    }
                });
                await this.stateManager.updateAgent(event.agentId, agent);
            }
        }, 'onAgentErrorHandled');
    }

    public async onAgentErrorRecoveryStarted(event: IAgentErrorRecoveryStartedEvent): Promise<void> {
        await this.safeExecute(async () => {
            this.logInfo('Error recovery started', event.agentId);
            const agent = this.stateManager.getAgent(event.agentId);
            if (!agent) {
                throw createError({
                    message: `Agent not found: ${event.agentId}`,
                    type: 'StateError',
                    context: { event }
                });
            }

            if (agent.executionState) {
                agent.executionState.lastActiveTime = new Date();
                agent.executionState.history.push({
                    timestamp: new Date(),
                    action: 'ERROR_RECOVERY_STARTED',
                    details: {
                        error: event.error,
                        context: event.context
                    }
                });
                await this.stateManager.updateAgent(event.agentId, agent);
            }
        }, 'onAgentErrorRecoveryStarted');
    }

    public async onAgentErrorRecoveryCompleted(event: IAgentErrorRecoveryCompletedEvent): Promise<void> {
        await this.safeExecute(async () => {
            this.logInfo('Error recovery completed', event.agentId);
            const agent = this.stateManager.getAgent(event.agentId);
            if (!agent) {
                throw createError({
                    message: `Agent not found: ${event.agentId}`,
                    type: 'StateError',
                    context: { event }
                });
            }

            if (agent.executionState) {
                agent.executionState.lastError = undefined;
                agent.executionState.lastActiveTime = new Date();
                agent.executionState.history.push({
                    timestamp: new Date(),
                    action: 'ERROR_RECOVERY_COMPLETED',
                    details: {
                        error: event.error,
                        context: event.context
                    }
                });
                await this.stateManager.updateAgent(event.agentId, agent);
            }
        }, 'onAgentErrorRecoveryCompleted');
    }

    public async onAgentErrorRecoveryFailed(event: IAgentErrorRecoveryFailedEvent): Promise<void> {
        await this.safeExecute(async () => {
            this.logError('Error recovery failed', event.agentId, undefined, event.error);
            const agent = this.stateManager.getAgent(event.agentId);
            if (!agent) {
                throw createError({
                    message: `Agent not found: ${event.agentId}`,
                    type: 'StateError',
                    context: { event }
                });
            }

            if (agent.executionState) {
                agent.executionState.lastError = event.error;
                agent.executionState.lastActiveTime = new Date();
                agent.executionState.history.push({
                    timestamp: new Date(),
                    action: 'ERROR_RECOVERY_FAILED',
                    details: {
                        error: event.error,
                        context: event.context
                    }
                });
                await this.stateManager.updateAgent(event.agentId, agent);
            }

            const errorContext: IAgentExecutionErrorContext = {
                operation: 'error_recovery',
                state: agent,
                recoveryAttempts: agent.executionState?.retryCount
            };

            await this.eventEmitter.emitAgentErrorOccurred({
                agentId: event.agentId,
                error: event.error,
                context: errorContext
            });
        }, 'onAgentErrorRecoveryFailed');
    }

    public cleanup(): void {
        // No cleanup needed as we're using singletons
    }
}

export default AgentEventHandler.getInstance();
