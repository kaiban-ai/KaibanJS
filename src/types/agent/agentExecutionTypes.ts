/**
 * @file agentExecutionTypes.ts
 * @path KaibanJS/src/types/agent/agentExecutionTypes.ts
 * @description Agent execution types and interfaces
 */

import type { IAgentType } from './agentBaseTypes';
import type { ITaskType } from '../task/taskBaseTypes';
import type { IErrorType } from '../common/errorTypes';
import type { IAgentResourceMetrics } from './agentMetricTypes';
import type { IAgentPerformanceMetrics } from './agentMetricTypes';

// ─── Execution Types ────────────────────────────────────────────────────────

/**
 * Agent execution metadata interface
 */
export interface IAgentExecutionMetadata {
    lastTaskId?: string;      // Last completed task ID
    lastError?: IErrorType;   // Last error if any
    recovery?: {
        startTime?: number;   // Recovery start time
        endTime?: number;     // Recovery end time
        strategy?: string;    // Recovery strategy used
        attempts?: number;    // Number of recovery attempts
    };
    performance?: {           // Performance metrics
        avgTaskTime: number;  // Average task completion time
        successRate: number;  // Success rate
        errorRate: number;    // Error rate
    };
    [key: string]: unknown;   // Custom metadata
}

/**
 * Agent execution context interface
 */
export interface IAgentExecutionContext {
    agent: IAgentType;       // Agent instance
    task: ITaskType;         // Current task
    metadata: Record<string, unknown>;  // Context metadata
}

/**
 * Agent execution result interface
 */
export interface IAgentExecutionResult {
    success: boolean;        // Success status
    data?: unknown;          // Result data
    error?: IErrorType;      // Error if any
    metrics: IAgentResourceMetrics;  // Execution metrics
    metadata: Record<string, unknown>;  // Result metadata
}

/**
 * Agent execution error context
 */
export interface IAgentExecutionErrorContext {
    operation: string;       // Operation that caused the error
    state: IAgentType;      // Agent state at time of error
    recoveryAttempts?: number;  // Recovery attempts if any
    recoveryStrategy?: string;  // Recovery strategy if any
    validationResult?: unknown;  // Validation result if any
    [key: string]: unknown;  // Additional context
}

/**
 * Agent execution history entry interface
 */
export interface IAgentExecutionHistoryEntry {
    timestamp: number;
    eventType: string;
    statusChange?: {
        from: string;
        to: string;
    };
    taskId?: string;
    details?: Record<string, unknown>;
    metadata?: {
        duration?: number;
        success?: boolean;
        error?: IErrorType;
    };
}

// ─── Type Guards ────────────────────────────────────────────────────────────

export const ExecutionTypeGuards = {
    isAgentExecutionContext: (value: unknown): value is IAgentExecutionContext => {
        if (typeof value !== 'object' || value === null) return false;
        const context = value as Partial<IAgentExecutionContext>;
        return (
            typeof context.agent === 'object' &&
            context.agent !== null &&
            typeof context.task === 'object' &&
            context.task !== null &&
            typeof context.metadata === 'object' &&
            context.metadata !== null
        );
    },

    isAgentExecutionResult: (value: unknown): value is IAgentExecutionResult => {
        if (typeof value !== 'object' || value === null) return false;
        const result = value as Partial<IAgentExecutionResult>;
        return (
            typeof result.success === 'boolean' &&
            typeof result.metrics === 'object' &&
            result.metrics !== null &&
            typeof result.metadata === 'object' &&
            result.metadata !== null
        );
    },

    isAgentExecutionErrorContext: (value: unknown): value is IAgentExecutionErrorContext => {
        if (typeof value !== 'object' || value === null) return false;
        const context = value as Partial<IAgentExecutionErrorContext>;
        return (
            typeof context.operation === 'string' &&
            typeof context.state === 'object' &&
            context.state !== null
        );
    },

    isAgentExecutionHistoryEntry: (value: unknown): value is IAgentExecutionHistoryEntry => {
        if (typeof value !== 'object' || value === null) return false;
        const entry = value as Partial<IAgentExecutionHistoryEntry>;
        return (
            typeof entry.timestamp === 'number' &&
            typeof entry.eventType === 'string'
        );
    }
};
