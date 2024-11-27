/**
 * @file agentExecutionTypes.ts
 * @path src/types/agent/agentExecutionTypes.ts
 * @description Agent execution state and related type definitions
 *
 * @module @types/agent
 */

import { AGENT_STATUS_enum } from '../common/commonEnums';
import type { IAgentType } from './agentBaseTypes';
import type { ITaskType } from '../task/taskBaseTypes';
import type { IBaseError } from '../common/commonErrorTypes';
import type { IResourceMetrics } from '../common/commonMetricTypes';
import type { ILLMMetrics } from '../llm/llmMetricTypes';

/**
 * Agent execution metadata interface
 */
export interface IAgentExecutionMetadata {
    /** Last completed task ID */
    lastTaskId?: string;
    /** Last error if any */
    lastError?: IBaseError;
    /** Recovery information */
    recovery?: {
        /** Recovery start time */
        startTime?: number;
        /** Recovery end time */
        endTime?: number;
        /** Recovery strategy used */
        strategy?: string;
        /** Number of recovery attempts */
        attempts?: number;
    };
    /** Performance metrics */
    performance?: {
        /** Average task completion time */
        avgTaskTime: number;
        /** Success rate */
        successRate: number;
        /** Error rate */
        errorRate: number;
    };
    /** Custom metadata */
    [key: string]: unknown;
}

/**
 * Agent execution history entry
 */
export interface IAgentExecutionHistoryEntry {
    /** Entry timestamp */
    timestamp: number;
    /** Event type */
    eventType: string;
    /** Status change if any */
    statusChange?: {
        from: AGENT_STATUS_enum;
        to: AGENT_STATUS_enum;
    };
    /** Associated task ID */
    taskId?: string;
    /** Additional details */
    details?: Record<string, unknown>;
}

/**
 * Agent execution performance metrics
 */
export interface IAgentExecutionPerformance {
    /** Total tasks processed */
    totalTasks: number;
    /** Successfully completed tasks */
    completedTasks: number;
    /** Average iterations per task */
    averageIterationsPerTask: number;
    /** Overall performance score */
    performanceScore: number;
}

/**
 * Agent execution state interface
 */
export interface IAgentExecutionState {
    /** Current execution status */
    status: AGENT_STATUS_enum;
    /** Current task being executed */
    currentTask?: ITaskType;
    /** Current iteration count */
    iterationCount: number;
    /** Maximum allowed iterations */
    maxIterations: number;
    /** Maximum retries allowed */
    maxRetries: number;
    /** Start time of current execution */
    startTime: number;
    /** Last update time */
    lastUpdateTime: number;
    /** Last activity timestamp */
    lastActivity: number;
    /** Thinking state */
    thinking: boolean;
    /** Busy state */
    busy: boolean;
    /** Error count */
    errorCount: number;
    /** Retry count */
    retryCount: number;
    /** Timeout duration */
    timeout: number;
    /** Current iteration count */
    iterations: number;
    /** Assigned tasks */
    assignedTasks: ITaskType[];
    /** Completed tasks */
    completedTasks: ITaskType[];
    /** Failed tasks */
    failedTasks: ITaskType[];
    /** Blocked tasks */
    blockedTasks: ITaskType[];
    /** Execution history */
    history: IAgentExecutionHistoryEntry[];
    /** Performance metrics */
    performance: IAgentExecutionPerformance;
    /** Resource usage metrics */
    resourceUsage: IResourceMetrics;
    /** LLM-specific metrics */
    llmMetrics: ILLMMetrics;
    /** Execution metadata */
    metadata: IAgentExecutionMetadata;
}

/**
 * Agent execution context interface
 */
export interface IAgentExecutionContext {
    /** Agent instance */
    agent: IAgentType;
    /** Current task */
    task: ITaskType;
    /** Execution state */
    state: IAgentExecutionState;
    /** Context metadata */
    metadata: Record<string, unknown>;
}

/**
 * Agent execution result interface
 */
export interface IAgentExecutionResult {
    /** Success status */
    success: boolean;
    /** Result data */
    data?: unknown;
    /** Error if any */
    error?: IBaseError;
    /** Execution metrics */
    metrics: {
        /** Duration in milliseconds */
        duration: number;
        /** Memory usage in bytes */
        memoryUsage: number;
        /** CPU usage percentage */
        cpuUsage: number;
    };
    /** Result metadata */
    metadata: Record<string, unknown>;
}

/**
 * Agent execution error context
 */
export interface IAgentExecutionErrorContext {
    /** Operation that caused the error */
    operation: string;
    /** Agent state at time of error */
    state: IAgentType;
    /** Recovery attempts if any */
    recoveryAttempts?: number;
    /** Recovery strategy if any */
    recoveryStrategy?: string;
    /** Validation result if any */
    validationResult?: unknown;
    /** Additional context */
    [key: string]: unknown;
}

/**
 * Type guards
 */
export const AgentExecutionTypeGuards = {
    /**
     * Check if value is AgentExecutionState
     */
    isAgentExecutionState: (value: unknown): value is IAgentExecutionState => {
        if (typeof value !== 'object' || value === null) return false;
        const state = value as Partial<IAgentExecutionState>;
        return (
            'status' in state &&
            typeof state.iterationCount === 'number' &&
            typeof state.maxIterations === 'number' &&
            typeof state.maxRetries === 'number' &&
            typeof state.startTime === 'number' &&
            typeof state.lastUpdateTime === 'number' &&
            typeof state.lastActivity === 'number' &&
            typeof state.thinking === 'boolean' &&
            typeof state.busy === 'boolean' &&
            typeof state.errorCount === 'number' &&
            typeof state.retryCount === 'number' &&
            typeof state.timeout === 'number' &&
            typeof state.iterations === 'number' &&
            Array.isArray(state.assignedTasks) &&
            Array.isArray(state.completedTasks) &&
            Array.isArray(state.failedTasks) &&
            Array.isArray(state.blockedTasks) &&
            Array.isArray(state.history) &&
            typeof state.performance === 'object' &&
            typeof state.resourceUsage === 'object' &&
            typeof state.llmMetrics === 'object' &&
            typeof state.metadata === 'object'
        );
    },

    /**
     * Check if value is AgentExecutionHistoryEntry
     */
    isAgentExecutionHistoryEntry: (value: unknown): value is IAgentExecutionHistoryEntry => {
        if (typeof value !== 'object' || value === null) return false;
        const entry = value as Partial<IAgentExecutionHistoryEntry>;
        return (
            typeof entry.timestamp === 'number' &&
            typeof entry.eventType === 'string'
        );
    }
};
