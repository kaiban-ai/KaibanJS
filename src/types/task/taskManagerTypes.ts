/**
 * @file taskManagerTypes.ts
 * @path src/types/task/taskManagerTypes.ts
 * @description Task manager interface definitions and types
 *
 * @module @types/task
 */

import type { ITaskType } from './taskBaseTypes';
import type { ITaskHandlerResult } from './taskHandlerTypes';
import type { TASK_STATUS_enum } from '../common/enumTypes';

// ─── Task Manager Types ─────────────────────────────────────────────────────────

export interface ITaskManager {
    getTask(taskId: string): Promise<ITaskType | undefined>;
    getAgentTasks(agentId: string): Promise<ITaskType[]>;
    getWorkflowTasks(workflowId: string): Promise<ITaskType[]>;
    updateTaskStatus(taskId: string, status: TASK_STATUS_enum): Promise<void>;
    handleTaskError(task: ITaskType, error: Error): Promise<void>;
    executeTask(task: ITaskType): Promise<ITaskHandlerResult>;
}

// ─── Task Manager Events ───────────────────────────────────────────────────────

export interface ITaskManagerEvents {
    taskCreated: (taskId: string) => void;
    taskUpdated: (taskId: string) => void;
    taskDeleted: (taskId: string) => void;
    taskStatusChanged: (taskId: string, status: TASK_STATUS_enum) => void;
    taskError: (taskId: string, error: Error) => void;
    taskCompleted: (taskId: string, result: ITaskHandlerResult) => void;
}

// ─── Task Manager Configuration ──────────────────────────────────────────────────

export interface ITaskManagerConfig {
    maxConcurrentTasks?: number;
    taskTimeout?: number;
    retryAttempts?: number;
    retryDelay?: number;
    validateTasks?: boolean;
    logTaskEvents?: boolean;
}
