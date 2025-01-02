/**
 * @file workflowManager.ts
 * @description Primary workflow domain manager that orchestrates task execution and workflow state
 */

// Runtime dependencies
import { CoreManager } from '../../core/coreManager';
import { TaskManager } from '../task/taskManager';
import { TaskEventEmitter } from '../task/taskEventEmitter';
import { AgentManager } from '../agent/agentManager';
import { TeamManager } from '../team/teamManager';
import { WorkflowStateManager } from './workflowStateManager';
import { WorkflowEventEmitter } from './workflowEventEmitter';
import { WorkflowMetricsManager } from './WorkflowMetricsManager';
import { ERROR_KINDS, ERROR_SEVERITY_enum, createError, createErrorMetadata } from '../../../types/common/errorTypes';
import { TASK_STATUS_enum, MANAGER_CATEGORY_enum, TASK_EVENT_TYPE_enum, WORKFLOW_STATUS_enum, BATCH_PRIORITY_enum } from '../../../types/common/enumTypes';
import { MetricDomain, MetricType } from '../../../types/metrics/base/metricsManagerTypes';
import { v4 as uuidv4 } from 'uuid';

// Helper functions for status mapping
const mapEnumToStateStatus = (status: keyof typeof WORKFLOW_STATUS_enum): IWorkflowState['status'] => {
    switch (status) {
        case 'RUNNING':
            return 'running';
        case 'PAUSED':
            return 'paused';
        case 'COMPLETED':
            return 'completed';
        case 'FAILED':
            return 'failed';
        case 'INITIAL':
        case 'CREATED':
        case 'INITIALIZED':
            return 'pending';
        default:
            return 'failed';
    }
};

// Type-only imports
import type { ITaskType } from '../../../types/task/taskBaseTypes';
import type { IWorkflowTaskType } from '../../../types/workflow/workflowTaskTypes';
import type { IAgentType } from '../../../types/agent/agentBaseTypes';
import type { IHandlerResult } from '../../../types/common/baseTypes';
import type { IBaseError, IErrorContext } from '../../../types/common/errorTypes';
import type { 
    WorkflowStepEventParams,
    WorkflowAgentEventParams,
    IWorkflowStepEvent,
    IWorkflowControlEvent,
    IWorkflowAgentEvent
} from '../../../types/workflow/workflowEventTypes';
import type { IWorkflowState } from '../../../types/workflow/workflowStateTypes';
import type { ITaskStatusChangedEvent, ITaskErrorOccurredEvent } from '../../../types/task/taskEventTypes';
import type { ITaskHandlerResult } from '../../../types/task/taskHandlerTypes';
import { createEmptyTaskMetrics } from '../../../utils/task/taskMetricsUtils';

/**
 * Primary workflow domain manager
 */
import { IWorkflowManager } from '../../../types/workflow/workflowManagerTypes';

export class WorkflowManager extends CoreManager implements IWorkflowManager {
    private static instance: WorkflowManager;
    private readonly taskManager: TaskManager;
    private readonly taskEventEmitter: TaskEventEmitter;
    private readonly agentManager: AgentManager;
    private readonly teamManager: TeamManager;
    private readonly stateManager: WorkflowStateManager;
    private readonly workflowEventEmitter: WorkflowEventEmitter;
    private readonly workflowMetricsManager: WorkflowMetricsManager;

    public readonly category = MANAGER_CATEGORY_enum.STATE;

    // IWorkflowManager interface implementation
    public getState(workflowId: string): IWorkflowState | undefined {
        return this.stateManager.getState(workflowId);
    }

    public async startWorkflow(workflowId: string): Promise<IHandlerResult<void>> {
        return this.safeExecute(async () => {
            await this.stateManager.updateState(workflowId, { status: mapEnumToStateStatus('RUNNING') });
            await this.workflowEventEmitter.emitControlEvent({ type: 'start', workflowId });
        }, 'start workflow');
    }

    public async pauseWorkflow(workflowId: string): Promise<IHandlerResult<void>> {
        return this.safeExecute(async () => {
            await this.stateManager.updateState(workflowId, { status: mapEnumToStateStatus('PAUSED') });
            await this.workflowEventEmitter.emitControlEvent({ type: 'pause', workflowId });
        }, 'pause workflow');
    }

    public async resumeWorkflow(workflowId: string): Promise<IHandlerResult<void>> {
        return this.safeExecute(async () => {
            await this.stateManager.updateState(workflowId, { status: mapEnumToStateStatus('RUNNING') });
            await this.workflowEventEmitter.emitControlEvent({ type: 'resume', workflowId });
        }, 'resume workflow');
    }

    public async stopWorkflow(workflowId: string): Promise<IHandlerResult<void>> {
        return this.safeExecute(async () => {
            await this.stateManager.updateState(workflowId, { status: mapEnumToStateStatus('COMPLETED') });
            await this.workflowEventEmitter.emitControlEvent({ type: 'stop', workflowId });
        }, 'stop workflow');
    }

    public async assignAgent(workflowId: string, stepId: string, agent: IAgentType): Promise<IHandlerResult<void>> {
        return this.safeExecute(async () => {
            await this.workflowEventEmitter.emitAgentEvent({ type: 'assign', workflowId, stepId, agent });
        }, 'assign agent');
    }

    public async addTask(workflowId: string, task: ITaskType): Promise<IHandlerResult<void>> {
        return this.safeExecute(async () => {
            const state = await this.stateManager.getState(workflowId);
            if (!state) throw new Error(`Workflow ${workflowId} not found`);
            await this.stateManager.updateState(workflowId, {
                tasks: [...state.tasks, task]
            });
            await this.workflowEventEmitter.emitTaskEvent({ type: 'add', workflowId, task });
        }, 'add task');
    }

    private constructor() {
        super();

        // Initialize managers
        this.taskManager = TaskManager.getInstance();
        this.taskEventEmitter = TaskEventEmitter.getInstance();
        this.agentManager = AgentManager.getInstance();
        this.teamManager = TeamManager.getInstance();
        this.stateManager = WorkflowStateManager.getInstance();
        this.workflowEventEmitter = WorkflowEventEmitter.getInstance();
        this.workflowMetricsManager = WorkflowMetricsManager.getInstance();

        this.registerDomainManager('WorkflowManager', this);
        this.setupEventHandling();
    }

    public static getInstance(): WorkflowManager {
        if (!WorkflowManager.instance) {
            WorkflowManager.instance = new WorkflowManager();
        }
        return WorkflowManager.instance;
    }

    private setupEventHandling(): void {
        // Handle task status changes
        this.taskEventEmitter.on(TASK_EVENT_TYPE_enum.TASK_STATUS_CHANGED, async (event: ITaskStatusChangedEvent) => {
            const task = this.taskManager.getTask(event.taskId);
            if (!task) return;

            switch (event.newStatus) {
                case TASK_STATUS_enum.DOING:
                    await this.handleTaskDoing(task as IWorkflowTaskType);
                    break;
                case TASK_STATUS_enum.REVISE:
                    await this.handleTaskRevise(task as IWorkflowTaskType);
                    break;
                case TASK_STATUS_enum.DONE:
                    await this.handleTaskDone(task as IWorkflowTaskType);
                    break;
            }
        });

        // Handle task errors
        this.taskEventEmitter.on(TASK_EVENT_TYPE_enum.TASK_ERROR_OCCURRED, async (event: ITaskErrorOccurredEvent) => {
            const task = this.taskManager.getTask(event.taskId);
            if (!task) return;

            const baseError = createError({
                message: event.error.message,
                type: ERROR_KINDS.ExecutionError,
                metadata: createErrorMetadata({
                    component: this.constructor.name,
                    operation: 'handleTaskError'
                })
            });

            await this.handleWorkflowError((task as IWorkflowTaskType).workflowId, baseError);
        });

        // Handle workflow step events
        this.workflowEventEmitter.onStepEvent(async (event: IWorkflowStepEvent) => {
            const state = await this.stateManager.getState(event.workflowId);
            if (!state) return;

            switch (event.type) {
                case 'start':
                    await this.handleStepStart(event);
                    break;
                case 'complete':
                    await this.handleStepComplete(event);
                    break;
                case 'fail':
                    await this.handleStepFail(event);
                    break;
            }
        });

        // Handle workflow agent events
        this.workflowEventEmitter.onAgentEvent(async (event: IWorkflowAgentEvent) => {
            switch (event.type) {
                case 'assign':
                    await this.handleAgentAssign(event);
                    break;
                case 'unassign':
                    await this.handleAgentUnassign(event);
                    break;
            }
        });

        // Handle workflow control events
        this.workflowEventEmitter.onControlEvent(async (event: IWorkflowControlEvent) => {
            switch (event.type) {
                case 'workflow_error':
                    if (event.error) {
                        await this.handleWorkflowError(event.workflowId, event.error);
                    }
                    break;
            }
        });
    }

    /**
     * Handle task moving to DOING status
     */
    private async handleTaskDoing(task: IWorkflowTaskType): Promise<void> {
        await this.safeExecute(async () => {
            try {
                // Emit step start event
                const stepEvent: WorkflowStepEventParams = {
                    type: 'start',
                    stepId: task.stepId,
                    agent: task.agent,
                    workflowId: task.workflowId
                };
                await this.workflowEventEmitter.emitStepEvent(stepEvent);

                // Work on task through team manager
                await this.teamManager.handleTaskStatusChange(task.id, TASK_STATUS_enum.DOING);

                // Update workflow state
                await this.stateManager.updateState(task.workflowId, {
                    currentStepIndex: task.stepIndex,
                    activeTasks: [...(await this.stateManager.getState(task.workflowId))?.activeTasks || [], task]
                });
            } catch (error) {
                const baseError = createError({
                    message: error instanceof Error ? error.message : String(error),
                    type: ERROR_KINDS.ExecutionError,
                    metadata: createErrorMetadata({
                        component: this.constructor.name,
                        operation: 'handleTaskDoing'
                    })
                });

                await this.taskEventEmitter.emitTaskErrorOccurred({
                    taskId: task.id,
                    error: baseError,
                    context: {
                        operation: 'handleTaskDoing',
                        state: task
                    }
                });

                await this.handleWorkflowError(task.workflowId, baseError);
            }
        }, 'Handle task doing');
    }

    /**
     * Handle task moving to REVISE status
     */
    private async handleTaskRevise(task: IWorkflowTaskType): Promise<void> {
        await this.safeExecute(async () => {
            // Check if agent is available
            if (!await this.isAgentBusy(task.agent)) {
                // Emit agent assign event
                const agentEvent: WorkflowAgentEventParams = {
                    type: 'assign',
                    stepId: task.stepId,
                    agent: task.agent,
                    workflowId: task.workflowId
                };
                await this.workflowEventEmitter.emitAgentEvent(agentEvent);

                await this.taskEventEmitter.emitTaskStatusChanged({
                    taskId: task.id,
                    previousStatus: task.status,
                    newStatus: TASK_STATUS_enum.DOING,
                    reason: 'Agent available for revision'
                });
            }

            // Reset subsequent tasks to TODO
            const state = await this.stateManager.getState(task.workflowId);
            if (!state) return;

            const taskIndex = state.tasks.findIndex(t => t.id === task.id);
            for (let i = taskIndex + 1; i < state.tasks.length; i++) {
                const subsequentTask = state.tasks[i] as IWorkflowTaskType;
                await this.taskEventEmitter.emitTaskStatusChanged({
                    taskId: subsequentTask.id,
                    previousStatus: subsequentTask.status,
                    newStatus: TASK_STATUS_enum.TODO,
                    reason: 'Previous task requires revision'
                });
            }
        }, 'Handle task revise');
    }

    /**
     * Handle task moving to DONE status
     */
    private async handleTaskDone(task: IWorkflowTaskType): Promise<void> {
        await this.safeExecute(async () => {
            // Emit step complete event
            const stepEvent: WorkflowStepEventParams = {
                type: 'complete',
                stepId: task.stepId,
                agent: task.agent,
                result: task.result,
                workflowId: task.workflowId
            };
            await this.workflowEventEmitter.emitStepEvent(stepEvent);

            // Update workflow state
            const state = await this.stateManager.getState(task.workflowId);
            if (!state) return;

            await this.stateManager.updateState(task.workflowId, {
                completedTasks: [...state.completedTasks, task],
                activeTasks: state.activeTasks.filter(t => t.id !== task.id)
            });

            // Find and start next task
            const nextTask = state.tasks.find(t => t.status === TASK_STATUS_enum.TODO) as IWorkflowTaskType;
            if (nextTask) {
                await this.taskEventEmitter.emitTaskStatusChanged({
                    taskId: nextTask.id,
                    previousStatus: nextTask.status,
                    newStatus: TASK_STATUS_enum.DOING,
                    reason: 'Previous task completed'
                });
            }
        }, 'Handle task done');
    }

    /**
     * Handle workflow step start
     */
    private async handleStepStart(event: IWorkflowStepEvent): Promise<void> {
        await this.safeExecute(async () => {
            const state = await this.stateManager.getState(event.workflowId);
            if (!state) return;

            // Update workflow state
            await this.stateManager.updateState(event.workflowId, {
                stepResults: {
                    ...state.stepResults,
                    [event.stepId]: {
                        stepId: event.stepId,
                        startTime: Date.now(),
                        status: 'running',
                        agentId: event.agent?.id
                    }
                }
            });
        }, 'Handle step start');
    }

    /**
     * Handle workflow step complete
     */
    private async handleStepComplete(event: IWorkflowStepEvent): Promise<void> {
        await this.safeExecute(async () => {
            const state = await this.stateManager.getState(event.workflowId);
            if (!state) return;

            // Update workflow state
            await this.stateManager.updateState(event.workflowId, {
                stepResults: {
                    ...state.stepResults,
                    [event.stepId]: {
                        ...state.stepResults[event.stepId],
                        endTime: Date.now(),
                        status: 'completed',
                        result: event.result
                    }
                }
            });
        }, 'Handle step complete');
    }

    /**
     * Handle workflow step fail
     */
    private async handleStepFail(event: IWorkflowStepEvent): Promise<void> {
        await this.safeExecute(async () => {
            const state = await this.stateManager.getState(event.workflowId);
            if (!state) return;

            // Update workflow state
            await this.stateManager.updateState(event.workflowId, {
                stepResults: {
                    ...state.stepResults,
                    [event.stepId]: {
                        ...state.stepResults[event.stepId],
                        endTime: Date.now(),
                        status: 'failed',
                        error: event.error
                    }
                }
            });

            if (event.error) {
                await this.handleWorkflowError(event.workflowId, createError({
                    message: event.error.message,
                    type: ERROR_KINDS.ExecutionError,
                    metadata: createErrorMetadata({
                        component: this.constructor.name,
                        operation: 'handleStepFail',
                        details: { stepId: event.stepId }
                    })
                }));
            }
        }, 'Handle step fail');
    }

    /**
     * Handle agent assignment
     */
    private async handleAgentAssign(event: IWorkflowAgentEvent): Promise<void> {
        await this.safeExecute(async () => {
            const state = await this.stateManager.getState(event.workflowId);
            if (!state || !event.agent) return;

            // Update workflow state
            await this.stateManager.updateState(event.workflowId, {
                assignedAgents: {
                    ...state.assignedAgents,
                    [event.stepId]: event.agent
                }
            });
        }, 'Handle agent assign');
    }

    /**
     * Handle agent unassignment
     */
    private async handleAgentUnassign(event: IWorkflowAgentEvent): Promise<void> {
        await this.safeExecute(async () => {
            const state = await this.stateManager.getState(event.workflowId);
            if (!state) return;

            const { [event.stepId]: _, ...remainingAgents } = state.assignedAgents;

            // Update workflow state
            await this.stateManager.updateState(event.workflowId, {
                assignedAgents: remainingAgents
            });
        }, 'Handle agent unassign');
    }

    /**
     * Check if an agent is currently busy
     */
    private async isAgentBusy(agent: IAgentType): Promise<boolean> {
        try {
            // Check both task status and agent availability
            const [tasks, agentStatus] = await Promise.all([
                this.taskManager.getTask(agent.id),
                this.agentManager.executeAgentLoop(agent, {
                    id: 'status_check',
                    title: 'Agent Status Check',
                    description: 'Check if agent is available',
                    expectedOutput: 'Agent availability status',
                    agent: agent,
                    status: TASK_STATUS_enum.TODO,
                    priority: BATCH_PRIORITY_enum.HIGH,
                    stepId: 'status_check',
                    isDeliverable: false,
                    externalValidationRequired: false,
                    inputs: {},
                    metrics: createEmptyTaskMetrics(),
                    progress: {
                        status: TASK_STATUS_enum.TODO,
                        progress: 0,
                        timeElapsed: 0
                    },
                    history: [],
                    feedback: [],
                    execute: async (): Promise<ITaskHandlerResult> => ({
                        success: true,
                        data: {},
                        metadata: {
                            timestamp: Date.now(),
                            component: this.constructor.name,
                            operation: 'isAgentBusy',
                            taskId: 'status_check',
                            taskName: 'Agent Status Check',
                            status: TASK_STATUS_enum.TODO,
                            priority: BATCH_PRIORITY_enum.HIGH,
                            assignedAgent: agent.id,
                            progress: 0,
                            metrics: {
                                resources: {
                                    cpuUsage: 0,
                                    memoryUsage: 0,
                                    diskIO: { read: 0, write: 0 },
                                    networkUsage: { upload: 0, download: 0 },
                                    timestamp: Date.now()
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
                                        limit: 0,
                                        remaining: 0,
                                        resetTime: 0
                                    },
                                    timestamp: Date.now()
                                },
                                performance: {
                                    executionTime: { average: 0, min: 0, max: 0, total: 0 },
                                    latency: { average: 0, min: 0, max: 0, total: 0 },
                                    throughput: {
                                        requestsPerSecond: 0,
                                        bytesPerSecond: 0,
                                        operationsPerSecond: 0,
                                        dataProcessedPerSecond: 0
                                    },
                                    responseTime: { average: 0, min: 0, max: 0, total: 0 },
                                    queueLength: 0,
                                    errorRate: 0,
                                    successRate: 1,
                                    resourceUtilization: {
                                        timestamp: Date.now(),
                                        cpuUsage: 0,
                                        memoryUsage: 0,
                                        diskIO: { read: 0, write: 0 },
                                        networkUsage: { upload: 0, download: 0 }
                                    },
                                    timestamp: Date.now()
                                }
                            },
                            dependencies: {
                                completed: [],
                                pending: [],
                                blocked: []
                            }
                        }
                    })
                })
            ]);

            const isBusyWithTask = tasks?.status === TASK_STATUS_enum.DOING;
            const isAgentAvailable = agentStatus.success;
            const isBusy = isBusyWithTask || !isAgentAvailable;
            
            // Initialize metrics if they don't exist
            try {
                await this.workflowMetricsManager.initializeMetrics(agent.id);
                await this.workflowMetricsManager.updatePerformanceMetrics(agent.id, {
                    executionTime: 0,
                    success: !isBusy,
                    error: isBusy ? createError({
                        message: isBusyWithTask ? 'Agent is busy with task' : 'Agent is not available',
                        type: ERROR_KINDS.AgentError,
                        metadata: createErrorMetadata({
                            component: this.constructor.name,
                            operation: 'isAgentBusy',
                            details: {
                                taskStatus: tasks?.status,
                                agentAvailable: isAgentAvailable
                            }
                        })
                    }) : undefined
                });
            } catch (error) {
                this.logError('Failed to update agent metrics', createError({
                    message: error instanceof Error ? error.message : String(error),
                    type: ERROR_KINDS.SystemError,
                    metadata: createErrorMetadata({
                        component: this.constructor.name,
                        operation: 'isAgentBusy'
                    })
                }));
            }
            
            return isBusy;
        } catch (error) {
            this.logError('Failed to check agent status', createError({
                message: error instanceof Error ? error.message : String(error),
                type: ERROR_KINDS.AgentError,
                metadata: createErrorMetadata({
                    component: this.constructor.name,
                    operation: 'isAgentBusy'
                })
            }));
            return true; // Assume busy if we can't verify status
        }
    }

    /**
     * Handle workflow error with recovery
     */
    private async handleWorkflowError(workflowId: string, error: IBaseError): Promise<void> {
        // Create error context
        const errorContext: IErrorContext = {
            component: this.constructor.name,
            operation: 'handleWorkflowError',
            severity: ERROR_SEVERITY_enum.ERROR,
            details: {
                workflowId,
                errorType: error.type || ERROR_KINDS.ExecutionError
            },
            timestamp: Date.now(),
            recoverable: false,
            failureReason: error.message,
            recommendedAction: 'Check error logs'
        };

        // Log error using CoreManager's logging
        this.logError(`Workflow error: ${workflowId}`, error, errorContext);

        // Handle error through CoreManager
        await this.handleError(error, 'Workflow execution failed', error.type || ERROR_KINDS.ExecutionError);

        // Transition workflow to failed state using CoreManager's status management
        await this.handleStatusTransition({
            entity: 'workflow',
            entityId: workflowId,
            currentStatus: 'RUNNING' as keyof typeof WORKFLOW_STATUS_enum,
            targetStatus: 'FAILED' as keyof typeof WORKFLOW_STATUS_enum,
            context: {
                error,
                errorContext,
                failureReason: error.message,
                recommendedAction: 'Check error logs and attempt recovery'
            }
        });

        // Create base metadata for event
        const now = Date.now();
        const eventMetadata = {
            timestamp: now,
            component: this.constructor.name,
            operation: 'handleWorkflowError',
                    performance: {
                        component: 'WorkflowManager',
                        category: 'performance',
                        version: '1.0.0',
                        timestamp: now,
                        responseTime: { average: 0, min: 0, max: 0, total: 0 },
                        throughput: {
                            requestsPerSecond: 0,
                            bytesPerSecond: 0,
                            operationsPerSecond: 0,
                            dataProcessedPerSecond: 0
                        }
                    },
            context: {
                source: this.constructor.name,
                target: 'handleWorkflowError',
                correlationId: uuidv4(),
                causationId: uuidv4()
            },
            validation: {
                isValid: false,
                errors: [error.message],
                warnings: [],
                metadata: {
                    timestamp: now,
                    duration: 0,
                    validatorName: 'WorkflowValidator'
                }
            }
        };

        // Emit error event using CoreManager's event emission
        await this.emitEvent({
            id: uuidv4(),
            type: 'workflow_error',
            timestamp: now,
            metadata: {
                ...eventMetadata,
                workflowId,
                error,
                errorContext
            }
        });

        // Update metrics through CoreManager's metrics manager
        await this.getMetricsManager().trackMetric({
            domain: MetricDomain.WORKFLOW,
            type: MetricType.PERFORMANCE,
            value: 0,
            timestamp: now,
            metadata: {
                workflowId,
                error,
                success: false,
                errorContext
            }
        });
    }

    /**
     * Log informational messages
     */
    protected override logInfo(message: string): void {
        console.info(`[INFO] ${message}`);
    }

    /**
     * Log error messages
     */
    protected override logError(message: string, error: IBaseError, context?: IErrorContext): void {
        if (context) {
            console.error(`[ERROR] ${message}`, error, context);
        } else {
            console.error(`[ERROR] ${message}`, error);
        }
    }

    /**
     * Safely execute a function with error handling
     */
    protected override async safeExecute<T>(
        fn: () => Promise<T>,
        errorContext: string
    ): Promise<IHandlerResult<T>> {
        try {
            const result = await fn();
            const now = Date.now();
            return {
                success: true,
                data: result,
                metadata: {
                    component: this.constructor.name,
                    operation: errorContext,
                    timestamp: now,
                    performance: {
                        component: 'WorkflowManager',
                        category: 'performance',
                        version: '1.0.0',
                        timestamp: now,
                        responseTime: { average: 0, min: 0, max: 0, total: 0 },
                        throughput: {
                            requestsPerSecond: 0,
                            bytesPerSecond: 0,
                            operationsPerSecond: 0,
                            dataProcessedPerSecond: 0
                        }
                    },
                    context: {
                        source: this.constructor.name,
                        target: errorContext,
                        correlationId: uuidv4(),
                        causationId: uuidv4()
                    },
                    validation: {
                        isValid: true,
                        errors: [],
                        warnings: [],
                        metadata: {
                            timestamp: now,
                            duration: 0,
                            validatorName: 'WorkflowValidator'
                        }
                    }
                }
            };
        } catch (error) {
            const now = Date.now();
            const baseError = createError({
                message: error instanceof Error ? error.message : String(error),
                type: ERROR_KINDS.ExecutionError,
                metadata: createErrorMetadata({
                    component: this.constructor.name,
                    operation: errorContext
                })
            });
            this.logError(`Operation failed: ${errorContext}`, baseError);

            return {
                success: false,
                metadata: {
                    component: this.constructor.name,
                    operation: errorContext,
                    timestamp: now,
                    performance: {
                        component: 'WorkflowManager',
                        category: 'performance',
                        version: '1.0.0',
                        timestamp: now,
                        responseTime: { average: 0, min: 0, max: 0, total: 0 },
                        throughput: {
                            requestsPerSecond: 0,
                            bytesPerSecond: 0,
                            operationsPerSecond: 0,
                            dataProcessedPerSecond: 0
                        }
                    },
                    context: {
                        source: this.constructor.name,
                        target: errorContext,
                        correlationId: uuidv4(),
                        causationId: uuidv4()
                    },
                    validation: {
                        isValid: false,
                        errors: [baseError.message],
                        warnings: [],
                        metadata: {
                            timestamp: now,
                            duration: 0,
                            validatorName: 'WorkflowValidator'
                        }
                    },
                    error: baseError
                }
            };
        }
    }
}

export default WorkflowManager.getInstance();
