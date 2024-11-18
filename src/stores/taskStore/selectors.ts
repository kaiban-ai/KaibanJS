/**
 * @file selectors.ts
 * @path src/stores/taskStore/selectors.ts
 * @description Task store selectors
 */

import type { ITaskState } from '@/utils/types/task/store';
import type { TaskType } from '@/utils/types/task/base';
import type { TASK_STATUS_enum } from '@/utils/types/common/enums';

// Basic selectors
export const selectTaskById = (state: ITaskState, id: string): TaskType | undefined =>
    state.tasks.find(task => task.id === id);

export const selectTasksByStatus = (state: ITaskState, status: keyof typeof TASK_STATUS_enum): TaskType[] =>
    state.tasks.filter(task => state.executionState[task.id]?.status === status);

export const selectActiveTasks = (state: ITaskState): TaskType[] =>
    state.activeTasks;

// Metadata selectors
export const selectTaskMetadata = (state: ITaskState, id: string) =>
    state.metadata[id];

export const selectTaskPriority = (state: ITaskState, id: string): number =>
    state.metadata[id]?.priority ?? 0;

// Execution state selectors
export const selectTaskExecutionState = (state: ITaskState, id: string) =>
    state.executionState[id];

export const selectTaskStatus = (state: ITaskState, id: string): keyof typeof TASK_STATUS_enum | undefined =>
    state.executionState[id]?.status;

export const selectTaskProgress = (state: ITaskState, id: string): number =>
    state.executionState[id]?.progress ?? 0;

export const selectTaskAssignedAgent = (state: ITaskState, id: string) =>
    state.executionState[id]?.assignedAgent;

// Performance selectors
export const selectTaskPerformanceStats = (state: ITaskState, id: string) =>
    state.performanceStats[id];

export const selectTaskDuration = (state: ITaskState, id: string): number | undefined =>
    state.performanceStats[id]?.duration;

export const selectTaskRetryCount = (state: ITaskState, id: string): number =>
    state.performanceStats[id]?.retryCount ?? 0;

// Error selectors
export const selectTaskErrors = (state: ITaskState): Error[] =>
    state.errors;

export const selectTaskLastError = (state: ITaskState, id: string): Error | undefined =>
    state.executionState[id]?.lastError;

// Composite selectors
export const selectPendingTasks = (state: ITaskState): TaskType[] =>
    state.tasks.filter(task => state.executionState[task.id]?.status === 'pending');

export const selectFailedTasks = (state: ITaskState): TaskType[] =>
    state.tasks.filter(task => state.executionState[task.id]?.status === 'failed');

export const selectCompletedTasks = (state: ITaskState): TaskType[] =>
    state.tasks.filter(task => state.executionState[task.id]?.status === 'completed');

export const selectHighPriorityTasks = (state: ITaskState, threshold = 8): TaskType[] =>
    state.tasks.filter(task => (state.metadata[task.id]?.priority ?? 0) >= threshold);

export const selectTasksByAgent = (state: ITaskState, agentId: string): TaskType[] =>
    state.tasks.filter(task => state.executionState[task.id]?.assignedAgent?.id === agentId);