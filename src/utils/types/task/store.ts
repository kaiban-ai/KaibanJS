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

// ─── Task Runtime State ────────────────────────────────────────────────────────

/**
 * Current runtime state of task execution
 */
export interface TaskRuntimeState {
    /** Currently executing task */
    currentTask: TaskType | null;
    /** Last encountered error */
    lastError: Error | null;
    /** Task initialization status */
    tasksInitialized: boolean;
}

// ─── Task Execution Stats ───────────────────────────────────────────────────────

/**
 * Task execution statistics
 */
export interface TaskExecutionStats {
    /** Resource utilization */
    resources: {
        /** Memory usage in MB */
        memory: number;
        /** CPU usage percentage */
        cpu: number;
        /** Token count */
        tokens: number;
    };
    /** Performance metrics */
    performance: {
        /** Average execution time */
        averageExecutionTime: number;
        /** Peak memory usage */
        peakMemoryUsage: number;
        /** Token processing rate */
        tokensPerSecond: number;
    };
    /** Error tracking */
    errors: {
        /** Total error count */
        count: number;
        /** Error types and frequencies */
        types: Record<string, number>;
        /** Retry attempts */
        retries: number;
    };
}

// ─── Task Update Parameters ─────────────────────────────────────────────────────

/**
 * Parameters for task status updates
 */
export interface TaskStatusUpdateParams {
    /** Task identifier */
    taskId: string;
    /** New task status */
    status: keyof typeof TASK_STATUS_enum;
    /** Optional metadata */
    metadata?: {
        /** Reason for status change */
        reason?: string;
        /** Actor who changed status */
        changedBy?: string;
        /** Update timestamp */
        timestamp?: number;
        /** Previous task status */
        previousStatus?: keyof typeof TASK_STATUS_enum;
        /** Duration in current status */
        statusDuration?: number;
    };
}

// ─── Task Store Actions ────────────────────────────────────────────────────────

/**
 * Available task store actions
 */
export interface TaskStoreActions {
    /**
     * Handle task completion
     */
    handleTaskCompletion: (params: {
        /** Executing agent */
        agent: AgentType;
        /** Target task */
        task: TaskType;
        /** Task result */
        result: unknown;
        /** Additional metadata */
        metadata?: {
            /** Execution duration */
            duration?: number;
            /** Iteration count */
            iterationCount?: number;
            /** LLM usage statistics */
            llmUsageStats?: TaskStoreState['stats']['llmUsageStats'];
            /** Cost details */
            costDetails?: CostDetails;
        };
    }) => void;

    /**
     * Handle task error
     */
    handleTaskError: (params: {
        /** Target task */
        task: TaskType;
        /** Error that occurred */
        error: ErrorType;
        /** Error context */
        context?: {
            /** Execution phase */
            phase?: string;
            /** Attempt number */
            attemptNumber?: number;
            /** Last successful operation */
            lastSuccessfulOperation?: string;
            /** Whether recovery is possible */
            recoveryPossible?: boolean;
        };
    }) => void;

    /**
     * Update task status
     */
    handleTaskStatusChange: (
        /** Task identifier */
        taskId: string,
        /** New status */
        status: keyof typeof TASK_STATUS_enum,
        /** Optional metadata */
        metadata?: Record<string, unknown>
    ) => void;

    /**
     * Add feedback to task
     */
    addTaskFeedback: (
        /** Task identifier */
        taskId: string,
        /** Feedback content */
        content: string,
        /** Optional metadata */
        metadata?: Record<string, unknown>
    ) => void;

    /**
     * Update task statistics
     */
    updateTaskStats: (params: {
        /** Task identifier */
        taskId: string;
        /** Updated statistics */
        stats: Partial<TaskStats>;
        /** Task output */
        output?: Output;
    }) => void;

    /**
     * Track resource usage
     */
    trackResourceUsage: (params: {
        /** Task identifier */
        taskId: string;
        /** Resource statistics */
        resourceStats: {
            /** Memory usage in MB */
            memory: number;
            /** Token count */
            tokens: number;
            /** CPU time in ms */
            cpuTime?: number;
        };
    }) => void;
}

// ─── Task Store State ─────────────────────────────────────────────────────────

/**
 * Complete task store state extending base store state
 */
export interface TaskStoreState extends BaseStoreState {
    /** Runtime state */
    runtime: TaskRuntimeState;
    /** Execution stats */
    stats: TaskExecutionStats;
}

// ─── Type Guards ────────────────────────────────────────────────────────────────

/**
 * Type guards for task store types
 */
export const TaskStoreTypeGuards = {
    /**
     * Check if value is TaskStoreState
     */
    isTaskStoreState: (value: unknown): value is TaskStoreState => {
        return (
            typeof value === 'object' &&
            value !== null &&
            'runtime' in value &&
            'stats' in value
        );
    },

    /**
     * Check if value has task store actions
     */
    hasTaskStoreActions: (value: unknown): value is TaskStoreActions => {
        return (
            typeof value === 'object' &&
            value !== null &&
            'handleTaskCompletion' in value &&
            'handleTaskError' in value &&
            'handleTaskStatusChange' in value
        );
    },

    /**
     * Check if value is task status update params
     */
    isTaskStatusUpdateParams: (value: unknown): value is TaskStatusUpdateParams => {
        return (
            typeof value === 'object' &&
            value !== null &&
            'taskId' in value &&
            'status' in value
        );
    }
};