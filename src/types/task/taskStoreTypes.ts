/**
 * @file taskStoreTypes.ts
 * @path KaibanJS/src/types/task/taskStoreTypes.ts
 * @description Task store types and interfaces for state management
 *
 * @module types/task
 */

import type { IBaseStoreState, IBaseStoreMethods } from '../store/baseStoreTypes';
import type { ITaskType } from './taskBaseTypes';
import type { TASK_STATUS_enum } from '../common/commonEnums';
import type { IHandlerResult } from '../common/commonHandlerTypes';
import { IResourceMetrics, IUsageMetrics, IPerformanceMetrics } from '../common/commonMetricTypes';
import type { IAgentType } from '../agent/agentBaseTypes';
import type { ITaskExecutionState } from './taskStateTypes';

// ─── Store State Types ─────────────────────────────────────────────────────────

export interface ITaskState extends IBaseStoreState {
    tasks: ITaskType[];
    activeTasks: ITaskType[];
    metadata: Record<string, ITaskMetadata>;
    executionState: Record<string, ITaskExecutionState>;
    performanceStats: Record<string, ITaskPerformanceStats>;
    errors: Error[];
    loading: boolean;
}

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

// ─── Task Metadata Types ────────────────────────────────────────────────────────

export interface ITaskMetadata {
    id: string;
    name: string;
    description?: string;
    priority: number;
    created: Date;
    deadline?: Date;
    tags?: string[];
    category?: string;
    estimatedDuration?: number;
    dependencies?: string[];
}

// ─── Task Performance Types ──────────────────────────────────────────────────────

export interface ITaskPerformanceStats {
    resources: IResourceMetrics;
    usage: IUsageMetrics;
    performance: IPerformanceMetrics;
}

// ─── Store Action Types ────────────────────────────────────────────────────────

export interface ITaskErrorActions {
    handleTaskError: (taskId: string, error: Error) => Promise<IHandlerResult>;
    clearTaskErrors: () => void;
}

export interface ITaskExecutionActions {
    startTask: (taskId: string, agent: IAgentType) => Promise<IHandlerResult>;
    completeTask: (taskId: string) => Promise<IHandlerResult>;
    failTask: (taskId: string, error: Error) => Promise<IHandlerResult>;
    updateTaskProgress: (taskId: string, progress: number) => void;
    blockTask: (taskId: string, reason: string) => Promise<IHandlerResult>;
    unblockTask: (taskId: string) => Promise<IHandlerResult>;
}

export interface ITaskStoreActions extends 
    ITaskErrorActions,
    ITaskExecutionActions {}

export interface ITaskStoreMethods extends 
    IBaseStoreMethods<ITaskState>,
    ITaskStoreActions {}

// ─── Type Guards ────────────────────────────────────────────────────────────────

export const TaskStoreTypeGuards = {
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
    },

    hasStoreActions: (value: unknown): value is ITaskStoreActions => {
        if (typeof value !== 'object' || value === null) return false;
        const actions = value as Partial<ITaskStoreActions>;
        return (
            typeof actions.handleTaskError === 'function' &&
            typeof actions.clearTaskErrors === 'function' &&
            typeof actions.startTask === 'function' &&
            typeof actions.completeTask === 'function'
        );
    }
};
