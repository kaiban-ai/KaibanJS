/**
 * @file store.ts
 * @path src/utils/types/task/store.ts
 * @description Task store types and interfaces
 */

import type { IBaseStoreState, IBaseStoreMethods } from '../store/base';
import type { TaskType } from './base';
import type { AgentType } from '../agent/base';
import type { TASK_STATUS_enum } from '../common/enums';

// ─── Store Configuration Types ────────────────────────────────────────────────

export interface ITaskStoreConfig {
    name: string;
    maxRetries?: number;
    retryDelay?: number;
    taskTimeout?: number;
    middleware?: {
        devtools?: boolean;
        subscribeWithSelector?: boolean;
        persistence?: boolean;
    };
}

// ─── Task State Types ─────────────────────────────────────────────────────────

export interface ITaskMetadata {
    id: string;
    name: string;
    description?: string;
    priority: number;
    created: Date;
    deadline?: Date;
    tags?: string[];
}

export interface ITaskExecutionState {
    status: keyof typeof TASK_STATUS_enum;
    assignedAgent?: AgentType;
    startTime?: Date;
    endTime?: Date;
    retryCount: number;
    lastError?: Error;
    progress: number;
}

export interface ITaskPerformanceStats {
    duration?: number;
    retryCount: number;
    tokenCount: number;
    cost: number;
}

export interface ITaskState extends IBaseStoreState {
    tasks: TaskType[];
    activeTasks: TaskType[];
    metadata: Record<string, ITaskMetadata>;
    executionState: Record<string, ITaskExecutionState>;
    performanceStats: Record<string, ITaskPerformanceStats>;
    errors: Error[];
    loading: boolean;
}

// ─── Store Action Types ────────────────────────────────────────────────────────

export interface ITaskErrorActions {
    handleTaskError: (taskId: string, error: Error) => void;
    clearTaskErrors: () => void;
}

export interface ITaskExecutionActions {
    startTask: (taskId: string, agent: AgentType) => void;
    completeTask: (taskId: string) => void;
    failTask: (taskId: string, error: Error) => void;
    updateTaskProgress: (taskId: string, progress: number) => void;
}

export interface ITaskManagementActions {
    addTask: (task: TaskType) => void;
    removeTask: (taskId: string) => void;
    updateTaskPriority: (taskId: string, priority: number) => void;
    updateTaskMetadata: (taskId: string, metadata: Partial<ITaskMetadata>) => void;
}

export interface ITaskStoreActions extends
    ITaskErrorActions,
    ITaskExecutionActions,
    ITaskManagementActions {}

export interface ITaskStoreMethods extends 
    IBaseStoreMethods<ITaskState>,
    ITaskStoreActions {}

// ─── Type Guards ────────────────────────────────────────────────────────────

export const TaskStoreTypeGuards = {
    isTaskMetadata: (value: unknown): value is ITaskMetadata => {
        if (typeof value !== 'object' || value === null) return false;
        const metadata = value as Partial<ITaskMetadata>;
        return (
            typeof metadata.id === 'string' &&
            typeof metadata.name === 'string' &&
            typeof metadata.priority === 'number' &&
            metadata.created instanceof Date
        );
    },

    isTaskExecutionState: (value: unknown): value is ITaskExecutionState => {
        if (typeof value !== 'object' || value === null) return false;
        const state = value as Partial<ITaskExecutionState>;
        return (
            typeof state.status === 'string' &&
            typeof state.retryCount === 'number' &&
            typeof state.progress === 'number'
        );
    },

    isTaskPerformanceStats: (value: unknown): value is ITaskPerformanceStats => {
        if (typeof value !== 'object' || value === null) return false;
        const stats = value as Partial<ITaskPerformanceStats>;
        return (
            typeof stats.retryCount === 'number' &&
            typeof stats.tokenCount === 'number' &&
            typeof stats.cost === 'number'
        );
    },

    isTaskState: (value: unknown): value is ITaskState => {
        if (typeof value !== 'object' || value === null) return false;
        const state = value as Partial<ITaskState>;
        return (
            Array.isArray(state.tasks) &&
            Array.isArray(state.activeTasks) &&
            typeof state.metadata === 'object' &&
            typeof state.executionState === 'object' &&
            typeof state.performanceStats === 'object' &&
            Array.isArray(state.errors) &&
            typeof state.loading === 'boolean'
        );
    }
};