/**
 * @file taskEventEmitter.ts
 * @path src/managers/domain/task/taskEventEmitter.ts
 * @description Task-specific event emitter implementation
 *
 * @module @managers/domain/task
 */

import { CoreManager } from '../../core/coreManager';
import { BaseEventEmitter } from '../../core/eventEmitter';
import { TaskMetricsManager } from './taskMetricsManager';
import { createValidationResult, createValidationMetadata } from '../../../utils/validation/validationUtils';
import { TASK_EVENT_TYPE_enum, TASK_STATUS_enum } from '../../../types/common/commonEnums';
import type { 
    TaskEvent,
    ITaskCreatedEvent,
    ITaskUpdatedEvent,
    ITaskDeletedEvent,
    ITaskStatusChangedEvent,
    ITaskProgressUpdatedEvent,
    ITaskCompletedEvent,
    ITaskFailedEvent,
    ITaskValidationCompletedEvent,
    ITaskFeedbackAddedEvent,
    ITaskMetricsUpdatedEvent,
    ITaskErrorOccurredEvent,
    ITaskErrorHandledEvent,
    ITaskErrorRecoveryStartedEvent,
    ITaskErrorRecoveryCompletedEvent,
    ITaskErrorRecoveryFailedEvent,
    ITaskEventMetadata,
    createTaskEventMetadata
} from '../../../types/task/taskEventTypes';
import type { IEventHandler } from '../../../types/common/commonEventTypes';
import type { IValidationResult } from '../../../types/common/commonValidationTypes';
import type { ITaskType, ITaskProgress, ITaskFeedback } from '../../../types/task/taskBaseTypes';
import type { ITaskMetrics, ITaskHandlerResult } from '../../../types/task/taskHandlerTypes';
import type { IBaseError } from '../../../types/common/commonErrorTypes';
import type { IPerformanceMetrics, ITimeMetrics, IThroughputMetrics, IErrorMetrics } from '../../../types/metrics/base/performanceMetrics';

export class TaskEventEmitter extends CoreManager {
    protected static _instance: TaskEventEmitter;
    private readonly eventEmitter: BaseEventEmitter;
    private readonly metricsManager: TaskMetricsManager;

    protected constructor() {
        super();
        this.eventEmitter = BaseEventEmitter.getInstance();
        this.metricsManager = new TaskMetricsManager();
        this.registerDomainManager('TaskEventEmitter', this);
    }

    public static override getInstance(): TaskEventEmitter {
        if (!TaskEventEmitter._instance) {
            TaskEventEmitter._instance = new TaskEventEmitter();
        }
        return TaskEventEmitter._instance;
    }

    // ─── Event Registration Methods ────────────────────────────────────────────

    public on<T extends TaskEvent>(eventType: TASK_EVENT_TYPE_enum, handler: IEventHandler<T>): void {
        this.eventEmitter.on(eventType, handler);
    }

    public off<T extends TaskEvent>(eventType: TASK_EVENT_TYPE_enum, handler: IEventHandler<T>): void {
        this.eventEmitter.off(eventType, handler);
    }

    // ─── Event Emission Methods ──────────────────────────────────────────────────

    public async emitTaskCreated(params: Omit<ITaskCreatedEvent, 'id' | 'type' | 'timestamp' | 'metadata'>): Promise<void> {
        const metadata = await this.createTaskMetadata('task_created', params.taskId);
        const event: ITaskCreatedEvent = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            type: TASK_EVENT_TYPE_enum.TASK_CREATED,
            ...params,
            metadata
        };
        await this.eventEmitter.emit(event);
    }

    public async emitTaskUpdated(params: Omit<ITaskUpdatedEvent, 'id' | 'type' | 'timestamp' | 'metadata'>): Promise<void> {
        const metadata = await this.createTaskMetadata('task_updated', params.taskId);
        const event: ITaskUpdatedEvent = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            type: TASK_EVENT_TYPE_enum.TASK_UPDATED,
            ...params,
            metadata
        };
        await this.eventEmitter.emit(event);
    }

    public async emitTaskDeleted(params: Omit<ITaskDeletedEvent, 'id' | 'type' | 'timestamp' | 'metadata'>): Promise<void> {
        const metadata = await this.createTaskMetadata('task_deleted', params.taskId);
        const event: ITaskDeletedEvent = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            type: TASK_EVENT_TYPE_enum.TASK_DELETED,
            ...params,
            metadata
        };
        await this.eventEmitter.emit(event);
    }

    public async emitTaskStatusChanged(params: Omit<ITaskStatusChangedEvent, 'id' | 'type' | 'timestamp' | 'metadata'>): Promise<void> {
        const metadata = await this.createTaskMetadata('task_status_changed', params.taskId);
        const event: ITaskStatusChangedEvent = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            type: TASK_EVENT_TYPE_enum.TASK_STATUS_CHANGED,
            ...params,
            metadata
        };
        await this.eventEmitter.emit(event);
    }

    public async emitTaskProgressUpdated(params: Omit<ITaskProgressUpdatedEvent, 'id' | 'type' | 'timestamp' | 'metadata'>): Promise<void> {
        const metadata = await this.createTaskMetadata('task_progress_updated', params.taskId);
        const event: ITaskProgressUpdatedEvent = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            type: TASK_EVENT_TYPE_enum.TASK_PROGRESS_UPDATED,
            ...params,
            metadata
        };
        await this.eventEmitter.emit(event);
    }

    public async emitTaskCompleted(params: Omit<ITaskCompletedEvent, 'id' | 'type' | 'timestamp' | 'metadata'>): Promise<void> {
        const metadata = await this.createTaskMetadata('task_completed', params.taskId);
        const event: ITaskCompletedEvent = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            type: TASK_EVENT_TYPE_enum.TASK_COMPLETED,
            ...params,
            metadata
        };
        await this.eventEmitter.emit(event);
    }

    public async emitTaskFailed(params: Omit<ITaskFailedEvent, 'id' | 'type' | 'timestamp' | 'metadata'>): Promise<void> {
        const metadata = await this.createTaskMetadata('task_failed', params.taskId);
        const event: ITaskFailedEvent = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            type: TASK_EVENT_TYPE_enum.TASK_FAILED,
            ...params,
            metadata
        };
        await this.eventEmitter.emit(event);
    }

    public async emitTaskValidationCompleted(params: Omit<ITaskValidationCompletedEvent, 'id' | 'type' | 'timestamp' | 'metadata'>): Promise<void> {
        const metadata = await this.createTaskMetadata('task_validation_completed', params.taskId);
        const event: ITaskValidationCompletedEvent = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            type: TASK_EVENT_TYPE_enum.TASK_VALIDATION_COMPLETED,
            ...params,
            metadata
        };
        await this.eventEmitter.emit(event);
    }

    public async emitTaskFeedbackAdded(params: Omit<ITaskFeedbackAddedEvent, 'id' | 'type' | 'timestamp' | 'metadata'>): Promise<void> {
        const metadata = await this.createTaskMetadata('task_feedback_added', params.taskId);
        const event: ITaskFeedbackAddedEvent = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            type: TASK_EVENT_TYPE_enum.TASK_FEEDBACK_ADDED,
            ...params,
            metadata
        };
        await this.eventEmitter.emit(event);
    }

    public async emitTaskMetricsUpdated(params: Omit<ITaskMetricsUpdatedEvent, 'id' | 'type' | 'timestamp' | 'metadata'>): Promise<void> {
        const metadata = await this.createTaskMetadata('task_metrics_updated', params.taskId);
        const event: ITaskMetricsUpdatedEvent = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            type: TASK_EVENT_TYPE_enum.TASK_METRICS_UPDATED,
            ...params,
            metadata
        };
        await this.eventEmitter.emit(event);
    }

    public async emitTaskErrorOccurred(params: Omit<ITaskErrorOccurredEvent, 'id' | 'type' | 'timestamp' | 'metadata'>): Promise<void> {
        const metadata = await this.createTaskMetadata('task_error_occurred', params.taskId);
        const event: ITaskErrorOccurredEvent = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            type: TASK_EVENT_TYPE_enum.TASK_ERROR_OCCURRED,
            ...params,
            metadata
        };
        await this.eventEmitter.emit(event);
    }

    public async emitTaskErrorHandled(params: Omit<ITaskErrorHandledEvent, 'id' | 'type' | 'timestamp' | 'metadata'>): Promise<void> {
        const metadata = await this.createTaskMetadata('task_error_handled', params.taskId);
        const event: ITaskErrorHandledEvent = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            type: TASK_EVENT_TYPE_enum.TASK_ERROR_HANDLED,
            ...params,
            metadata
        };
        await this.eventEmitter.emit(event);
    }

    public async emitTaskErrorRecoveryStarted(params: Omit<ITaskErrorRecoveryStartedEvent, 'id' | 'type' | 'timestamp' | 'metadata'>): Promise<void> {
        const metadata = await this.createTaskMetadata('task_error_recovery_started', params.taskId);
        const event: ITaskErrorRecoveryStartedEvent = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            type: TASK_EVENT_TYPE_enum.TASK_ERROR_RECOVERY_STARTED,
            ...params,
            metadata
        };
        await this.eventEmitter.emit(event);
    }

    public async emitTaskErrorRecoveryCompleted(params: Omit<ITaskErrorRecoveryCompletedEvent, 'id' | 'type' | 'timestamp' | 'metadata'>): Promise<void> {
        const metadata = await this.createTaskMetadata('task_error_recovery_completed', params.taskId);
        const event: ITaskErrorRecoveryCompletedEvent = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            type: TASK_EVENT_TYPE_enum.TASK_ERROR_RECOVERY_COMPLETED,
            ...params,
            metadata
        };
        await this.eventEmitter.emit(event);
    }

    public async emitTaskErrorRecoveryFailed(params: Omit<ITaskErrorRecoveryFailedEvent, 'id' | 'type' | 'timestamp' | 'metadata'>): Promise<void> {
        const metadata = await this.createTaskMetadata('task_error_recovery_failed', params.taskId);
        const event: ITaskErrorRecoveryFailedEvent = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            type: TASK_EVENT_TYPE_enum.TASK_ERROR_RECOVERY_FAILED,
            ...params,
            metadata
        };
        await this.eventEmitter.emit(event);
    }

    // ─── Helper Methods ─────────────────────────────────────────────────────────

    protected async createTaskMetadata(operation: string, taskId: string): Promise<ITaskEventMetadata> {
        const metrics = this.metricsManager.getMetrics(taskId);
        const timestamp = Date.now();
        const runId = timestamp.toString();

        return createTaskEventMetadata(
            'TaskEventEmitter',
            operation,
            runId,
            0, // duration
            undefined, // previousState
            undefined, // newState
            undefined, // parentRunId
            undefined, // tags
            {
                taskId,
                metrics: metrics || this.metricsManager.initializeMetrics(taskId),
                progress: {
                    status: TASK_STATUS_enum.PENDING,
                    progress: 0,
                    timeElapsed: 0
                }
            }
        );
    }

    public cleanup(): void {
        this.metricsManager.cleanup();
    }
}

export default TaskEventEmitter.getInstance();
