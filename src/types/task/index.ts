/**
 * @file index.ts
 * @path KaibanJS/src/types/task/index.ts
 * @description Task types barrel file - exports all task-related types
 */

// Task Base Types
export type { 
    ITaskParams,
    ITaskProgress,
    ITaskHistoryEntry,
    ITaskType
} from './taskBaseTypes';
export { TaskTypeGuards } from './taskBaseTypes';

// Task Event Types
export type {
    ITaskEventMetadata,
    IBaseTaskEvent,
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
    TaskEvent
} from './taskEventTypes';
export { 
    TaskMessageChunk,
    isTaskCreatedEvent,
    isTaskUpdatedEvent,
    isTaskDeletedEvent,
    isTaskStatusChangedEvent,
    isTaskProgressUpdatedEvent,
    isTaskCompletedEvent,
    isTaskFailedEvent,
    isTaskValidationCompletedEvent,
    isTaskFeedbackAddedEvent,
    isTaskMetricsUpdatedEvent,
    isTaskErrorOccurredEvent,
    isTaskErrorHandledEvent,
    isTaskErrorRecoveryStartedEvent,
    isTaskErrorRecoveryCompletedEvent,
    isTaskErrorRecoveryFailedEvent,
    createTaskEventMetadata
} from './taskEventTypes';

// Task Event Validation
export {
    createTaskValidationResult,
    validateTaskEvent,
    validateTaskCreated,
    validateTaskUpdated,
    validateTaskDeleted,
    validateTaskStatusChanged,
    validateTaskProgressUpdated,
    validateTaskCompleted,
    validateTaskFailed
} from './taskEventValidation';

// Task Feedback Types
export type { ITaskFeedback } from './taskFeedbackTypes';
export { TaskFeedbackTypeGuards } from './taskFeedbackTypes';

// Task Handler Types
export type {
    ITaskValidationResult,
    ITaskMetrics,
    ITaskHandlerMetadata,
    ITaskHandlerResult
} from './taskHandlerTypes';
export { createEmptyTaskMetrics } from './taskHandlerTypes';

// Task Handlers Types
export type {
    ITaskExecutionParams,
    ITaskCompletionParams,
    ITaskErrorParams,
    ITaskUpdateParams,
    ITaskValidationParams,
    ITaskHandlerResponse
} from './taskHandlersTypes';
export { HandlerTypeGuards } from './taskHandlersTypes';

// Task Metric Types
export type {
    ITaskResourceMetrics,
    ITaskPerformanceMetrics,
    ITaskUsageMetrics
} from './taskMetricTypes';
export {
    TaskMetricsTypeGuards,
    TaskMetricsValidation
} from './taskMetricTypes';

// Task State Types
export type {
    ITaskExecutionContext,
    ITaskExecutionMetrics,
    ITaskExecutionState
} from './taskStateTypes';
export {
    TaskStateTypeGuards,
    createDefaultExecutionState
} from './taskStateTypes';

// Task Tracking Types
export type { ITaskTrackingMetrics } from './taskTrackingTypes';
export { createEmptyTaskTrackingMetrics } from './taskTrackingTypes';

// Task Utils Types
export type {
    TaskInterpolationOptions,
    TaskDescriptionTemplate
} from './taskUtilsTypes';
export { TaskUtilityGuards } from './taskUtilsTypes';
