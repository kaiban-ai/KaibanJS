/**
 * @file index.ts
 * @path KaibanJS/src/types/task/index.ts
 * @description Centralized exports for task-related types and interfaces
 *
 * @module types/task
 */

// ─── Base Types ─────────────────────────────────────────────────────────────────
export type {
    ITaskType,
    ITaskResult,
    ITaskFeedback,
    ITaskParams
} from './taskBaseTypes';
export { TaskTypeGuards } from './taskBaseTypes';

// ─── State Types ────────────────────────────────────────────────────────────────
export type {
    ITaskExecutionContext,
    ITaskExecutionMetrics,
    ITaskExecutionState
} from './taskStateTypes';
export { 
    TaskStateTypeGuards,
    createDefaultExecutionState 
} from './taskStateTypes';

// ─── Store Types ────────────────────────────────────────────────────────────────
export type {
    ITaskState,
    ITaskStoreConfig,
    ITaskMetadata,
    ITaskPerformanceStats,
    ITaskErrorActions,
    ITaskExecutionActions,
    ITaskStoreActions,
    ITaskStoreMethods
} from './taskStoreTypes';
export { TaskStoreTypeGuards } from './taskStoreTypes';

// ─── Tracking Types ─────────────────────────────────────────────────────────────
export type {
    ITaskMetrics,
    ITaskResourceMetrics,
    ITaskPerformanceMetrics,
    ITaskCostMetrics,
    ITaskProgress,
    ITaskHistoryEntry,
    ITaskDependencyTracking,
    ITaskAuditRecord
} from './taskTrackingTypes';
export { 
    TaskTrackingUtils,
    TaskTrackingTypeGuards 
} from './taskTrackingTypes';

// ─── Handler Types ──────────────────────────────────────────────────────────────
export type {
    ITaskExecutionParams,
    ITaskCompletionParams,
    ITaskErrorParams,
    ITaskUpdateParams,
    ITaskValidationParams,
    ITaskValidationResult,
    ITaskHandlerResponse
} from './taskHandlersTypes';
export { HandlerTypeGuards } from './taskHandlersTypes';

// ─── Utility Types ──────────────────────────────────────────────────────────────
export type {
    TaskInterpolationOptions,
    TaskDescriptionTemplate
} from './taskUtilsTypes';
export { TaskUtilityGuards } from './taskUtilsTypes';
