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
import type { IBaseHandlerMetadata } from '../common/commonMetadataTypes';
import type { 
    ITaskResourceMetrics,
    ITaskPerformanceMetrics,
    ITaskUsageMetrics 
} from './taskMetricTypes';
import type { IAgentType } from '../agent/agentBaseTypes';
import type { ITaskExecutionState } from './taskStateTypes';

// ─── Task Handler Types ──────────────────────────────────────────────────────

/** Task-specific metadata interface */
export interface ITaskHandlerMetadata extends IBaseHandlerMetadata {
    taskId: string;
    taskName: string;
    status: keyof typeof TASK_STATUS_enum;
    priority: number;
    assignedAgent?: string;
    progress: number;
    metrics: {
        resources: ITaskResourceMetrics;
        usage: ITaskUsageMetrics;
        performance: ITaskPerformanceMetrics;
    };
    dependencies: {
        completed: string[];
        pending: string[];
        blocked: string[];
    };
}

/** Task handler result type */
export type ITaskHandlerResult<T = unknown> = IHandlerResult<T, ITaskHandlerMetadata>;

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
    resources: ITaskResourceMetrics;
    usage: ITaskUsageMetrics;
    performance: ITaskPerformanceMetrics;
}

// ─── Store Action Types ────────────────────────────────────────────────────────

export interface ITaskErrorActions {
    handleTaskError: (taskId: string, error: Error) => Promise<ITaskHandlerResult<Error>>;
    clearTaskErrors: () => void;
}

export interface ITaskExecutionActions {
    startTask: (taskId: string, agent: IAgentType) => Promise<ITaskHandlerResult<void>>;
    completeTask: (taskId: string) => Promise<ITaskHandlerResult<void>>;
    failTask: (taskId: string, error: Error) => Promise<ITaskHandlerResult<Error>>;
    updateTaskProgress: (taskId: string, progress: number) => Promise<ITaskHandlerResult<number>>;
    blockTask: (taskId: string, reason: string) => Promise<ITaskHandlerResult<string>>;
    unblockTask: (taskId: string) => Promise<ITaskHandlerResult<void>>;
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
    },

    isTaskHandlerMetadata: (value: unknown): value is ITaskHandlerMetadata => {
        if (typeof value !== 'object' || value === null) return false;
        const metadata = value as Partial<ITaskHandlerMetadata>;
        return (
            typeof metadata.taskId === 'string' &&
            typeof metadata.taskName === 'string' &&
            typeof metadata.status === 'string' &&
            typeof metadata.priority === 'number' &&
            typeof metadata.progress === 'number' &&
            typeof metadata.metrics === 'object' &&
            metadata.metrics !== null &&
            typeof metadata.metrics.resources === 'object' &&
            typeof metadata.metrics.usage === 'object' &&
            typeof metadata.metrics.performance === 'object' &&
            typeof metadata.dependencies === 'object' &&
            metadata.dependencies !== null &&
            Array.isArray(metadata.dependencies.completed) &&
            Array.isArray(metadata.dependencies.pending) &&
            Array.isArray(metadata.dependencies.blocked)
        );
    }
};
