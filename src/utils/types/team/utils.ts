/**
 * @file utils.ts
 * @path src/utils/types/team/utils.ts
 * @description Team utility types and helper interfaces
 */

import { AgentType } from '../agent/base';
import { TaskType } from '../task/base';
import { LLMUsageStats } from '../llm/responses';
import { CostDetails } from '../workflow/stats';
import { WORKFLOW_STATUS_enum, TASK_STATUS_enum } from '../common/enums';
import { Log } from './logs';
import type { TeamState, TeamStore } from './base';
import type { WorkflowStartResult } from './handlers';

/**
 * Team initialization parameters
 */
export interface TeamInitParams {
    /** Team name */
    name: string;
    /** Initial agents */
    agents?: AgentType[];
    /** Initial tasks */
    tasks?: TaskType[];
    /** Initial inputs */
    inputs?: Record<string, unknown>;
    /** Environment variables */
    env?: Record<string, unknown>;
    /** Log level */
    logLevel?: string;
}

/**
 * Team operation configuration
 */
export interface TeamOperationConfig {
    /** Operation timeout in milliseconds */
    timeout?: number;
    /** Maximum retries */
    maxRetries?: number;
    /** Retry delay in milliseconds */
    retryDelay?: number;
    /** Whether to use exponential backoff */
    useExponentialBackoff?: boolean;
    /** Maximum concurrent operations */
    maxConcurrent?: number;
}

/**
 * Team execution context
 */
export interface TeamExecutionContext {
    /** Start timestamp */
    startTime: number;
    /** End timestamp */
    endTime?: number;
    /** Current status */
    status: keyof typeof WORKFLOW_STATUS_enum;
    /** Active agents */
    activeAgents: string[];
    /** Completed tasks */
    completedTasks: string[];
    /** Current task */
    currentTask?: string;
    /** Last error */
    lastError?: Error;
    /** Execution metrics */
    metrics: {
        /** Total tasks */
        totalTasks: number;
        /** Completed tasks */
        completedTasks: number;
        /** Failed tasks */
        failedTasks: number;
        /** Total iterations */
        totalIterations: number;
        /** LLM usage stats */
        llmUsageStats: LLMUsageStats;
        /** Cost details */
        costDetails: CostDetails;
    };
}

/**
 * Team performance metrics
 */
export interface TeamPerformanceMetrics {
    /** Task completion rate */
    taskCompletionRate: number;
    /** Average task duration */
    averageTaskDuration: number;
    /** Error rate */
    errorRate: number;
    /** Average iterations per task */
    averageIterations: number;
    /** Resource utilization */
    resourceUtilization: {
        /** Memory usage */
        memoryUsage: number;
        /** CPU usage */
        cpuUsage: number;
        /** Token usage */
        tokenUsage: {
            /** Input tokens */
            input: number;
            /** Output tokens */
            output: number;
            /** Total tokens */
            total: number;
        };
    };
    /** Cost metrics */
    costMetrics: {
        /** Cost per task */
        costPerTask: number;
        /** Cost per token */
        costPerToken: number;
        /** Total cost */
        totalCost: number;
    };
}

/**
 * Team validation result
 */
export interface TeamValidationResult {
    /** Is valid flag */
    isValid: boolean;
    /** Validation errors */
    errors: string[];
    /** Optional warnings */
    warnings?: string[];
    /** Validation metadata */
    metadata?: {
        /** Timestamp */
        timestamp: number;
        /** Validator name */
        validator: string;
        /** Validation context */
        context?: Record<string, unknown>;
    };
}

/**
 * Team state snapshot
 */
export interface TeamStateSnapshot {
    /** Timestamp */
    timestamp: number;
    /** Workflow status */
    workflowStatus: keyof typeof WORKFLOW_STATUS_enum;
    /** Task statuses */
    taskStatuses: Record<string, keyof typeof TASK_STATUS_enum>;
    /** Active agents */
    activeAgents: string[];
    /** Performance metrics */
    metrics: TeamPerformanceMetrics;
    /** Execution context */
    context: TeamExecutionContext;
}

/**
 * Utility functions for team operations
 */
export const TeamUtils = {
    /**
     * Create a new execution context
     */
    createExecutionContext: (teamName: string): TeamExecutionContext => ({
        startTime: Date.now(),
        status: 'INITIAL',
        activeAgents: [],
        completedTasks: [],
        metrics: {
            totalTasks: 0,
            completedTasks: 0,
            failedTasks: 0,
            totalIterations: 0,
            llmUsageStats: {
                inputTokens: 0,
                outputTokens: 0,
                callsCount: 0,
                callsErrorCount: 0,
                parsingErrors: 0,
                totalLatency: 0,
                averageLatency: 0,
                lastUsed: Date.now(),
                memoryUtilization: {
                    peakMemoryUsage: 0,
                    averageMemoryUsage: 0,
                    cleanupEvents: 0
                },
                costBreakdown: {
                    input: 0,
                    output: 0,
                    total: 0,
                    currency: 'USD'
                }
            },
            costDetails: {
                inputCost: 0,
                outputCost: 0,
                totalCost: 0,
                currency: 'USD',
                breakdown: {
                    promptTokens: { count: 0, cost: 0 },
                    completionTokens: { count: 0, cost: 0 }
                }
            }
        }
    }),

    /**
     * Calculate team performance metrics
     */
    calculateMetrics: (
        tasks: TaskType[],
        logs: Log[],
        context: TeamExecutionContext
    ): TeamPerformanceMetrics => {
        const completedTasks = tasks.filter(t => t.status === 'DONE').length;
        const failedTasks = tasks.filter(t => t.status === 'ERROR').length;
        const totalTasks = tasks.length;

        return {
            taskCompletionRate: totalTasks ? (completedTasks / totalTasks) * 100 : 0,
            averageTaskDuration: context.metrics.totalTasks ? 
                (context.endTime || Date.now() - context.startTime) / context.metrics.totalTasks : 0,
            errorRate: totalTasks ? (failedTasks / totalTasks) * 100 : 0,
            averageIterations: totalTasks ? context.metrics.totalIterations / totalTasks : 0,
            resourceUtilization: {
                memoryUsage: context.metrics.llmUsageStats.memoryUtilization.averageMemoryUsage,
                cpuUsage: 0, // Would need actual CPU metrics
                tokenUsage: {
                    input: context.metrics.llmUsageStats.inputTokens,
                    output: context.metrics.llmUsageStats.outputTokens,
                    total: context.metrics.llmUsageStats.inputTokens + context.metrics.llmUsageStats.outputTokens
                }
            },
            costMetrics: {
                costPerTask: totalTasks ? context.metrics.costDetails.totalCost / totalTasks : 0,
                costPerToken: context.metrics.llmUsageStats.inputTokens + context.metrics.llmUsageStats.outputTokens ? 
                    context.metrics.costDetails.totalCost / (context.metrics.llmUsageStats.inputTokens + context.metrics.llmUsageStats.outputTokens) : 0,
                totalCost: context.metrics.costDetails.totalCost
            }
        };
    },

    /**
     * Create a state snapshot
     */
    createSnapshot: (
        tasks: TaskType[],
        agents: AgentType[],
        context: TeamExecutionContext
    ): TeamStateSnapshot => ({
        timestamp: Date.now(),
        workflowStatus: context.status,
        taskStatuses: tasks.reduce((acc, task) => ({
            ...acc,
            [task.id]: task.status
        }), {}),
        activeAgents: agents.filter(a => a.status !== 'IDLE').map(a => a.id),
        metrics: TeamUtils.calculateMetrics(tasks, [], context),
        context
    })
};

/**
 * Type guards for team utilities
 */
export const TeamUtilityGuards = {
    /**
     * Check if value is TeamInitParams
     */
    isTeamInitParams: (value: unknown): value is TeamInitParams => {
        return (
            typeof value === 'object' &&
            value !== null &&
            'name' in value &&
            typeof (value as TeamInitParams).name === 'string'
        );
    },

    /**
     * Check if value is TeamExecutionContext
     */
    isTeamExecutionContext: (value: unknown): value is TeamExecutionContext => {
        return (
            typeof value === 'object' &&
            value !== null &&
            'startTime' in value &&
            'status' in value &&
            'activeAgents' in value &&
            'completedTasks' in value &&
            'metrics' in value
        );
    },

    /**
     * Check if value is TeamStateSnapshot
     */
    isTeamStateSnapshot: (value: unknown): value is TeamStateSnapshot => {
        return (
            typeof value === 'object' &&
            value !== null &&
            'timestamp' in value &&
            'workflowStatus' in value &&
            'taskStatuses' in value &&
            'activeAgents' in value &&
            'metrics' in value &&
            'context' in value
        );
    }
};

/**
 * Convenience type for store subscription
 */
export type TeamStoreSubscriber<U = TeamState> = (
    state: TeamState,
    previousState: TeamState
) => void | ((selectedState: U, previousSelectedState: U) => void);

/**
 * Type guard utilities for team functionality
 */
export const TeamTypeUtils = {
    /**
     * Type guard to check if a value is a complete team state
     */
    isCompleteTeamState(value: unknown): value is TeamState {
        return (
            typeof value === 'object' &&
            value !== null &&
            'name' in value &&
            'agents' in value &&
            'tasks' in value &&
            'workflowLogs' in value &&
            'teamWorkflowStatus' in value &&
            'workflowResult' in value &&
            'inputs' in value &&
            'workflowContext' in value &&
            'env' in value &&
            'logLevel' in value &&
            'tasksInitialized' in value
        );
    },

    /**
     * Type guard to check if a value is a valid team store
     */
    isTeamStore(value: unknown): value is TeamStore {
        return (
            typeof value === 'object' &&
            value !== null &&
            'getState' in value &&
            'setState' in value &&
            'subscribe' in value &&
            'destroy' in value &&
            this.isCompleteTeamState((value as TeamStore).getState())
        );
    }
};

// Re-export guards for backward compatibility
export const {
    isCompleteTeamState,
    isTeamStore
} = TeamTypeUtils;

/**
 * @deprecated Use TeamStore type instead
 */
export type LegacyTeamStore = TeamStore;