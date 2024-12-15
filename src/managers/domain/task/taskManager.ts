/**
 * @file taskManager.ts
 * @path src/managers/domain/task/taskManager.ts
 * @description Primary Task Domain Manager implementation
 */

import { CoreManager } from '../../core/coreManager';
import { MANAGER_CATEGORY_enum, TASK_STATUS_enum, BATCH_PRIORITY_enum } from '../../../types/common/enumTypes';
import { MetricDomain, MetricType } from '../../../types/metrics/base/metricsManagerTypes';
import { createBaseMetadata } from '../../../types/common/baseTypes';
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
    ITaskProgress
} from '../../../types/task';

/**
 * Task Manager
 * Manages task lifecycle, execution, and metrics
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

    public async executeTask(params: ITaskExecutionParams): Promise<ITaskHandlerResult<unknown>> {
        const { task, agent, input, metadata = {}, options = {} } = params;

        const result = await this.safeExecute(async () => {
            const validationResult = await this.validator.validateTask(task);
            if (!validationResult.isValid) {
                await this.taskEventEmitter.emitTaskValidationCompleted({
                    taskId: task.id,
                    validationResult
                });
                throw new Error(validationResult.errors.join(', '));
            }

            await this.initializeTask(task);

            // Track task metrics
            await this.metricsManager.trackMetric({
                domain: MetricDomain.TASK,
                type: MetricType.PERFORMANCE,
                value: 1,
                timestamp: Date.now(),
                metadata: {
                    taskId: task.id,
                    agentId: agent.id,
                    operation: 'executeTask',
                    priority: task.priority.toString()
                }
            });

            if (options.timeout) {
                this.setupTaskTimeout(task.id, options.timeout);
            }

            const executionResult = await this.executor.executeTask(task, input);

            await this.taskEventEmitter.emitTaskCompleted({
                taskId: task.id,
                outputs: { result: executionResult },
                duration: Date.now() - task.metrics.startTime
            });

            return {
                success: true,
                data: executionResult.data,
                metadata: this.createTaskMetadata(task)
            };

        }, 'Failed to execute task');

        // Ensure we never return undefined
        if (!result.success || !result.data) {
            return {
                success: false,
                metadata: this.createTaskMetadata(task)
            };
        }

        return result.data;
    }

    private async initializeTask(task: ITaskType): Promise<void> {
        const result = await this.safeExecute(async () => {
            await this.taskEventEmitter.emitTaskCreated({
                taskId: task.id,
                task: {
                    title: task.title,
                    description: task.description,
                    priority: task.priority
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
        }, 'Failed to initialize task');

        if (!result.success) {
            throw result.metadata.error;
        }
    }

    private async cleanupTask(taskId: string): Promise<void> {
        const result = await this.safeExecute(async () => {
            const task = this.activeTasks.get(taskId);
            if (task) {
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
            }
            this.activeTasks.delete(taskId);
            this.clearTaskTimeout(taskId);
        }, 'Failed to cleanup task');

        if (!result.success) {
            throw result.metadata.error;
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

        await this.safeExecute(async () => {
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
                        error: 'Task execution timeout'
                    }
                }
            });

            await this.taskEventEmitter.emitTaskErrorOccurred({
                taskId: task.id,
                error: new Error('Task execution timeout'),
                context: {
                    operation: 'executeTask',
                    state: {
                        id: task.id,
                        status: task.status,
                        metrics: task.metrics
                    }
                }
            });
        }, 'Failed to handle task timeout');
    }

    /**
     * Emit task feedback added event
     */
    public async emitTaskFeedbackAdded(params: { taskId: string; feedback: ITaskFeedback }): Promise<void> {
        await this.taskEventEmitter.emitTaskFeedbackAdded(params);
    }

    public getTask(taskId: string): ITaskType | undefined {
        return this.activeTasks.get(taskId);
    }

    public getActiveTaskCount(): number {
        return this.activeTasks.size;
    }

    public cleanup(): void {
        this.activeTasks.clear();
        this.taskTimeouts.forEach(clearTimeout);
        this.taskTimeouts.clear();
        this.taskEventEmitter.cleanup();
    }
}

export default TaskManager.getInstance();
