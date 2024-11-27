/**
 * @file taskEventValidation.ts
 * @path src/types/task/taskEventValidation.ts
 * @description Task event validation types, schemas, and type guards
 *
 * @module @types/task
 */

import type { 
    IValidationResult, 
    IValidationSchema,
    IValidationRule,
    createTypeGuard,
    validationChecks
} from '../common/commonValidationTypes';
import type {
    TaskEvent,
    ITaskEventMetadata,
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
    ITaskErrorRecoveryFailedEvent
} from './taskEventTypes';
import { TASK_EVENT_TYPE_enum, TASK_STATUS_enum } from '../common/commonEnums';

// ─── Task Event Validation Types ────────────────────────────────────────────────

/** Task event validation result */
export interface ITaskEventValidationResult extends IValidationResult<TaskEvent> {
    eventType: TASK_EVENT_TYPE_enum;
    metadata: ITaskEventMetadata;
}

/** Task event validation schema */
export interface ITaskEventValidationSchema extends IValidationSchema<TaskEvent> {
    eventType: TASK_EVENT_TYPE_enum;
    allowedTransitions?: Array<{
        from: keyof typeof TASK_STATUS_enum;
        to: keyof typeof TASK_STATUS_enum;
    }>;
}

// ─── Task Event Type Guards ───────────────────────────────────────────────────

/** Type guard for task event metadata */
export const isTaskEventMetadata = (value: unknown): value is ITaskEventMetadata => {
    if (!validationChecks.isObject(value)) return false;
    const metadata = value as ITaskEventMetadata;
    
    return (
        typeof metadata.task === 'object' &&
        typeof metadata.task.id === 'string' &&
        typeof metadata.task.title === 'string' &&
        typeof metadata.task.status === 'string' &&
        typeof metadata.task.stepId === 'string' &&
        typeof metadata.task.metrics === 'object' &&
        typeof metadata.task.progress === 'object'
    );
};

/** Type guard for base task event properties */
const hasBaseTaskEventProperties = (value: unknown): boolean => {
    if (!validationChecks.isObject(value)) return false;
    const event = value as TaskEvent;
    
    return (
        typeof event.type === 'string' &&
        typeof event.taskId === 'string' &&
        isTaskEventMetadata(event.metadata)
    );
};

/** Type guards for specific task events */
export const TaskEventTypeGuards = {
    isTaskCreatedEvent: (value: unknown): value is ITaskCreatedEvent => 
        hasBaseTaskEventProperties(value) &&
        (value as ITaskCreatedEvent).type === TASK_EVENT_TYPE_enum.TASK_CREATED &&
        typeof (value as ITaskCreatedEvent).task === 'object',

    isTaskUpdatedEvent: (value: unknown): value is ITaskUpdatedEvent =>
        hasBaseTaskEventProperties(value) &&
        (value as ITaskUpdatedEvent).type === TASK_EVENT_TYPE_enum.TASK_UPDATED &&
        typeof (value as ITaskUpdatedEvent).previousState === 'object' &&
        typeof (value as ITaskUpdatedEvent).newState === 'object',

    isTaskDeletedEvent: (value: unknown): value is ITaskDeletedEvent =>
        hasBaseTaskEventProperties(value) &&
        (value as ITaskDeletedEvent).type === TASK_EVENT_TYPE_enum.TASK_DELETED &&
        typeof (value as ITaskDeletedEvent).finalState === 'object',

    isTaskStatusChangedEvent: (value: unknown): value is ITaskStatusChangedEvent =>
        hasBaseTaskEventProperties(value) &&
        (value as ITaskStatusChangedEvent).type === TASK_EVENT_TYPE_enum.TASK_STATUS_CHANGED &&
        typeof (value as ITaskStatusChangedEvent).previousStatus === 'string' &&
        typeof (value as ITaskStatusChangedEvent).newStatus === 'string' &&
        typeof (value as ITaskStatusChangedEvent).reason === 'string',

    isTaskProgressUpdatedEvent: (value: unknown): value is ITaskProgressUpdatedEvent =>
        hasBaseTaskEventProperties(value) &&
        (value as ITaskProgressUpdatedEvent).type === TASK_EVENT_TYPE_enum.TASK_PROGRESS_UPDATED &&
        typeof (value as ITaskProgressUpdatedEvent).previousProgress === 'object' &&
        typeof (value as ITaskProgressUpdatedEvent).newProgress === 'object',

    isTaskCompletedEvent: (value: unknown): value is ITaskCompletedEvent =>
        hasBaseTaskEventProperties(value) &&
        (value as ITaskCompletedEvent).type === TASK_EVENT_TYPE_enum.TASK_COMPLETED &&
        typeof (value as ITaskCompletedEvent).result === 'object' &&
        typeof (value as ITaskCompletedEvent).duration === 'number',

    isTaskFailedEvent: (value: unknown): value is ITaskFailedEvent =>
        hasBaseTaskEventProperties(value) &&
        (value as ITaskFailedEvent).type === TASK_EVENT_TYPE_enum.TASK_FAILED &&
        value instanceof Error &&
        typeof (value as ITaskFailedEvent).context === 'object',

    // Add type guards for other task events...
};

// ─── Task Event Flow Documentation ───────────────────────────────────────────────

/**
 * Task Event Flow
 * 
 * 1. Task Creation
 *    - TASK_CREATED event is emitted when a new task is created
 *    - Contains initial task state and metadata
 * 
 * 2. Task Lifecycle Events
 *    - TASK_UPDATED: Task properties are modified
 *    - TASK_STATUS_CHANGED: Task status transitions occur
 *    - TASK_PROGRESS_UPDATED: Progress is reported
 *    - TASK_VALIDATION_COMPLETED: Validation checks complete
 *    - TASK_FEEDBACK_ADDED: User/system feedback is added
 *    - TASK_METRICS_UPDATED: Performance metrics are updated
 * 
 * 3. Task Completion Events
 *    - TASK_COMPLETED: Task successfully completes
 *    - TASK_FAILED: Task encounters unrecoverable error
 * 
 * 4. Error Handling Flow
 *    a. Error Detection
 *       - TASK_ERROR_OCCURRED: Initial error detection
 * 
 *    b. Error Processing
 *       - TASK_ERROR_HANDLED: Error is processed
 * 
 *    c. Recovery Attempt
 *       - TASK_ERROR_RECOVERY_STARTED: Recovery process begins
 *       - TASK_ERROR_RECOVERY_COMPLETED: Recovery succeeds
 *       - TASK_ERROR_RECOVERY_FAILED: Recovery fails
 * 
 * 5. Task Deletion
 *    - TASK_DELETED: Task is removed from system
 */

// ─── Validation Rules ─────────────────────────────────────────────────────────

/** Task event validation rules */
export const taskEventValidationRules: Record<TASK_EVENT_TYPE_enum, IValidationRule<TaskEvent>> = {
    [TASK_EVENT_TYPE_enum.TASK_CREATED]: {
        id: 'task-created-validation',
        validate: async (event) => {
            const isValid = TaskEventTypeGuards.isTaskCreatedEvent(event);
            return {
                isValid,
                errors: isValid ? [] : ['Invalid TASK_CREATED event format'],
                warnings: [],
                metadata: {
                    timestamp: Date.now(),
                    duration: 0,
                    validatorName: 'TaskCreatedValidator'
                }
            };
        }
    },
    // Add validation rules for other event types...
};

/** Task status transition validation */
export const validateTaskStatusTransition = (
    from: keyof typeof TASK_STATUS_enum,
    to: keyof typeof TASK_STATUS_enum
): boolean => {
    const allowedTransitions: Record<keyof typeof TASK_STATUS_enum, Array<keyof typeof TASK_STATUS_enum>> = {
        PENDING: ['IN_PROGRESS', 'CANCELLED'],
        IN_PROGRESS: ['COMPLETED', 'FAILED', 'PAUSED'],
        PAUSED: ['IN_PROGRESS', 'CANCELLED'],
        COMPLETED: [],
        FAILED: ['IN_PROGRESS'],
        CANCELLED: []
    };

    return allowedTransitions[from]?.includes(to) ?? false;
};
