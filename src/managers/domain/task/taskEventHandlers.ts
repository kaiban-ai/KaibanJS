/**
 * @file taskEventHandlers.ts
 * @path src/managers/domain/task/taskEventHandlers.ts
 * @description Event handlers for task-related events
 *
 * @module @managers/domain/task
 */

import { CoreManager } from '../../core/coreManager';
import { TASK_EVENT_TYPE_enum, TASK_STATUS_enum } from '../../../types/common/commonEnums';
import { MetadataTypeGuards } from '../../../types/common/commonTypeGuards';
import { 
    createValidationResult, 
    createValidationMetadata,
    IValidationResult,
    ValidationErrorType,
    ValidationWarningType
} from '../../../types/common/commonValidationTypes';
import { createError } from '../../../types/common/commonErrorTypes';
import { MetricDomain, MetricType } from '../../../types/metrics/base/metricsManagerTypes';

import type { 
    TaskEvent,
    ITaskCreatedEvent,
    ITaskUpdatedEvent,
    ITaskStatusChangedEvent,
    ITaskProgressUpdatedEvent,
    ITaskCompletedEvent,
    ITaskFailedEvent,
    ITaskErrorOccurredEvent
} from '../../../types/task/taskEventTypes';
import type { IEventHandler } from '../../../types/common/commonEventTypes';
import type { IStatusTransitionContext } from '../../../types/common/commonStatusTypes';

// ─── Base Handler ────────────────────────────────────────────────────────────

abstract class BaseTaskEventHandler<T extends TaskEvent> extends CoreManager implements IEventHandler<T> {
    protected constructor() {
        super();
        this.registerDomainManager('TaskEventHandler', this);
    }

    abstract handle(event: T): Promise<void>;

    async validate(event: T): Promise<IValidationResult<unknown>> {
        const startTime = Date.now();
        const errors: ValidationErrorType[] = [];
        const warnings: ValidationWarningType[] = [];

        if (!event.id || typeof event.id !== 'string') {
            errors.push({
                code: 'INVALID_ID',
                message: 'Invalid event ID'
            });
        }
        if (!event.timestamp || typeof event.timestamp !== 'number') {
            errors.push({
                code: 'INVALID_TIMESTAMP',
                message: 'Invalid event timestamp'
            });
        }
        if (!event.type || !Object.values(TASK_EVENT_TYPE_enum).includes(event.type)) {
            errors.push({
                code: 'INVALID_TYPE',
                message: 'Invalid event type'
            });
        }
        if (!event.taskId || typeof event.taskId !== 'string') {
            errors.push({
                code: 'INVALID_TASK_ID',
                message: 'Invalid task ID'
            });
        }
        if (!MetadataTypeGuards.isBaseHandlerMetadata(event.metadata)) {
            errors.push({
                code: 'INVALID_METADATA',
                message: 'Invalid event metadata'
            });
        }

        return createValidationResult({
            isValid: errors.length === 0,
            errors,
            warnings,
            metadata: createValidationMetadata({
                component: 'TaskEventHandler',
                operation: 'validate',
                validatedFields: ['id', 'timestamp', 'type', 'taskId', 'metadata']
            })
        });
    }

    protected async handleStatusTransition(params: IStatusTransitionContext): Promise<boolean> {
        return await this.statusManager.transition(params);
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
            
            await this.initializeResources(taskId, task);
            await this.initializeMetrics(taskId);
            await this.logCreation(taskId, task);

            const transitionContext: IStatusTransitionContext = {
                entity: 'task',
                entityId: taskId,
                currentStatus: TASK_STATUS_enum.PENDING,
                targetStatus: TASK_STATUS_enum.TODO,
                operation: 'creation',
                phase: 'pre-execution',
                startTime: Date.now(),
                resourceMetrics: await this.getMetricsManager().getInitialResourceMetrics(),
                performanceMetrics: await this.getMetricsManager().getInitialPerformanceMetrics()
            };

            await this.handleStatusTransition(transitionContext);
        } catch (error) {
            this.handleError(error, 'TaskCreated', 'SystemError');
        }
    }

    private async initializeResources(taskId: string, task: unknown): Promise<void> {
        this.logDebug(`Initializing resources for task ${taskId}`);
        const metrics = await this.getMetricsManager().getInitialResourceMetrics();
        await this.getMetricsManager().trackMetric({
            domain: MetricDomain.TASK,
            type: MetricType.RESOURCE,
            value: JSON.stringify(metrics),
            timestamp: Date.now(),
            metadata: { taskId, operation: 'initialize' }
        });
    }

    private async initializeMetrics(taskId: string): Promise<void> {
        this.logDebug(`Initializing metrics for task ${taskId}`);
        const metrics = await this.getMetricsManager().getInitialPerformanceMetrics();
        await this.getMetricsManager().trackMetric({
            domain: MetricDomain.TASK,
            type: MetricType.PERFORMANCE,
            value: JSON.stringify(metrics),
            timestamp: Date.now(),
            metadata: { taskId, operation: 'initialize' }
        });
    }

    private async logCreation(taskId: string, task: unknown): Promise<void> {
        this.logDebug(`Logging creation of task ${taskId}`);
        this.logManager.info(`Task ${taskId} created with initial state`, null, taskId);
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
            
            await this.trackChanges(taskId, previousState, newState);
            await this.updateMetrics(taskId);
            await this.logUpdate(taskId, previousState, newState);

            const transitionContext: IStatusTransitionContext = {
                entity: 'task',
                entityId: taskId,
                currentStatus: TASK_STATUS_enum.TODO,
                targetStatus: TASK_STATUS_enum.DOING,
                operation: 'update',
                phase: 'execution',
                startTime: Date.now(),
                resourceMetrics: await this.getMetricsManager().getInitialResourceMetrics(),
                performanceMetrics: await this.getMetricsManager().getInitialPerformanceMetrics()
            };

            await this.handleStatusTransition(transitionContext);
        } catch (error) {
            this.handleError(error, 'TaskUpdated', 'SystemError');
        }
    }

    private async trackChanges(taskId: string, previousState: unknown, newState: unknown): Promise<void> {
        this.logDebug(`Tracking changes for task ${taskId}`);
        await this.getMetricsManager().trackMetric({
            domain: MetricDomain.TASK,
            type: MetricType.PERFORMANCE,
            value: JSON.stringify({ previous: previousState, current: newState }),
            timestamp: Date.now(),
            metadata: { taskId, operation: 'update' }
        });
    }

    private async updateMetrics(taskId: string): Promise<void> {
        this.logDebug(`Updating metrics for task ${taskId}`);
        const metrics = await this.getMetricsManager().getInitialPerformanceMetrics();
        await this.getMetricsManager().trackMetric({
            domain: MetricDomain.TASK,
            type: MetricType.PERFORMANCE,
            value: JSON.stringify(metrics),
            timestamp: Date.now(),
            metadata: { taskId, operation: 'update' }
        });
    }

    private async logUpdate(taskId: string, previousState: unknown, newState: unknown): Promise<void> {
        this.logDebug(`Logging update for task ${taskId}`);
        this.logManager.info(`Task ${taskId} updated with new state`, null, taskId);
        await this.getMetricsManager().trackMetric({
            domain: MetricDomain.TASK,
            type: MetricType.PERFORMANCE,
            value: JSON.stringify({ previous: previousState, current: newState }),
            timestamp: Date.now(),
            metadata: { taskId, operation: 'update' }
        });
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

            const transitionContext: IStatusTransitionContext = {
                entity: 'task',
                entityId: taskId,
                currentStatus: previousStatus,
                targetStatus: newStatus,
                operation: 'statusChange',
                phase: 'execution',
                startTime: Date.now(),
                resourceMetrics: await this.getMetricsManager().getInitialResourceMetrics(),
                performanceMetrics: await this.getMetricsManager().getInitialPerformanceMetrics(),
                errorContext: {
                    error: createError({
                        message: reason,
                        type: 'SystemError'
                    }),
                    recoverable: true,
                    retryCount: 0,
                    failureReason: reason
                }
            };

            await this.handleStatusTransition(transitionContext);
            await this.updateMetrics(taskId, previousStatus, newStatus);
            await this.logTransition(taskId, previousStatus, newStatus, reason);
        } catch (error) {
            this.handleError(error, 'TaskStatusChanged', 'SystemError');
        }
    }

    private async updateMetrics(taskId: string, from: TASK_STATUS_enum, to: TASK_STATUS_enum): Promise<void> {
        this.logDebug(`Updating metrics for task ${taskId}`);
        await this.getMetricsManager().trackMetric({
            domain: MetricDomain.TASK,
            type: MetricType.PERFORMANCE,
            value: JSON.stringify({ from, to }),
            timestamp: Date.now(),
            metadata: { taskId, operation: 'statusChange' }
        });
    }

    private async logTransition(taskId: string, from: TASK_STATUS_enum, to: TASK_STATUS_enum, reason: string): Promise<void> {
        this.logDebug(`Logging transition for task ${taskId}`);
        this.logManager.info(`Task ${taskId} transitioned from ${from} to ${to}: ${reason}`, null, taskId);
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
            
            await this.updateProgressTracking(taskId, previousProgress, newProgress);
            await this.updateMetrics(taskId, newProgress);
            await this.logProgress(taskId, previousProgress, newProgress);

            const transitionContext: IStatusTransitionContext = {
                entity: 'task',
                entityId: taskId,
                currentStatus: TASK_STATUS_enum.TODO,
                targetStatus: TASK_STATUS_enum.DOING,
                operation: 'progress',
                phase: 'execution',
                startTime: Date.now(),
                resourceMetrics: await this.getMetricsManager().getInitialResourceMetrics(),
                performanceMetrics: await this.getMetricsManager().getInitialPerformanceMetrics()
            };

            await this.handleStatusTransition(transitionContext);
        } catch (error) {
            this.handleError(error, 'TaskProgressUpdated', 'SystemError');
        }
    }

    private async updateProgressTracking(taskId: string, previous: unknown, current: unknown): Promise<void> {
        this.logDebug(`Updating progress tracking for task ${taskId}`);
        await this.getMetricsManager().trackMetric({
            domain: MetricDomain.TASK,
            type: MetricType.PERFORMANCE,
            value: JSON.stringify({ previous, current }),
            timestamp: Date.now(),
            metadata: { taskId, operation: 'progressUpdate' }
        });
    }

    private async updateMetrics(taskId: string, progress: unknown): Promise<void> {
        this.logDebug(`Updating metrics for task ${taskId}`);
        const metrics = await this.getMetricsManager().getInitialPerformanceMetrics();
        await this.getMetricsManager().trackMetric({
            domain: MetricDomain.TASK,
            type: MetricType.PERFORMANCE,
            value: JSON.stringify({ ...metrics, progress }),
            timestamp: Date.now(),
            metadata: { taskId, operation: 'progressUpdate' }
        });
    }

    private async logProgress(taskId: string, previous: unknown, current: unknown): Promise<void> {
        this.logDebug(`Logging progress for task ${taskId}`);
        this.logManager.info(`Task ${taskId} progress updated`, null, taskId);
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
            
            await this.processCompletion(taskId, outputs);
            await this.updateMetrics(taskId, duration);
            await this.logCompletion(taskId, outputs, duration);

            const transitionContext: IStatusTransitionContext = {
                entity: 'task',
                entityId: taskId,
                currentStatus: TASK_STATUS_enum.DOING,
                targetStatus: TASK_STATUS_enum.DONE,
                operation: 'completion',
                phase: 'post-execution',
                startTime: Date.now(),
                resourceMetrics: await this.getMetricsManager().getInitialResourceMetrics(),
                performanceMetrics: await this.getMetricsManager().getInitialPerformanceMetrics()
            };

            await this.handleStatusTransition(transitionContext);
        } catch (error) {
            this.handleError(error, 'TaskCompleted', 'SystemError');
        }
    }

    private async processCompletion(taskId: string, outputs: unknown): Promise<void> {
        this.logDebug(`Processing completion for task ${taskId}`);
        await this.getMetricsManager().trackMetric({
            domain: MetricDomain.TASK,
            type: MetricType.PERFORMANCE,
            value: JSON.stringify(outputs),
            timestamp: Date.now(),
            metadata: { taskId, operation: 'complete' }
        });
    }

    private async updateMetrics(taskId: string, duration: number): Promise<void> {
        this.logDebug(`Updating metrics for task ${taskId}`);
        const metrics = await this.getMetricsManager().getInitialPerformanceMetrics();
        await this.getMetricsManager().trackMetric({
            domain: MetricDomain.TASK,
            type: MetricType.PERFORMANCE,
            value: JSON.stringify({ ...metrics, duration }),
            timestamp: Date.now(),
            metadata: { taskId, operation: 'complete' }
        });
    }

    private async logCompletion(taskId: string, outputs: unknown, duration: number): Promise<void> {
        this.logDebug(`Logging completion for task ${taskId}`);
        this.logManager.info(`Task ${taskId} completed in ${duration}ms`, null, taskId);
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
            this.logError(`Task ${taskId} failed`, null, taskId, error);
            
            await this.logFailure(taskId, error, context);
            await this.cleanupResources(taskId);
            await this.updateFailureMetrics(taskId, error);
            await this.notifyFailure(taskId, error, context);

            const transitionContext: IStatusTransitionContext = {
                entity: 'task',
                entityId: taskId,
                currentStatus: TASK_STATUS_enum.ERROR,
                targetStatus: TASK_STATUS_enum.BLOCKED,
                operation: 'failure',
                phase: 'error',
                startTime: Date.now(),
                resourceMetrics: await this.getMetricsManager().getInitialResourceMetrics(),
                performanceMetrics: await this.getMetricsManager().getInitialPerformanceMetrics(),
                errorContext: {
                    error: createError({
                        message: error.message,
                        type: 'SystemError'
                    }),
                    recoverable: false,
                    retryCount: 0,
                    failureReason: error.message
                }
            };

            await this.handleStatusTransition(transitionContext);
        } catch (error) {
            this.handleError(error, 'TaskFailed', 'SystemError');
        }
    }

    private async logFailure(taskId: string, error: Error, context: unknown): Promise<void> {
        this.logDebug(`Logging failure for task ${taskId}`);
        this.logManager.error(`Task ${taskId} failure details: ${error.message}`, null, taskId, error);
        await this.getMetricsManager().trackMetric({
            domain: MetricDomain.TASK,
            type: MetricType.PERFORMANCE,
            value: JSON.stringify({ error: error.message, context }),
            timestamp: Date.now(),
            metadata: { taskId, operation: 'failure' }
        });
    }

    private async cleanupResources(taskId: string): Promise<void> {
        this.logDebug(`Cleaning up resources for failed task ${taskId}`);
        const metrics = await this.getMetricsManager().getInitialResourceMetrics();
        await this.getMetricsManager().trackMetric({
            domain: MetricDomain.TASK,
            type: MetricType.RESOURCE,
            value: JSON.stringify(metrics),
            timestamp: Date.now(),
            metadata: { taskId, operation: 'cleanup' }
        });
    }

    private async updateFailureMetrics(taskId: string, error: Error): Promise<void> {
        this.logDebug(`Updating failure metrics for task ${taskId}`);
        const metrics = await this.getMetricsManager().getInitialPerformanceMetrics();
        await this.getMetricsManager().trackMetric({
            domain: MetricDomain.TASK,
            type: MetricType.PERFORMANCE,
            value: JSON.stringify({ ...metrics, error: error.message }),
            timestamp: Date.now(),
            metadata: { taskId, operation: 'failure' }
        });
    }

    private async notifyFailure(taskId: string, error: Error, context: unknown): Promise<void> {
        this.logDebug(`Notifying failure for task ${taskId}`);
        this.logManager.error(`Task ${taskId} failed: ${error.message}`, null, taskId, error);
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
            this.logError(`Task ${taskId} encountered error`, null, taskId, error);
            
            await this.logErrorDetails(taskId, error, context);
            const isRecoverable = await this.assessError(error);
            
            if (isRecoverable) {
                await this.initiateRecovery(taskId, error, context);
            } else {
                await this.transitionToFailed(taskId, error, context);
            }
            
            await this.updateErrorMetrics(taskId, error);
        } catch (error) {
            this.handleError(error, 'TaskErrorOccurred', 'SystemError');
        }
    }

    private async logErrorDetails(taskId: string, error: Error, context: unknown): Promise<void> {
        this.logDebug(`Logging error details for task ${taskId}`);
        this.logManager.error(`Task ${taskId} error details: ${error.message}`, null, taskId, error);
        await this.getMetricsManager().trackMetric({
            domain: MetricDomain.TASK,
            type: MetricType.PERFORMANCE,
            value: JSON.stringify({ error: error.message, context }),
            timestamp: Date.now(),
            metadata: { taskId, operation: 'error' }
        });
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

    private async initiateRecovery(taskId: string, error: Error, context: unknown): Promise<void> {
        this.logDebug(`Initiating recovery for task ${taskId}`);
        await this.getMetricsManager().trackMetric({
            domain: MetricDomain.TASK,
            type: MetricType.PERFORMANCE,
            value: JSON.stringify({ error: error.message, context }),
            timestamp: Date.now(),
            metadata: { taskId, operation: 'recovery' }
        });
    }

    private async transitionToFailed(taskId: string, error: Error, context: unknown): Promise<void> {
        const transitionContext: IStatusTransitionContext = {
            entity: 'task',
            entityId: taskId,
            currentStatus: TASK_STATUS_enum.ERROR,
            targetStatus: TASK_STATUS_enum.REVISE,
            operation: 'errorTransition',
            phase: 'error',
            startTime: Date.now(),
            resourceMetrics: await this.getMetricsManager().getInitialResourceMetrics(),
            performanceMetrics: await this.getMetricsManager().getInitialPerformanceMetrics(),
            errorContext: {
                error: createError({
                    message: error.message,
                    type: 'SystemError'
                }),
                recoverable: false,
                retryCount: 0,
                failureReason: error.message
            }
        };

        await this.handleStatusTransition(transitionContext);
    }

    private async updateErrorMetrics(taskId: string, error: Error): Promise<void> {
        this.logDebug(`Updating error metrics for task ${taskId}`);
        const metrics = await this.getMetricsManager().getInitialPerformanceMetrics();
        await this.getMetricsManager().trackMetric({
            domain: MetricDomain.TASK,
            type: MetricType.PERFORMANCE,
            value: JSON.stringify({ ...metrics, error: error.message }),
            timestamp: Date.now(),
            metadata: { taskId, operation: 'error' }
        });
    }
}

// ─── Handler Registry ─────────────────────────────────────────────────────────

export const taskEventHandlers = new Map<TASK_EVENT_TYPE_enum, IEventHandler<TaskEvent>>([
    [TASK_EVENT_TYPE_enum.TASK_CREATED, TaskCreatedHandler.getInstance()],
    [TASK_EVENT_TYPE_enum.TASK_UPDATED, TaskUpdatedHandler.getInstance()],
    [TASK_EVENT_TYPE_enum.TASK_STATUS_CHANGED, TaskStatusChangedHandler.getInstance()],
    [TASK_EVENT_TYPE_enum.TASK_PROGRESS_UPDATED, TaskProgressUpdatedHandler.getInstance()],
    [TASK_EVENT_TYPE_enum.TASK_COMPLETED, TaskCompletedHandler.getInstance()],
    [TASK_EVENT_TYPE_enum.TASK_ERROR_OCCURRED, TaskErrorOccurredHandler.getInstance()],
    [TASK_EVENT_TYPE_enum.TASK_FAILED, TaskFailedHandler.getInstance()]
]) as ReadonlyMap<TASK_EVENT_TYPE_enum, IEventHandler<TaskEvent>>;

export default taskEventHandlers;
