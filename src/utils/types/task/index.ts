/**
 * @file index.ts
 * @path KaibanJS/src/utils/types/task/index.ts
 * @description Centralized export file for task-related types, interfaces, and utilities.
 */

import { TaskType, TaskStats } from './base';
import { ComprehensiveTaskType } from './utils';
import { TaskProgress, TaskMetrics, TaskHistoryEntry, TaskDependencyTracking, TaskAuditRecord } from './tracking';
import { TaskStoreActions } from './store'; // Ensure TaskStoreActions is correctly exported
import { TaskStatusUpdateParams } from './store'; // Ensure correct path to responses
import { TaskStoreState } from '@/stores/taskStore/state'; // Use TaskStoreState directly from @/stores/taskStore/state

// Exporting key task types
export * from './base';
export * from './handlers';
export * from './tracking';
export * from './utils';

// Task-related types for comprehensive usage
export type {
    TaskType,
    TaskStats,
    ComprehensiveTaskType,
    TaskStoreState, // Use TaskStoreState directly from @/stores/taskStore/state
    TaskStoreActions,
    TaskStatusUpdateParams
};

// Task progress and metrics types
export type {
    TaskProgress,
    TaskMetrics,
    TaskHistoryEntry,
    TaskDependencyTracking,
    TaskAuditRecord
};

// Exporting tracking utilities
export { TaskTrackingUtils } from './tracking';

// Utility functions
export { hasTrackingData, enrichTaskWithTracking } from './utils';
