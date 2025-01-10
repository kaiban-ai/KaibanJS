/**
 * @file taskEventHandlers.ts
 * @path src/managers/domain/task/taskEventHandlers.ts
 * @description Event handlers for task-related events
 *
 * @module @managers/domain/task
 */

import { CoreManager } from '../../core/coreManager';
import { MANAGER_CATEGORY_enum } from '../../../types/common/enumTypes';
import { METRIC_DOMAIN_enum, METRIC_TYPE_enum } from '../../../types/metrics/base/metricEnums';
import type { IMetricEvent } from '../../../types/metrics/base/metricTypes';
import type { IStatusTransitionContext } from '../../../types/common/statusTypes';
import type {
    TaskEvent,
    ITaskCreatedEvent,
    ITaskUpdatedEvent,
    ITaskStatusChangedEvent,
    ITaskProgressUpdatedEvent,
    ITaskCompletedEvent,
    ITaskFailedEvent,
    ITaskErrorOccurredEvent,
    IEventHandler
} from '../../../types/task/taskEventTypes';
import { LogManager } from '../../core/logManager';
import { StatusManager } from '../../core/statusManager';
import { ErrorManager } from '../../core/errorManager';

// ─── Base Handler ────────────────────────────────────────────────────────────

abstract class BaseTaskEventHandler<T extends TaskEvent> extends CoreManager implements IEventHandler<T> {
    public readonly category = MANAGER_CATEGORY_enum.EXECUTION;
    protected readonly logManager: LogManager;
    protected readonly statusManager: StatusManager;
    protected readonly errorManager: ErrorManager;

    protected constructor() {
        super();
        this.logManager = LogManager.getInstance();
        this.statusManager = StatusManager.getInstance();
        this.errorManager = ErrorManager.getInstance();
    }

    abstract handle(event: T): Promise<void>;

    public async validate(): Promise<boolean> {
        return true;
    }

    protected async validateEvent(event: T): Promise<boolean> {
        return !!(event.id && event.timestamp && event.type && event.taskId && event.metadata);
    }

    protected async handleStatusTransition(params: IStatusTransitionContext): Promise<boolean> {
        return await this.statusManager.transition(params);
    }

    protected createTransitionContext(
        entityId: string,
        currentStatus: string,
        targetStatus: string,
        operation: string,
        phase: string
    ): IStatusTransitionContext {
        const startTime = Date.now();
        return {
            entity: 'task',
            entityId,
            currentStatus,
            targetStatus,
            operation,
            phase,
            startTime,
            duration: 0,
            metadata: {}
        };
    }

    protected async trackMetric(taskId: string, type: METRIC_TYPE_enum, value: number, metadata?: Record<string, unknown>): Promise<void> {
        const metric: IMetricEvent = {
            timestamp: Date.now(),
            domain: METRIC_DOMAIN_enum.TASK,
            type,
            value,
            metadata: {
                taskId,
                ...metadata
            }
        };

        await this.metricsManager.trackMetric(metric);
    }

    protected logInfo(message: string, context?: Record<string, unknown>): void {
        this.logManager.logEvent('TaskEventHandler', message, 'info', 'log', context);
    }

    protected logError(message: string, error: Error, context?: Record<string, unknown>): void {
        this.logManager.logEvent('TaskEventHandler', message, 'error', 'error', { ...context, error });
    }

    protected handleError(error: unknown, operation: string, errorType: string): void {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logError(`Error in ${operation}: ${errorMessage}`, error as Error);
        this.errorManager.handleError(error as Error);
    }
}

// ─── Task Creation Handler ────────────────────────────────────────────────────

export class TaskCreatedHandler extends BaseTaskEventHandler<ITaskCreatedEvent> {
    private static instance: TaskCreatedHandler;

    private constructor() {
        super();
    }

    public static getInstance(): TaskCreatedHandler {
        if (!TaskCreatedHandler.instance) {
            TaskCreatedHandler.instance = new TaskCreatedHandler();
        }
        return TaskCreatedHandler.instance;
    }

    async handle(event: ITaskCreatedEvent): Promise<void> {
        try {
            const { taskId, task } = event;
            this.logInfo(`Task ${taskId} created`);
            
            await this.trackMetric(taskId, METRIC_TYPE_enum.INITIALIZATION, 1, {
                operation: 'create',
                taskData: task
            });

            const transitionContext: IStatusTransitionContext = {
                entity: 'task',
                entityId: taskId,
                currentStatus: 'PENDING',
                targetStatus: 'TODO',
                operation: 'creation',
                phase: 'pre-execution',
                startTime: Date.now()
            };

            await this.handleStatusTransition(transitionContext);
        } catch (error) {
            this.handleError(error, 'TaskCreated', 'SystemError');
        }
    }
}

// ─── Task Update Handler ─────────────────────────────────────────────────────

export class TaskUpdatedHandler extends BaseTaskEventHandler<ITaskUpdatedEvent> {
    private static instance: TaskUpdatedHandler;

    private constructor() {
        super();
    }

    public static getInstance(): TaskUpdatedHandler {
        if (!TaskUpdatedHandler.instance) {
            TaskUpdatedHandler.instance = new TaskUpdatedHandler();
        }
        return TaskUpdatedHandler.instance;
    }

    async handle(event: ITaskUpdatedEvent): Promise<void> {
        try {
            const { taskId, previousState, newState } = event;
            this.logInfo(`Task ${taskId} updated`);
            
            await this.trackMetric(taskId, METRIC_TYPE_enum.STATE_TRANSITION, 1, {
                operation: 'update',
                previousState,
                newState
            });

            const transitionContext: IStatusTransitionContext = {
                entity: 'task',
                entityId: taskId,
                currentStatus: 'TODO',
                targetStatus: 'DOING',
                operation: 'update',
                phase: 'execution',
                startTime: Date.now()
            };

            await this.handleStatusTransition(transitionContext);
        } catch (error) {
            this.handleError(error, 'TaskUpdated', 'SystemError');
        }
    }
}

// ─── Task Status Change Handler ────────────────────────────────────────────────

export class TaskStatusChangedHandler extends BaseTaskEventHandler<ITaskStatusChangedEvent> {
    private static instance: TaskStatusChangedHandler;

    private constructor() {
        super();
    }

    public static getInstance(): TaskStatusChangedHandler {
        if (!TaskStatusChangedHandler.instance) {
            TaskStatusChangedHandler.instance = new TaskStatusChangedHandler();
        }
        return TaskStatusChangedHandler.instance;
    }

    async handle(event: ITaskStatusChangedEvent): Promise<void> {
        try {
            const { taskId, previousStatus, newStatus, reason = 'Status changed' } = event;
            this.logInfo(`Task ${taskId} status changed from ${previousStatus} to ${newStatus}: ${reason}`);

            await this.trackMetric(taskId, METRIC_TYPE_enum.STATE_TRANSITION, 1, {
                operation: 'statusChange',
                previousStatus,
                newStatus,
                reason
            });

            const transitionContext: IStatusTransitionContext = {
                entity: 'task',
                entityId: taskId,
                currentStatus: previousStatus,
                targetStatus: newStatus,
                operation: 'statusChange',
                phase: 'execution',
                startTime: Date.now()
            };

            await this.handleStatusTransition(transitionContext);
        } catch (error) {
            this.handleError(error, 'TaskStatusChanged', 'SystemError');
        }
    }
}

// ─── Task Progress Handler ───────────────────────────────────────────────────

export class TaskProgressUpdatedHandler extends BaseTaskEventHandler<ITaskProgressUpdatedEvent> {
    private static instance: TaskProgressUpdatedHandler;

    private constructor() {
        super();
    }

    public static getInstance(): TaskProgressUpdatedHandler {
        if (!TaskProgressUpdatedHandler.instance) {
            TaskProgressUpdatedHandler.instance = new TaskProgressUpdatedHandler();
        }
        return TaskProgressUpdatedHandler.instance;
    }

    async handle(event: ITaskProgressUpdatedEvent): Promise<void> {
        try {
            const { taskId, previousProgress, newProgress } = event;
            this.logInfo(`Task ${taskId} progress updated: ${newProgress}%`);
            
            await this.trackMetric(taskId, METRIC_TYPE_enum.PERFORMANCE, newProgress, {
                operation: 'progressUpdate',
                previousProgress,
                newProgress
            });

            const transitionContext: IStatusTransitionContext = {
                entity: 'task',
                entityId: taskId,
                currentStatus: 'TODO',
                targetStatus: 'DOING',
                operation: 'progress',
                phase: 'execution',
                startTime: Date.now()
            };

            await this.handleStatusTransition(transitionContext);
        } catch (error) {
            this.handleError(error, 'TaskProgressUpdated', 'SystemError');
        }
    }
}

// ─── Task Completion Handler ──────────────────────────────────────────────────

export class TaskCompletedHandler extends BaseTaskEventHandler<ITaskCompletedEvent> {
    private static instance: TaskCompletedHandler;

    private constructor() {
        super();
    }

    public static getInstance(): TaskCompletedHandler {
        if (!TaskCompletedHandler.instance) {
            TaskCompletedHandler.instance = new TaskCompletedHandler();
        }
        return TaskCompletedHandler.instance;
    }

    async handle(event: ITaskCompletedEvent): Promise<void> {
        try {
            const { taskId, outputs, duration } = event;
            this.logInfo(`Task ${taskId} completed in ${duration}ms`);
            
            await this.trackMetric(taskId, METRIC_TYPE_enum.SUCCESS, duration, {
                operation: 'complete',
                outputs
            });

            const transitionContext: IStatusTransitionContext = {
                entity: 'task',
                entityId: taskId,
                currentStatus: 'DOING',
                targetStatus: 'DONE',
                operation: 'completion',
                phase: 'post-execution',
                startTime: Date.now()
            };

            await this.handleStatusTransition(transitionContext);
        } catch (error) {
            this.handleError(error, 'TaskCompleted', 'SystemError');
        }
    }
}

// ─── Task Failed Handler ────────────────────────────────────────────────────────

export class TaskFailedHandler extends BaseTaskEventHandler<ITaskFailedEvent> {
    private static instance: TaskFailedHandler;

    private constructor() {
        super();
    }

    public static getInstance(): TaskFailedHandler {
        if (!TaskFailedHandler.instance) {
            TaskFailedHandler.instance = new TaskFailedHandler();
        }
        return TaskFailedHandler.instance;
    }

    async handle(event: ITaskFailedEvent): Promise<void> {
        try {
            const { taskId, error, context } = event;
            this.logError(`Task ${taskId} failed`, error);
            
            await this.trackMetric(taskId, METRIC_TYPE_enum.ERROR, 1, {
                operation: 'failure',
                error: error.message,
                context
            });

            const transitionContext: IStatusTransitionContext = {
                entity: 'task',
                entityId: taskId,
                currentStatus: 'ERROR',
                targetStatus: 'BLOCKED',
                operation: 'failure',
                phase: 'error',
                startTime: Date.now()
            };

            await this.handleStatusTransition(transitionContext);
        } catch (error) {
            this.handleError(error, 'TaskFailed', 'SystemError');
        }
    }
}

// ─── Task Error Handler ────────────────────────────────────────────────────────

export class TaskErrorOccurredHandler extends BaseTaskEventHandler<ITaskErrorOccurredEvent> {
    private static instance: TaskErrorOccurredHandler;

    private constructor() {
        super();
    }

    public static getInstance(): TaskErrorOccurredHandler {
        if (!TaskErrorOccurredHandler.instance) {
            TaskErrorOccurredHandler.instance = new TaskErrorOccurredHandler();
        }
        return TaskErrorOccurredHandler.instance;
    }

    async handle(event: ITaskErrorOccurredEvent): Promise<void> {
        try {
            const { taskId, error, context } = event;
            this.logError(`Task ${taskId} encountered error`, error);
            
            await this.trackMetric(taskId, METRIC_TYPE_enum.ERROR, 1, {
                operation: 'error',
                error: error.message,
                context,
                recoverable: await this.assessError(error)
            });

            const transitionContext: IStatusTransitionContext = {
                entity: 'task',
                entityId: taskId,
                currentStatus: 'ERROR',
                targetStatus: 'REVISE',
                operation: 'errorTransition',
                phase: 'error',
                startTime: Date.now()
            };

            await this.handleStatusTransition(transitionContext);
        } catch (error) {
            this.handleError(error, 'TaskErrorOccurred', 'SystemError');
        }
    }

    private async assessError(error: Error): Promise<boolean> {
        const recoveryPatterns = [
            'timeout',
            'rate limit',
            'temporary',
            'retry'
        ];
        return recoveryPatterns.some(pattern => 
            error.message.toLowerCase().includes(pattern)
        );
    }
}

// ─── Handler Registry ─────────────────────────────────────────────────────────

export const taskEventHandlers = new Map<string, IEventHandler<TaskEvent>>([
    ['TASK_CREATED', TaskCreatedHandler.getInstance()],
    ['TASK_UPDATED', TaskUpdatedHandler.getInstance()],
    ['TASK_STATUS_CHANGED', TaskStatusChangedHandler.getInstance()],
    ['TASK_PROGRESS_UPDATED', TaskProgressUpdatedHandler.getInstance()],
    ['TASK_COMPLETED', TaskCompletedHandler.getInstance()],
    ['TASK_ERROR_OCCURRED', TaskErrorOccurredHandler.getInstance()],
    ['TASK_FAILED', TaskFailedHandler.getInstance()]
]) as ReadonlyMap<string, IEventHandler<TaskEvent>>;

export default taskEventHandlers;
