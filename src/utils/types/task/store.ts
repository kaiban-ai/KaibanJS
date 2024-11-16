/**
 * @file store.ts
 * @path KaibanJS/src/utils/types/task/store.ts
 * @description Task store types and interfaces
 */

import type { TaskType, TaskStats } from './base';
import type { AgentType } from '../agent/base';
import type { ErrorType } from '../common/errors';
import type { Output } from '../llm/responses';
import type { CostDetails } from '../workflow/costs';
import type { TASK_STATUS_enum } from '../common/enums';
import type { BaseStoreState } from '../store/base';

/**
 * Current runtime state of task execution
 */
export interface TaskRuntimeState {
    currentTask: TaskType | null;
    lastError: Error | null;
    tasksInitialized: boolean;
}

/**
 * Task execution statistics
 */
export interface TaskExecutionStats {
    resources: {
        memory: number;
        cpu: number;
        tokens: number;
    };
    performance: {
        averageExecutionTime: number;
        peakMemoryUsage: number;
        tokensPerSecond: number;
    };
    errors: {
        count: number;
        types: Record<string, number>;
        retries: number;
    };
    llmUsageStats?: {
        totalTokens?: number;
        promptTokens?: number;
        completionTokens?: number;
        totalCost?: number;
    };
}

/**
 * Parameters for task status updates
 */
export interface TaskStatusUpdateParams {
    taskId: string;
    status: keyof typeof TASK_STATUS_enum;
    metadata?: {
        reason?: string;
        changedBy?: string;
        timestamp?: number;
        previousStatus?: keyof typeof TASK_STATUS_enum;
        statusDuration?: number;
    };
}

/**
 * Available task store actions
 */
export interface TaskStoreActions {
    handleTaskCompletion: (params: {
        agent: AgentType;
        task: TaskType;
        result: unknown;
        metadata?: {
            duration?: number;
            iterationCount?: number;
            llmUsageStats?: TaskStoreState['stats']['llmUsageStats'];
            costDetails?: CostDetails;
        };
    }) => void;

    handleTaskError: (params: {
        task: TaskType;
        error: ErrorType;
        context?: {
            phase?: string;
            attemptNumber?: number;
            lastSuccessfulOperation?: string;
            recoveryPossible?: boolean;
        };
    }) => void;

    handleTaskStatusChange: (
        taskId: string,
        status: keyof typeof TASK_STATUS_enum,
        metadata?: Record<string, unknown>
    ) => void;

    addTaskFeedback: (
        taskId: string,
        content: string,
        metadata?: Record<string, unknown>
    ) => void;

    updateTaskStats: (params: {
        taskId: string;
        stats: Partial<TaskStats>;
        output?: Output;
    }) => void;

    trackResourceUsage: (params: {
        taskId: string;
        resourceStats: {
            memory: number;
            tokens: number;
            cpuTime?: number;
        };
    }) => void;
}

/**
 * Complete task store state extending base store state
 */
export interface TaskStoreState extends BaseStoreState {
    runtime: TaskRuntimeState;
    stats: TaskExecutionStats;
}

/**
 * Type guards for task store types
 */
export const TaskStoreTypeGuards = {
    isTaskStoreState: (value: unknown): value is TaskStoreState => {
        return (
            typeof value === 'object' &&
            value !== null &&
            'runtime' in value &&
            'stats' in value
        );
    },

    hasTaskStoreActions: (value: unknown): value is TaskStoreActions => {
        return (
            typeof value === 'object' &&
            value !== null &&
            'handleTaskCompletion' in value &&
            'handleTaskError' in value &&
            'handleTaskStatusChange' in value
        );
    },

    isTaskStatusUpdateParams: (value: unknown): value is TaskStatusUpdateParams => {
        return (
            typeof value === 'object' &&
            value !== null &&
            'taskId' in value &&
            'status' in value
        );
    }
};
