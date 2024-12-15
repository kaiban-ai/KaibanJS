/**
 * @file workflowManager.ts
 * @description Workflow manager with Langchain integration and enhanced features
 */

import { RunnableSequence, Runnable } from '@langchain/core/runnables';
import { BaseChain } from 'langchain/chains';
import { ChainValues } from '@langchain/core/utils/types';
import { WorkflowStateManager } from './workflowStateManager';
import { WorkflowEventEmitter } from './workflowEventEmitter';
import { WorkflowValidator } from './workflowValidator';
import { WorkflowSyncManager } from './workflowSyncManager';
import {
    IWorkflowState,
    IWorkflowStateUpdate,
    IWorkflowStateRecoveryOptions,
    IWorkflowStateRecoveryResult,
    IStepConfig,
    IStepResult
} from '../../../types/workflow/workflowStateTypes';
import {
    IChainStepConfig,
    isChainStepConfig
} from '../../../types/workflow/workflowTypes';
import {
    IWorkflowSyncOptions,
    IRoutingRule,
    IRoutingPath,
    IRoutableStepConfig
} from '../../../types/workflow/workflowSyncTypes';
import { IHandlerResult } from '../../../types/common/commonHandlerTypes';
import { IBaseHandlerMetadata } from '../../../types/common/commonMetadataTypes';
import { IAgentType } from '../../../types/agent/agentBaseTypes';
import { ITaskType } from '../../../types/task/taskBaseTypes';
import { createError } from '../../../types/common/commonErrorTypes';
import {
    IWorkflowPerformanceMetrics,
    IWorkflowResourceMetrics,
    IWorkflowUsageMetrics
} from '../../../types/workflow/workflowMetricTypes';
import { ITokenCostBreakdown } from '../../../types/workflow/workflowCostsTypes';
import { MetricsAdapter } from '../../../metrics/MetricsAdapter';
import { LLMMetricsCollector } from '../../../metrics/LLMMetricsCollector';

/**
 * Enhanced workflow manager with Langchain integration
 */
export class WorkflowManager extends WorkflowValidator {
    private static instance: WorkflowManager;
    private readonly stateManager: WorkflowStateManager;
    private readonly eventEmitter: WorkflowEventEmitter;
    private readonly syncManager: WorkflowSyncManager;
    private readonly chainMap: Map<string, RunnableSequence>;
    private readonly metricsCollector: LLMMetricsCollector;
    private readonly syncOptions: IWorkflowSyncOptions = {
        lockTimeout: 30000, // 30 seconds
        maxRetries: 3,
        retryDelay: 1000, // 1 second
        resourcePriorities: {}
    };

    private constructor() {
        super();
        this.stateManager = WorkflowStateManager.getInstance();
        this.eventEmitter = WorkflowEventEmitter.getInstance();
        this.syncManager = WorkflowSyncManager.getInstance();
        this.chainMap = new Map();
        this.metricsCollector = new LLMMetricsCollector();
        this.registerDomainManager('WorkflowManager', this);
    }

    public static getInstance(): WorkflowManager {
        if (!WorkflowManager.instance) {
            WorkflowManager.instance = new WorkflowManager();
        }
        return WorkflowManager.instance;
    }

    /**
     * Initialize workflow with Langchain chain and routing
     */
    public async initializeWorkflow(
        workflowId: string,
        steps: IChainStepConfig[],
        initialState?: Partial<IWorkflowState>
    ): Promise<IHandlerResult<void>> {
        return this.safeExecute(async () => {
            // Validate steps
            await this.validateWorkflowSteps(steps);
            this.validateStepDependencies(steps);
            this.validateStepCycles(steps);
            this.validateStepResources(steps);

            // Create Langchain runnable sequence
            const runnables = steps
                .filter(isChainStepConfig)
                .map(step => step.chain!)
                .filter((chain): chain is BaseChain => chain !== undefined);

            if (runnables.length === 0) {
                throw createError({
                    message: 'No valid chains found in workflow steps',
                    type: 'ValidationError',
                    context: {
                        component: this.constructor.name,
                        operation: 'initializeWorkflow',
                        workflowId
                    }
                });
            }

            // Create sequence by piping chains together
            let sequence = runnables[0] as Runnable;
            for (let i = 1; i < runnables.length; i++) {
                sequence = sequence.pipe(runnables[i]);
            }

            this.chainMap.set(workflowId, sequence as RunnableSequence);

            // Set up routing rules and paths
            for (const step of steps) {
                if ('routingRules' in step) {
                    const routableStep = step as IRoutableStepConfig;
                    if (routableStep.routingRules) {
                        routableStep.routingRules.forEach(rule =>
                            this.syncManager.addRoutingRule(workflowId, rule)
                        );
                    }
                    if (routableStep.outgoingPaths) {
                        routableStep.outgoingPaths.forEach(path =>
                            this.syncManager.addRoutingPath(workflowId, path)
                        );
                    }
                }
            }

            // Initialize workflow state
            const state: IWorkflowState = {
                id: workflowId,
                name: initialState?.name || workflowId,
                workflowId,
                status: 'pending',
                steps,
                currentStepIndex: 0,
                stepResults: {},
                assignedAgents: {},
                pendingTasks: [],
                activeTasks: [],
                completedTasks: [],
                errors: [],
                agents: [],
                tasks: [],
                workflowLogs: [],
                costDetails: {
                    inputCost: 0,
                    outputCost: 0,
                    totalCost: 0,
                    currency: 'USD',
                    breakdown: {
                        promptTokens: { count: 0, cost: 0 } as ITokenCostBreakdown,
                        completionTokens: { count: 0, cost: 0 } as ITokenCostBreakdown
                    }
                },
                metadata: initialState?.metadata || {},
                metrics: {
                    performance: {
                        executionTime: { total: 0, average: 0, min: 0, max: 0 },
                        latency: { total: 0, average: 0, min: 0, max: 0 },
                        throughput: { operationsPerSecond: 0, dataProcessedPerSecond: 0 },
                        responseTime: { total: 0, average: 0, min: 0, max: 0 },
                        queueLength: 0,
                        errorRate: 0,
                        successRate: 1,
                        errorMetrics: { totalErrors: 0, errorRate: 0 },
                        resourceUtilization: await this.getMetricsManager().getInitialResourceMetrics(),
                        completionRate: 0,
                        averageStepsPerWorkflow: 0,
                        timestamp: Date.now()
                    } as IWorkflowPerformanceMetrics,
                    resources: {
                        cpuUsage: 0,
                        memoryUsage: 0,
                        diskIO: { read: 0, write: 0 },
                        networkUsage: { upload: 0, download: 0 },
                        concurrentWorkflows: 0,
                        resourceAllocation: { cpu: 0, memory: 0 },
                        timestamp: Date.now()
                    } as IWorkflowResourceMetrics,
                    usage: {
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
                            resetTime: 0
                        },
                        totalExecutions: 0,
                        activeWorkflows: 0,
                        workflowsPerSecond: 0,
                        averageComplexity: 0,
                        workflowDistribution: {
                            sequential: 0,
                            parallel: 0,
                            conditional: 0
                        },
                        timestamp: Date.now()
                    } as IWorkflowUsageMetrics,
                    timestamp: Date.now()
                }
            };

            await this.stateManager.updateState(workflowId, state);
            this.logInfo(`Initialized workflow: ${workflowId}`, null, workflowId);
        }, 'Initialize workflow');
    }

    /**
     * Start workflow execution with synchronization
     */
    public async startWorkflow(workflowId: string, inputs: Record<string, any>): Promise<IHandlerResult<void>> {
        return this.safeExecute(async () => {
            const chain = this.chainMap.get(workflowId);
            if (!chain) {
                throw createError({
                    message: `Workflow chain not found: ${workflowId}`,
                    type: 'ValidationError',
                    context: {
                        component: this.constructor.name,
                        operation: 'startWorkflow',
                        workflowId
                    }
                });
            }

            // Acquire workflow lock
            const lock = await this.syncManager.acquireLock(
                workflowId,
                'workflow',
                'exclusive',
                this.syncOptions
            );

            try {
                await this.emitControlEvent(workflowId, 'start', 'startWorkflow');
                await this.updateWorkflowState(workflowId, {
                    status: 'running',
                    metadata: { startTime: Date.now() }
                });

                // Start Langchain chain execution
                try {
                    const result = await chain.invoke(inputs);
                    await this.handleChainResult(workflowId, result);
                } catch (error) {
                    await this.handleChainError(workflowId, error as Error);
                }

                this.logInfo(`Started workflow: ${workflowId}`, null, workflowId);
            } finally {
                // Release workflow lock
                await this.syncManager.releaseLock(lock);
            }
        }, 'Start workflow');
    }

    /**
     * Pause workflow execution
     */
    public async pauseWorkflow(workflowId: string): Promise<IHandlerResult<void>> {
        return this.safeExecute(async () => {
            await this.emitControlEvent(workflowId, 'pause', 'pauseWorkflow');
            await this.updateWorkflowState(workflowId, {
                status: 'paused',
                metadata: { pauseTime: Date.now() }
            });
            this.logInfo(`Paused workflow: ${workflowId}`, null, workflowId);
        }, 'Pause workflow');
    }

    /**
     * Resume workflow execution
     */
    public async resumeWorkflow(workflowId: string): Promise<IHandlerResult<void>> {
        return this.safeExecute(async () => {
            const state = await this.getRequiredState(workflowId);
            const chain = this.chainMap.get(workflowId);
            if (!chain) {
                throw createError({
                    message: `Workflow chain not found: ${workflowId}`,
                    type: 'ValidationError',
                    context: {
                        component: this.constructor.name,
                        operation: 'resumeWorkflow',
                        workflowId
                    }
                });
            }

            await this.emitControlEvent(workflowId, 'resume', 'resumeWorkflow');
            await this.updateWorkflowState(workflowId, {
                status: 'running',
                metadata: { resumeTime: Date.now() }
            });

            // Resume from current step
            try {
                const currentStep = state.steps[state.currentStepIndex];
                const result = await chain.invoke(state.metadata.lastInputs || {});
                await this.handleChainResult(workflowId, result);
            } catch (error) {
                await this.handleChainError(workflowId, error as Error);
            }

            this.logInfo(`Resumed workflow: ${workflowId}`, null, workflowId);
        }, 'Resume workflow');
    }

    /**
     * Stop workflow execution
     */
    public async stopWorkflow(workflowId: string): Promise<IHandlerResult<void>> {
        return this.safeExecute(async () => {
            await this.emitControlEvent(workflowId, 'stop', 'stopWorkflow');
            await this.updateWorkflowState(workflowId, {
                status: 'completed',
                metadata: { endTime: Date.now() }
            });

            // Cleanup Langchain chain
            this.chainMap.delete(workflowId);

            this.logInfo(`Stopped workflow: ${workflowId}`, null, workflowId);
        }, 'Stop workflow');
    }

    /**
     * Restore state from snapshot
     */
    public async restoreState(
        workflowId: string,
        options: IWorkflowStateRecoveryOptions
    ): Promise<IHandlerResult<IWorkflowStateRecoveryResult>> {
        return this.stateManager.restoreState(workflowId, options);
    }

    /**
     * Handle Langchain chain result with routing
     */
    private async handleChainResult(workflowId: string, result: ChainValues): Promise<void> {
        const state = await this.getRequiredState(workflowId);
        const currentStep = state.steps[state.currentStepIndex];

        // Update step result
        const stepResult: IStepResult = {
            stepId: currentStep.id,
            startTime: Date.now(),
            endTime: Date.now(),
            status: 'completed',
            result,
            metrics: {
                duration: 0,
                retries: 0,
                resourceUsage: {
                    cpu: 0,
                    memory: 0
                }
            }
        };

        // Get next step from routing rules
        const nextStepId = this.syncManager.getNextStep(
            workflowId,
            currentStep.id,
            result,
            state.metadata
        );

        // Find next step index
        const nextStepIndex = nextStepId
            ? state.steps.findIndex(s => s.id === nextStepId)
            : state.currentStepIndex + 1;

        await this.updateWorkflowState(workflowId, {
            stepResults: {
                ...state.stepResults,
                [currentStep.id]: stepResult
            },
            currentStepIndex: nextStepIndex,
            metadata: {
                ...state.metadata,
                lastResult: result
            }
        });

        // Check if workflow is complete
        if (nextStepIndex >= state.steps.length) {
            await this.stopWorkflow(workflowId);
        }
    }

    /**
     * Handle Langchain chain error
     */
    private async handleChainError(workflowId: string, error: Error): Promise<void> {
        const state = await this.getRequiredState(workflowId);
        const currentStep = state.steps[state.currentStepIndex];

        // Update step result with error
        const stepResult: IStepResult = {
            stepId: currentStep.id,
            startTime: Date.now(),
            endTime: Date.now(),
            status: 'failed',
            error,
            metrics: {
                duration: 0,
                retries: 0,
                resourceUsage: {
                    cpu: 0,
                    memory: 0
                }
            }
        };

        await this.updateWorkflowState(workflowId, {
            status: 'failed',
            stepResults: {
                ...state.stepResults,
                [currentStep.id]: stepResult
            },
            errors: [...state.errors, error]
        });

        // Log error with correct parameter order: message, agentName, taskId, error
        this.logError(`Workflow error: ${error.message}`, null, workflowId, error);
    }

    /**
     * Helper methods
     */
    private async getRequiredState(workflowId: string): Promise<IWorkflowState> {
        const state = this.stateManager.getState(workflowId);
        if (!state) {
            throw createError({
                message: `Workflow state not found: ${workflowId}`,
                type: 'ValidationError',
                context: {
                    component: this.constructor.name,
                    operation: 'getRequiredState',
                    workflowId
                }
            });
        }
        return state;
    }

    private async updateWorkflowState(workflowId: string, update: IWorkflowStateUpdate): Promise<void> {
        await this.stateManager.updateState(workflowId, update);
    }

    private async createEventMetadata(operation: string, workflowId: string): Promise<IBaseHandlerMetadata> {
        const timestamp = Date.now();
        return {
            timestamp,
            component: this.constructor.name,
            operation,
            performance: await this.getMetricsManager().getInitialPerformanceMetrics(),
            context: {
                source: this.constructor.name,
                target: 'workflow',
                correlationId: workflowId,
                causationId: timestamp.toString()
            },
            validation: {
                isValid: true,
                errors: [],
                warnings: []
            }
        };
    }

    private async emitControlEvent(
        workflowId: string,
        type: 'start' | 'pause' | 'resume' | 'stop' | 'reset',
        operation: string
    ): Promise<void> {
        const timestamp = Date.now();
        await this.eventEmitter.emitControlEvent({
            id: `workflow_control_${workflowId}_${timestamp}`,
            timestamp,
            type,
            metadata: await this.createEventMetadata(operation, workflowId)
        });
    }

    private async emitAgentEvent(
        workflowId: string,
        stepId: string,
        type: 'assign' | 'unassign',
        operation: string,
        agent?: IAgentType
    ): Promise<void> {
        const timestamp = Date.now();
        await this.eventEmitter.emitAgentEvent({
            id: `workflow_agent_${workflowId}_${stepId}_${timestamp}`,
            timestamp,
            type,
            stepId,
            agent,
            metadata: await this.createEventMetadata(operation, workflowId)
        });
    }

    private async emitTaskEvent(
        workflowId: string,
        task: ITaskType,
        type: 'add' | 'remove' | 'update',
        operation: string
    ): Promise<void> {
        const timestamp = Date.now();
        await this.eventEmitter.emitTaskEvent({
            id: `workflow_task_${workflowId}_${task.id}_${timestamp}`,
            timestamp,
            type,
            task,
            metadata: await this.createEventMetadata(operation, workflowId)
        });
    }
}

export default WorkflowManager.getInstance();
