/**
* @file taskEventTypes.ts
* @path src/types/task/taskEventTypes.ts
* @description Task domain event type definitions
*
* @module @types/task
*/

import type { IBaseEvent, IBaseHandlerMetadata } from '../common/commonEventTypes';
import type { ITaskType, ITaskProgress, ITaskFeedback } from './taskBaseTypes';
import type { ITaskMetrics, ITaskHandlerResult } from './taskHandlerTypes';
import type { TASK_STATUS_enum, TASK_EVENT_TYPE_enum } from '../common/commonEnums';
import type { IBaseError } from '../common/commonErrorTypes';

// ─── Task Event Metadata ────────────────────────────────────────────────────

/**
 * Composite metadata type for task events
 */
export interface ITaskEventMetadata extends IBaseHandlerMetadata {
    task: {
        id: string;
        title: string;
        status: keyof typeof TASK_STATUS_enum;
        stepId: string;
        metrics: ITaskMetrics;
        progress: ITaskProgress;
    };
}

// ─── Task Event Interfaces ────────────────────────────────────────────────────

export interface ITaskCreatedEvent extends IBaseEvent {
    type: TASK_EVENT_TYPE_enum.TASK_CREATED;
    taskId: string;
    task: ITaskType;
    metadata: ITaskEventMetadata;
}

export interface ITaskUpdatedEvent extends IBaseEvent {
    type: TASK_EVENT_TYPE_enum.TASK_UPDATED;
    taskId: string;
    previousState: Partial<ITaskType>;
    newState: Partial<ITaskType>;
    metadata: ITaskEventMetadata;
}

export interface ITaskDeletedEvent extends IBaseEvent {
    type: TASK_EVENT_TYPE_enum.TASK_DELETED;
    taskId: string;
    finalState: ITaskType;
    metadata: ITaskEventMetadata;
}

export interface ITaskStatusChangedEvent extends IBaseEvent {
    type: TASK_EVENT_TYPE_enum.TASK_STATUS_CHANGED;
    taskId: string;
    previousStatus: keyof typeof TASK_STATUS_enum;
    newStatus: keyof typeof TASK_STATUS_enum;
    reason: string;
    metadata: ITaskEventMetadata;
}

export interface ITaskProgressUpdatedEvent extends IBaseEvent {
    type: TASK_EVENT_TYPE_enum.TASK_PROGRESS_UPDATED;
    taskId: string;
    previousProgress: ITaskProgress;
    newProgress: ITaskProgress;
    metadata: ITaskEventMetadata;
}

export interface ITaskCompletedEvent extends IBaseEvent {
    type: TASK_EVENT_TYPE_enum.TASK_COMPLETED;
    taskId: string;
    result: ITaskHandlerResult;
    duration: number;
    metadata: ITaskEventMetadata;
}

export interface ITaskFailedEvent extends IBaseEvent {
    type: TASK_EVENT_TYPE_enum.TASK_FAILED;
    taskId: string;
    error: Error;
    context: {
        operation: string;
        state: Partial<ITaskType>;
    };
    metadata: ITaskEventMetadata;
}

export interface ITaskValidationCompletedEvent extends IBaseEvent {
    type: TASK_EVENT_TYPE_enum.TASK_VALIDATION_COMPLETED;
    taskId: string;
    validationResult: {
        valid: boolean;
        errors: string[];
        warnings?: string[];
    };
    metadata: ITaskEventMetadata;
}

export interface ITaskFeedbackAddedEvent extends IBaseEvent {
    type: TASK_EVENT_TYPE_enum.TASK_FEEDBACK_ADDED;
    taskId: string;
    feedback: ITaskFeedback;
    metadata: ITaskEventMetadata;
}

export interface ITaskMetricsUpdatedEvent extends IBaseEvent {
    type: TASK_EVENT_TYPE_enum.TASK_METRICS_UPDATED;
    taskId: string;
    previousMetrics: ITaskMetrics;
    newMetrics: ITaskMetrics;
    metadata: ITaskEventMetadata;
}

export interface ITaskErrorOccurredEvent extends IBaseEvent {
    type: TASK_EVENT_TYPE_enum.TASK_ERROR_OCCURRED;
    taskId: string;
    error: Error;
    context: {
        operation: string;
        state: Partial<ITaskType>;
    };
    metadata: ITaskEventMetadata;
}

export interface ITaskErrorHandledEvent extends IBaseEvent {
    type: TASK_EVENT_TYPE_enum.TASK_ERROR_HANDLED;
    taskId: string;
    error: IBaseError;
    context: {
        operation: string;
        recoveryAttempted: boolean;
        recoverySuccessful?: boolean;
    };
    metadata: ITaskEventMetadata;
}

export interface ITaskErrorRecoveryStartedEvent extends IBaseEvent {
    type: TASK_EVENT_TYPE_enum.TASK_ERROR_RECOVERY_STARTED;
    taskId: string;
    error: IBaseError;
    context: {
        operation: string;
        recoveryStrategy: string;
    };
    metadata: ITaskEventMetadata;
}

export interface ITaskErrorRecoveryCompletedEvent extends IBaseEvent {
    type: TASK_EVENT_TYPE_enum.TASK_ERROR_RECOVERY_COMPLETED;
    taskId: string;
    error: IBaseError;
    context: {
        operation: string;
        recoveryStrategy: string;
        recoveryDuration: number;
    };
    metadata: ITaskEventMetadata;
}

export interface ITaskErrorRecoveryFailedEvent extends IBaseEvent {
    type: TASK_EVENT_TYPE_enum.TASK_ERROR_RECOVERY_FAILED;
    taskId: string;
    error: IBaseError;
    context: {
        operation: string;
        recoveryStrategy: string;
        recoveryAttempts: number;
        failureReason: string;
    };
    metadata: ITaskEventMetadata;
}

// ─── Task Event Union Type ─────────────────────────────────────────────────────

export type TaskEvent =
    | ITaskCreatedEvent
    | ITaskUpdatedEvent
    | ITaskDeletedEvent
    | ITaskStatusChangedEvent
    | ITaskProgressUpdatedEvent
    | ITaskCompletedEvent
    | ITaskFailedEvent
    | ITaskValidationCompletedEvent
    | ITaskFeedbackAddedEvent
    | ITaskMetricsUpdatedEvent
    | ITaskErrorOccurredEvent
    | ITaskErrorHandledEvent
    | ITaskErrorRecoveryStartedEvent
    | ITaskErrorRecoveryCompletedEvent
    | ITaskErrorRecoveryFailedEvent;

// ─── Task Event Handler Types ───────────────────────────────────────────────────

export interface ITaskEventHandler {
    onTaskCreated(event: ITaskCreatedEvent): Promise<void>;
    onTaskUpdated(event: ITaskUpdatedEvent): Promise<void>;
    onTaskDeleted(event: ITaskDeletedEvent): Promise<void>;
    onTaskStatusChanged(event: ITaskStatusChangedEvent): Promise<void>;
    onTaskProgressUpdated(event: ITaskProgressUpdatedEvent): Promise<void>;
    onTaskCompleted(event: ITaskCompletedEvent): Promise<void>;
    onTaskFailed(event: ITaskFailedEvent): Promise<void>;
    onTaskValidationCompleted(event: ITaskValidationCompletedEvent): Promise<void>;
    onTaskFeedbackAdded(event: ITaskFeedbackAddedEvent): Promise<void>;
    onTaskMetricsUpdated(event: ITaskMetricsUpdatedEvent): Promise<void>;
    onTaskErrorOccurred(event: ITaskErrorOccurredEvent): Promise<void>;
    onTaskErrorHandled(event: ITaskErrorHandledEvent): Promise<void>;
    onTaskErrorRecoveryStarted(event: ITaskErrorRecoveryStartedEvent): Promise<void>;
    onTaskErrorRecoveryCompleted(event: ITaskErrorRecoveryCompletedEvent): Promise<void>;
    onTaskErrorRecoveryFailed(event: ITaskErrorRecoveryFailedEvent): Promise<void>;
}
