/**
 * @file index.ts
 * @path src/utils/types/task/index.ts
 * @description Central export point for task-related types and interfaces
 */

// Base types
export type {
    TaskResult,
    TaskStats,
    TaskMetadata,
    FeedbackObject,
    TaskType,
    ITaskParams,
    TaskValidationResult
} from './base';

export {
    TaskTypeGuards
} from './base';

// Handler types
export type {
    TaskExecutionParams,
    TaskCompletionParams,
    TaskErrorParams,
    TaskBlockingParams,
    TaskValidationParams,
    TaskFeedbackParams,
    TaskToolExecutionParams,
    TaskObservationParams,
    TaskIterationParams
} from './handlers';

// Store types - importing from canonical source
export type {
    TaskStoreState
} from '@/utils/types/store/task';

export {
    TaskStoreTypeGuards
} from '@/utils/types/store/task';

// Additional store types specific to task module
export type {
    TaskStoreMutations,
    TaskStoreAPI,
    TaskStoreCreator,
    TaskStoreSelector,
    TaskStoreSubscriber
} from './store';

// Tracking types
export type {
    TaskProgress,
    TaskMetrics,
    TaskHistoryEntry,
    TaskDependencyTracking,
    TaskAuditRecord
} from './tracking';

export {
    TaskTrackingUtils
} from './tracking';