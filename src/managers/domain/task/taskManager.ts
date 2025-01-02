/**
 * @file taskManager.ts
 * @path src/managers/domain/task/taskManager.ts
 * @description Primary Task Domain Manager implementation with enhanced error recovery
 */

import { CoreManager } from '../../core/coreManager';
import { 
    MANAGER_CATEGORY_enum, 
    TASK_STATUS_enum,
    BATCH_PRIORITY_enum
} from '../../../types/common/enumTypes';
import { MetricDomain, MetricType } from '../../../types/metrics/base/metricsManagerTypes';
import { createBaseMetadata } from '../../../types/common/baseTypes';
import { ERROR_KINDS, createError, createErrorMetadata } from '../../../types/common/errorTypes';
import { TaskExecutor } from './taskExecutor';
import { TaskValidator } from './taskValidator';
import { TaskEventEmitter } from './taskEventEmitter';
import { taskEventHandlers } from './taskEventHandlers';

import type { 
    ITaskType,
    ITaskFeedback,
    ITaskHandlerResult,
    ITaskExecutionParams,
    ITaskHandlerMetadata,
    ITaskProgress,
    ITaskValidationResult
} from '../../../types/task';
import type { IWorkflowTaskType } from '../../../types/workflow/workflowTaskTypes';

/**
 * Task Manager
 * Manages task lifecycle, execution, and metrics with enhanced error recovery
 */
export class TaskManager extends CoreManager {
    private static instance: TaskManager;
    private readonly activeTasks: Map<string, ITaskType>;
    private readonly taskTimeouts: Map<string, NodeJS.Timeout>;
    private readonly executor: TaskExecutor;
    private readonly validator: TaskValidator;
    private readonly taskEventEmitter: TaskEventEmitter;
    public readonly category = MANAGER_CATEGORY_enum.EXECUTION;

    private constructor() {
        super();
        this.activeTasks = new Map();
        this.taskTimeouts = new Map();
        this.executor = new TaskExecutor();
        this.validator = new TaskValidator();
        this.taskEventEmitter = TaskEventEmitter.getInstance();
        this.registerDomainManager('TaskManager', this);
        this.registerEventHandlers();
    }

    public static getInstance(): TaskManager {
        if (!TaskManager.instance) {
            TaskManager.instance = new TaskManager();
        }
        return TaskManager.instance;
    }

    /**
     * Initialize the task manager
     * Implements IBaseManager initialize method
     */
    public async initialize(params?: Record<string, unknown>): Promise<void> {
        this.logInfo('Initializing task manager', { params });
        await super.initialize(params);
        
        // Additional task manager specific initialization
        await this.handleStatusTransition({
            entity: 'task',
            entityId: this.constructor.name,
            currentStatus: TASK_STATUS_enum.PENDING,
            targetStatus: TASK_STATUS_enum.TODO,
            context: {
                component: this.constructor.name,
                operation: 'initialize',
                metadata: createBaseMetadata(this.constructor.name, 'initialize'),
                params
            }
        });
    }

    private registerEventHandlers(): void {
        taskEventHandlers.forEach((handler, eventType) => {
            this.eventEmitter.on(eventType, handler);
        });
    }


    private createTaskMetadata(task: ITaskType): ITaskHandlerMetadata {
        const taskProgress: ITaskProgress = task.progress || {
            status: task.status,
            progress: 0,
            timeElapsed: 0
        };

        const baseMetadata = createBaseMetadata(this.constructor.name, 'executeTask');

        return {
            ...baseMetadata,
            taskId: task.id,
            taskName: task.title,
            status: task.status,
            priority: task.priority,
            assignedAgent: task.agent?.id || '',
            progress: taskProgress.progress,
            metrics: {
                resources: task.metrics.resources,
                usage: task.metrics.usage,
                performance: task.metrics.performance
            },
            dependencies: {
                completed: [],
                pending: [],
                blocked: []
            }
        };
    }

    private getPriorityValue(priority: BATCH_PRIORITY_enum): number {
        switch (priority) {
            case BATCH_PRIORITY_enum.HIGH:
                return 3;
            case BATCH_PRIORITY_enum.MEDIUM:
                return 2;
            case BATCH_PRIORITY_enum.LOW:
                return 1;
            default:
                return 0;
        }
    }

    /**
     * Execute task
     */
    public async executeTask(task: ITaskType): Promise<ITaskHandlerResult> {
        this.logInfo('Executing task', { taskId: task.id });
        
        const params: ITaskExecutionParams = {
            task,
            agent: task.agent,
            input: task.inputs,
            metadata: {},
            options: {}
        };
        return this.executeTaskInternal(params);
    }

    private async executeTaskInternal(params: ITaskExecutionParams): Promise<ITaskHandlerResult> {
        const { task, agent, input, metadata = {}, options = {} } = params;

        const result = await this.safeExecute(async () => {
            const validationResult = await this.validator.validateTask(task);
            if (!validationResult.isValid) {
                const error = createError({
                    message: validationResult.errors.join(', '),
                    type: ERROR_KINDS.ValidationError,
                    metadata: {
                        ...createErrorMetadata({
                            component: this.constructor.name,
                            operation: 'validateTask'
                        }),
                        taskMetadata: metadata // Include task metadata in error
                    }
                });

                await this.emitTaskValidationCompleted({
                    taskId: task.id,
                    validationResult,
                });

                throw error;
            }

            await this.initializeTask(task);

            // Track task metrics with metadata
            await this.metricsManager.trackMetric({
                domain: MetricDomain.TASK,
                type: MetricType.PERFORMANCE,
                value: 1,
                timestamp: Date.now(),
                metadata: {
                    ...metadata, // Include task execution metadata
                    taskId: task.id,
                    agentId: agent.id,
                    operation: 'executeTask',
                    priority: this.getPriorityValue(task.priority)
                }
            });

            if (options.timeout) {
                this.setupTaskTimeout(task.id, options.timeout);
            }

            const executionResult = await this.executor.executeTask(task, input);

            await this.emitTaskCompleted({
                taskId: task.id,
                outputs: { result: executionResult },
                duration: Date.now() - task.metrics.startTime,
            });

            return {
                success: true,
                data: executionResult.data,
                metadata: {
                    ...this.createTaskMetadata(task),
                    executionMetadata: metadata // Include execution metadata in result
                }
            };

        }, 'executeTask');

        if (!result.success) {
            const error = result.metadata.error as Error;
            const errorContext = await this.createErrorContext('executeTask', {
                taskId: task.id,
                taskStatus: task.status,
                agentId: task?.agent?.id
            });
            
            // Track error metrics
            const enhancedError = createError({
                message: error instanceof Error ? error.message : String(error),
                type: ERROR_KINDS.ExecutionError,
                context: errorContext,
                metadata: {
                    taskId: task.id,
                    operation: 'executeTask'
                }
            });

            await this.metricsManager.trackMetric({
                domain: MetricDomain.TASK,
                type: MetricType.ERROR,
                value: 1,
                timestamp: Date.now(),
                metadata: {
                    taskId: task.id,
                    errorType: ERROR_KINDS.ExecutionError,
                    errorMessage: enhancedError.message,
                    operation: 'executeTask',
                    context: errorContext
                }
            });

            await this.handleError(enhancedError, 'Failed to execute task', ERROR_KINDS.ExecutionError);
        }

        return {
            success: result.success,
            data: result.data,
            metadata: this.createTaskMetadata(task)
        };
    }

    private async initializeTask(task: ITaskType): Promise<void> {
        const result = await this.safeExecute(async () => {
            await this.taskEventEmitter.emitTaskCreated({
                taskId: task.id,
                task: {
                    title: task.title,
                    description: task.description,
                    priority: this.getPriorityValue(task.priority)
                }
            });

            const previousStatus = task.status;
            const newStatus = TASK_STATUS_enum.TODO;

            await this.handleStatusTransition({
                entity: 'task',
                entityId: task.id,
                currentStatus: previousStatus,
                targetStatus: newStatus,
                context: {
                    component: this.constructor.name,
                    operation: 'initializeTask',
                    metadata: {
                        task,
                        agent: task.agent
                    }
                }
            });

            this.activeTasks.set(task.id, task);

            await this.taskEventEmitter.emitTaskStatusChanged({
                taskId: task.id,
                previousStatus,
                newStatus,
                reason: 'Task initialization'
            });
        }, 'initializeTask');

        if (!result.success) {
            const error = result.metadata.error as Error;
            await this.handleError(error, 'Failed to initialize task', ERROR_KINDS.InitializationError);
            throw error;
        }
    }

    private async cleanupTask(taskId: string): Promise<void> {
        const task = this.activeTasks.get(taskId);
        if (!task) return;

        const result = await this.safeExecute(async () => {
            await this.taskEventEmitter.emitTaskDeleted({
                taskId,
                finalState: {
                    id: task.id,
                    title: task.title,
                    description: task.description,
                    status: task.status,
                    metrics: task.metrics
                }
            });
            this.activeTasks.delete(taskId);
            this.clearTaskTimeout(taskId);
        }, 'cleanupTask');

        if (!result.success) {
            const error = result.metadata.error as Error;
            await this.handleError(error, 'Failed to cleanup task', ERROR_KINDS.ResourceError);
            throw error;
        }
    }

    private setupTaskTimeout(taskId: string, timeout: number): void {
        const timeoutTimer = setTimeout(() => {
            this.handleTaskTimeout(taskId);
        }, timeout);
        this.taskTimeouts.set(taskId, timeoutTimer);
    }

    private clearTaskTimeout(taskId: string): void {
        const timeout = this.taskTimeouts.get(taskId);
        if (timeout) {
            clearTimeout(timeout);
            this.taskTimeouts.delete(taskId);
        }
    }

    private async handleTaskTimeout(taskId: string): Promise<void> {
        const task = this.activeTasks.get(taskId);
        if (!task) return;

        const result = await this.safeExecute(async () => {
            const errorContext = await this.createErrorContext('handleTaskTimeout', {
                taskId: task.id,
                taskStatus: task.status,
                agentId: task.agent?.id
            });

            const error = createError({
                message: 'Task execution timeout',
                type: ERROR_KINDS.TimeoutError,
                context: errorContext,
                metadata: {
                    ...createErrorMetadata({
                        component: this.constructor.name,
                        operation: 'handleTaskTimeout'
                    }),
                    taskId: task.id
                }
            });

            // Track error metrics
            await this.metricsManager.trackMetric({
                domain: MetricDomain.TASK,
                type: MetricType.ERROR,
                value: 1,
                timestamp: Date.now(),
                metadata: {
                    taskId: task.id,
                    errorType: ERROR_KINDS.TimeoutError,
                    errorMessage: error.message,
                    operation: 'handleTaskTimeout',
                    context: errorContext
                }
            });

            await this.handleStatusTransition({
                entity: 'task',
                entityId: taskId,
                currentStatus: task.status,
                targetStatus: TASK_STATUS_enum.ERROR,
                context: {
                    component: this.constructor.name,
                    operation: 'handleTaskTimeout',
                    metadata: {
                        task,
                        error: errorContext
                    }
                }
            });

            await this.taskEventEmitter.emitTaskErrorOccurred({
                taskId: task.id,
                error,
                context: {
                    operation: 'executeTask',
                    state: {
                        id: task.id,
                        status: task.status,
                        metrics: task.metrics
                    }
                }
            });

            await this.handleError(error, 'Task execution timeout', ERROR_KINDS.TimeoutError);
        }, 'handleTaskTimeout');

        if (!result.success) {
            const error = result.metadata.error as Error;
            await this.handleError(error, 'Failed to handle task timeout', ERROR_KINDS.SystemError);
        }
    }

    /**
     * Emit task feedback added event
     */
    public async emitTaskFeedbackAdded(params: { taskId: string; feedback: ITaskFeedback }): Promise<void> {
        await this.taskEventEmitter.emitTaskFeedbackAdded(params);
    }

    /**
     * Get task by ID
     */
    public getTask(taskId: string): ITaskType | undefined {
        return this.activeTasks.get(taskId);
    }

    /**
     * Get tasks by agent ID
     */
    public async getAgentTasks(agentId: string): Promise<ITaskType[]> {
        return Array.from(this.activeTasks.values())
            .filter(task => task.agent?.id === agentId);
    }

    /**
     * Get workflow tasks
     */
    public async getWorkflowTasks(workflowId: string): Promise<ITaskType[]> {
        return Array.from(this.activeTasks.values())
            .filter(task => this.isWorkflowTask(task) && task.workflowId === workflowId);
    }

    private isWorkflowTask(task: ITaskType): task is IWorkflowTaskType {
        return 'workflowId' in task && typeof (task as IWorkflowTaskType).workflowId === 'string';
    }

    /**
     * Update task status
     */
    public async updateTaskStatus(taskId: string, status: TASK_STATUS_enum): Promise<void> {
        const task = this.activeTasks.get(taskId);
        if (!task) {
            throw createError({
                message: `Task not found: ${taskId}`,
                type: ERROR_KINDS.NotFoundError,
                metadata: createErrorMetadata({
                    component: this.constructor.name,
                    operation: 'updateTaskStatus'
                })
            });
        }

        await this.handleStatusTransition({
            entity: 'task',
            entityId: taskId,
            currentStatus: task.status,
            targetStatus: status,
            context: {
                component: this.constructor.name,
                operation: 'updateTaskStatus',
                metadata: {
                    taskId,
                    previousStatus: task.status,
                    newStatus: status
                }
            }
        });

        // Track status change in metrics
        await this.metricsManager.trackMetric({
            domain: MetricDomain.TASK,
            type: MetricType.PERFORMANCE,
            value: 1,
            timestamp: Date.now(),
            metadata: {
                taskId,
                previousStatus: task.status,
                newStatus: status,
                operation: 'updateTaskStatus'
            }
        });
    }

    /**
     * Handle task error
     */
    public async handleTaskError(task: ITaskType, originalError: Error): Promise<void> {
        const errorContext = await this.createErrorContext('handleTaskError', {
            taskId: task.id,
            taskStatus: task.status,
            agentId: task.agent?.id
        });

        const enhancedError = createError({
            message: originalError.message,
            type: ERROR_KINDS.ExecutionError,
            context: errorContext,
            metadata: {
                ...createErrorMetadata({
                    component: this.constructor.name,
                    operation: 'handleTaskError'
                }),
                taskId: task.id,
                originalError
            }
        });

        // Track error metrics
        await this.metricsManager.trackMetric({
            domain: MetricDomain.TASK,
            type: MetricType.ERROR,
            value: 1,
            timestamp: Date.now(),
            metadata: {
                taskId: task.id,
                errorType: ERROR_KINDS.ExecutionError,
                errorMessage: enhancedError.message,
                operation: 'handleTaskError',
                context: errorContext
            }
        });

        await this.handleStatusTransition({
            entity: 'task',
            entityId: task.id,
            currentStatus: task.status,
            targetStatus: TASK_STATUS_enum.ERROR,
            context: {
                component: this.constructor.name,
                operation: 'handleTaskError',
                metadata: {
                    task,
                    error: errorContext
                }
            }
        });

        await this.taskEventEmitter.emitTaskErrorOccurred({
            taskId: task.id,
            error: enhancedError,
            context: {
                operation: 'handleTaskError',
                state: {
                    id: task.id,
                    status: task.status,
                    metrics: task.metrics
                }
            }
        });

        await this.handleError(enhancedError, 'Task error occurred', ERROR_KINDS.ExecutionError);
    }

    public getActiveTaskCount(): number {
        return this.activeTasks.size;
    }

    public cleanup(): void {
        // Use cleanupTask for each active task before clearing the map
        const cleanupPromises = Array.from(this.activeTasks.keys()).map(taskId => 
            this.cleanupTask(taskId).catch(error => {
                this.logError('Failed to cleanup task', error instanceof Error ? error : new Error(String(error)), {
                    taskId,
                    operation: 'cleanup'
                });
            })
        );

        // Wait for all cleanup operations to complete
        Promise.all(cleanupPromises).then(() => {
            this.activeTasks.clear();
            this.taskTimeouts.forEach(clearTimeout);
            this.taskTimeouts.clear();
            this.taskEventEmitter.cleanup();
        }).catch(error => {
            this.logError('Failed to cleanup tasks', error instanceof Error ? error : new Error(String(error)));
        });
    }

    /**
     * Emit task validation completed event
     */
    private async emitTaskValidationCompleted(params: {
        taskId: string;
        validationResult: ITaskValidationResult;
    }): Promise<void> {
        await this.taskEventEmitter.emitTaskValidationCompleted({
            taskId: params.taskId,
            validationResult: params.validationResult
        });
    }

    /**
     * Emit task completed event
     */
    private async emitTaskCompleted(params: {
        taskId: string;
        outputs: { result: unknown };
        duration: number;
    }): Promise<void> {
        await this.taskEventEmitter.emitTaskCompleted({
            taskId: params.taskId,
            outputs: params.outputs,
            duration: params.duration
        });
    }
}

export default TaskManager.getInstance();
