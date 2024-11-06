/**
 * @file index.ts
 * @path src/utils/types/task/index.ts
 * @description Central export point for task-related types and interfaces
 */

export {
    TaskType,
    TaskResult,
    TaskStats,
    TaskMetadata,
    FeedbackObject,
    ITaskParams,
    TaskValidationResult,
    TaskTypeGuards
} from './base';

export {
    TaskRuntimeState,
    TaskExecutionMetrics,
    TaskStatusUpdateParams,
    TaskStoreState,
    TaskStoreActions,
    TaskStoreTypeGuards
} from './store';

export {
    TaskExecutionParams,
    TaskCompletionParams,
    TaskErrorParams,
    TaskBlockingParams,
    TaskValidationParams,
    TaskFeedbackParams,
    TaskToolExecutionParams,
    TaskObservationParams,
    TaskIterationParams,
    HandlerResult,
    ITaskHandler,
    HandlerTypeGuards
} from './handlers';

export {
    TaskProgress,
    TaskMetrics,
    TaskHistoryEntry,
    TaskDependencyTracking,
    TaskAuditRecord,
    TaskTrackingUtils,
    TaskTrackingTypeGuards
} from './tracking';

export {
    ComprehensiveTaskType,
    hasTrackingData,
    enrichTaskWithTracking
} from './utils';