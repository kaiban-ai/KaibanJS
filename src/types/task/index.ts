/**
* @file index.ts
* @path src/types/task/index.ts
* @description Centralized exports for all task-related types and interfaces
*
* @module @types/task
*/

// ─── Base Types ────────────────────────────────────────────────────────────────
export type {
    ITaskParams,
    ITaskProgress,
    ITaskHistoryEntry,
    ITaskType
} from './taskBaseTypes';
export { TaskTypeGuards } from './taskBaseTypes';

// ─── Event Types ───────────────────────────────────────────────────────────────
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
    createTaskEventMetadata
} from './taskEventTypes';

// ─── Event Validation ───────────────────────────────────────────────────────────
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

// ─── Feedback Types ────────────────────────────────────────────────────────────
export type { ITaskFeedback } from './taskFeedbackTypes';
export { TaskFeedbackTypeGuards } from './taskFeedbackTypes';

// ─── Handler Types ─────────────────────────────────────────────────────────────
export type {
    ITaskExecutionParams,
    ITaskCompletionParams,
    ITaskErrorParams,
    ITaskUpdateParams,
    ITaskValidationParams,
    ITaskValidationResult,
    ITaskHandlerResponse,
    ITaskMetrics,
    ITaskHandlerMetadata,
    ITaskHandlerResult
} from './taskHandlerTypes';
export {
    TaskHandlerTypeGuards,
    createEmptyTaskMetrics
} from './taskHandlerTypes';

// ─── Manager Types ─────────────────────────────────────────────────────────────
export type {
    ITaskManager,
    ITaskManagerEvents,
    ITaskManagerConfig
} from './taskManagerTypes';

// ─── Metric Types ──────────────────────────────────────────────────────────────
export type {
    ITaskResourceMetrics,
    ITaskPerformanceMetrics,
    ITaskUsageMetrics
} from './taskMetricTypes';
export { TaskMetricsTypeGuards } from './taskMetricTypes';

// ─── State Types ───────────────────────────────────────────────────────────────
export type {
    ITaskExecutionState,
    ITaskExecutionContext,
    ITaskExecutionMetrics
} from './taskStateTypes';
export {
    TaskStateTypeGuards,
    createDefaultExecutionState
} from './taskStateTypes';

// ─── Tracking Types ────────────────────────────────────────────────────────────
export type { ITaskTrackingMetrics } from './taskTrackingTypes';
