/**
 * @file task.ts
 * @path src/utils/types/store/task.ts
 * @description Task store specific types and interfaces
 */

import type { BaseStoreState } from './base';
import type { TaskType, TaskStats } from '../task/base';
import type { AgentType } from '../agent/base';
import type { ErrorType } from '../common/errors';
import type { Output } from '../llm/responses';
import type { CostDetails } from '../workflow/stats';
import type { TASK_STATUS_enum } from '../common/enums';

/**
 * Task runtime state
 */
export interface TaskRuntimeState {
    /** Current task being processed */
    currentTask: TaskType | null;
    
    /** Last error encountered */
    lastError: Error | null;
    
    /** Task execution context */
    context: Record<string, unknown>;
}

/**
 * Task execution metrics
 */
export interface TaskExecutionMetrics {
    /** LLM usage statistics */
    llmUsageStats: {
        inputTokens: number;
        outputTokens: number;
        callsCount: number;
        callsErrorCount: number;
        parsingErrors: number;
        totalLatency: number;
        averageLatency: number;
        lastUsed: number;
        memoryUtilization: {
            peakMemoryUsage: number;
            averageMemoryUsage: number;
            cleanupEvents: number;
        };
        costBreakdown: {
            input: number;
            output: number;
            total: number;
            currency: string;
        };
    };
    
    /** Number of iterations */
    iterationCount: number;
    
    /** Total API calls */
    totalCalls: number;
    
    /** Error count */
    errorCount: number;
    
    /** Average latency */
    averageLatency: number;
    
    /** Cost details */
    costDetails: CostDetails;
}

/**
 * Task status update parameters
 */
export interface TaskStatusUpdateParams {
    /** Task ID */
    taskId: string;
    
    /** New status */
    status: keyof typeof TASK_STATUS_enum;
    
    /** Update metadata */
    metadata?: {
        reason?: string;
        changedBy?: string;
        timestamp?: number;
        previousStatus?: keyof typeof TASK_STATUS_enum;
        statusDuration?: number;
    };
}

/**
 * Task store state
 */
export interface TaskStoreState extends BaseStoreState {
    /** Runtime state */
    runtime: TaskRuntimeState;
    
    /** Execution metrics */
    stats: TaskExecutionMetrics;
}

/**
 * Task store actions interface
 */
export interface TaskStoreActions {
    /**
     * Handle task completion
     */
    handleTaskCompletion: (params: {
        agent: AgentType;
        task: TaskType;
        result: unknown;
        metadata?: {
            duration?: number;
            iterationCount?: number;
            llmUsageStats?: TaskExecutionMetrics['llmUsageStats'];
            costDetails?: CostDetails;
        };
    }) => void;

    /**
     * Handle task error
     */
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

    /**
     * Handle task status change
     */
    handleTaskStatusChange: (
        taskId: string,
        status: keyof typeof TASK_STATUS_enum,
        metadata?: Record<string, unknown>
    ) => void;

    /**
     * Add task feedback
     */
    addTaskFeedback: (
        taskId: string,
        content: string,
        metadata?: Record<string, unknown>
    ) => void;

    /**
     * Update task stats
     */
    updateTaskStats: (params: {
        taskId: string;
        stats: Partial<TaskStats>;
        output?: Output;
    }) => void;

    /**
     * Track resource usage
     */
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
 * Type guard utilities for task store
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
            'stats' in value &&
            StoreTypeGuards.isBaseStoreState(value)
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
    }
};