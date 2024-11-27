/**
 * @file taskManager.ts
 * @path src/managers/domain/task/taskManager.ts
 * @description Primary Task Domain Manager implementation
 *
 * @module @managers/domain/task
 */

import { CoreManager } from '../../core/coreManager';
import { createError } from '../../../types/common/commonErrorTypes';
import { TASK_STATUS_enum } from '../../../types/common/commonEnums';
import { createBaseMetadata } from '../../../types/common/commonMetadataTypes';
import { TaskExecutor } from './taskExecutor';
import { TaskValidator } from './taskValidator';
import { TaskMetricsManager } from './taskMetricsManager';
import { TaskEventEmitter } from './taskEventEmitter';
import { taskEventHandlers } from './taskEventHandlers';

import type { ITaskType } from '../../../types/task/taskBaseTypes';
import type { 
    ITaskHandlerResult,
    ITaskHandlerMetadata
} from '../../../types/task/taskHandlerTypes';
import type { ITaskExecutionParams } from '../../../types/task/taskHandlersTypes';
import type { IStatusTransitionContext } from '../../../types/common/commonStatusTypes';

// ─── Manager Implementation ───────────────────────────────────────────────────

export class TaskManager extends CoreManager {
    private static instance: TaskManager;
    private readonly activeTasks: Map<string, ITaskType>;
    private readonly taskTimeouts: Map<string, NodeJS.Timeout>;
    private readonly executor: TaskExecutor;
    private readonly validator: TaskValidator;
    private readonly metricsManager: TaskMetricsManager;
    private readonly eventEmitter: TaskEventEmitter;

    private constructor() {
        super();
        this.activeTasks = new Map();
        this.taskTimeouts = new Map();
        this.executor = new TaskExecutor();
        this.validator = new TaskValidator();
        this.metricsManager = new TaskMetricsManager();
        this.eventEmitter = TaskEventEmitter.getInstance();
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

    public async executeTask(params: ITaskExecutionParams): Promise<ITaskHandlerResult<unknown>> {
        const { task, agent, input, metadata = {}, options = {} } = params;

        const validationResult = await this.validator.validateTask(task);
        if (!validationResult.isValid) {
            await this.eventEmitter.emitTaskValidationCompleted({
                taskId: task.id,
                validationResult: {
                    valid: false,
                    errors: validationResult.errors,
                    warnings: validationResult.warnings
                }
            });

            throw createError({
                message: validationResult.errors.join(', '),
                type: 'ValidationError',
                context: validationResult.context
            });
        }

        await this.initializeTask(task);
        this.metricsManager.initializeMetrics(task.id);

        if (options.timeout) {
            this.setupTaskTimeout(task.id, options.timeout);
        }

        try {
            const result = await this.executor.executeTask(task, input);
            const metrics = await this.metricsManager.updateMetrics(task.id, {
                startTime: task.metrics.startTime,
                endTime: task.metrics.endTime,
                duration: task.metrics.duration,
                iterationCount: task.metrics.iterationCount,
                resources: task.metrics.resources,
                performance: task.metrics.performance,
                costs: task.metrics.costs,
                llmUsage: task.metrics.llmUsage
            });

            await this.eventEmitter.emitTaskCompleted({
                taskId: task.id,
                result,
                duration: metrics.duration
            });

            return {
                success: true,
                data: result.data,
                metadata: result.metadata
            };

        } catch (error) {
            await this.handleTaskError(task, error as Error);
            throw error;
        } finally {
            this.clearTaskTimeout(task.id);
            await this.cleanupTask(task.id);
        }
    }

    private async initializeTask(task: ITaskType): Promise<void> {
        const metrics = this.metricsManager.getMetrics(task.id);
        if (!metrics) {
            throw createError({
                message: `No metrics found for task ${task.id}`,
                type: 'SystemError'
            });
        }

        await this.eventEmitter.emitTaskCreated({
            taskId: task.id,
            task
        });

        const previousStatus = task.status;
        const newStatus = TASK_STATUS_enum.TODO;

        const transitionContext: IStatusTransitionContext = {
            entity: 'task',
            entityId: task.id,
            currentStatus: previousStatus,
            targetStatus: newStatus,
            operation: 'initializeTask',
            phase: 'pre-execution',
            startTime: Date.now(),
            resourceMetrics: metrics.resources,
            performanceMetrics: metrics.performance,
            task,
            agent: task.agent
        };

        await this.statusManager.transition(transitionContext);
        this.activeTasks.set(task.id, task);

        await this.eventEmitter.emitTaskStatusChanged({
            taskId: task.id,
            previousStatus,
            newStatus,
            reason: 'Task initialization'
        });
    }

    private async cleanupTask(taskId: string): Promise<void> {
        const task = this.activeTasks.get(taskId);
        if (task) {
            await this.eventEmitter.emitTaskDeleted({
                taskId,
                finalState: task
            });
        }
        this.activeTasks.delete(taskId);
        this.clearTaskTimeout(taskId);
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

        const error = createError({
            message: 'Task execution timeout',
            type: 'TaskError',
            context: { taskId, taskTitle: task.title }
        });

        await this.handleTaskError(task, error);
    }

    private async handleTaskError(task: ITaskType, error: Error): Promise<void> {
        // First emit error occurred event
        await this.eventEmitter.emitTaskErrorOccurred({
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

        task.error = new Error(error.message);
        const previousStatus = task.status;
        task.status = TASK_STATUS_enum.ERROR;
        task.metrics.endTime = Date.now();
        task.metrics.duration = task.metrics.endTime - task.metrics.startTime;

        const metrics = this.metricsManager.getMetrics(task.id);
        if (!metrics) {
            throw createError({
                message: `No metrics found for task ${task.id}`,
                type: 'SystemError'
            });
        }

        const transitionContext: IStatusTransitionContext = {
            entity: 'task',
            entityId: task.id,
            currentStatus: previousStatus,
            targetStatus: TASK_STATUS_enum.ERROR,
            operation: 'handleTaskError',
            phase: 'error',
            startTime: Date.now(),
            resourceMetrics: metrics.resources,
            performanceMetrics: metrics.performance,
            task,
            agent: task.agent,
            errorContext: {
                error: createError({
                    message: error.message,
                    type: 'TaskError',
                    context: { taskId: task.id }
                }),
                recoverable: false,
                retryCount: 0,
                failureReason: error.message
            }
        };

        await this.statusManager.transition(transitionContext);

        // Emit status change event
        await this.eventEmitter.emitTaskStatusChanged({
            taskId: task.id,
            previousStatus,
            newStatus: TASK_STATUS_enum.ERROR,
            reason: error.message
        });

        // Finally emit task failed event
        await this.eventEmitter.emitTaskFailed({
            taskId: task.id,
            error,
            context: {
                operation: 'executeTask',
                state: {
                    id: task.id,
                    status: TASK_STATUS_enum.ERROR,
                    metrics: task.metrics
                }
            }
        });
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
        this.metricsManager.cleanup();
        this.eventEmitter.cleanup();
    }
}

export default TaskManager.getInstance();
