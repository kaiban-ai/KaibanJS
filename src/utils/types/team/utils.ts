/**
 * @file utils.ts
 * @path src/utils/types/team/utils.ts
 * @description Team utility types and interfaces
 */

import { AgentType, TaskType } from '@/utils/types';
import { WORKFLOW_STATUS_enum, TASK_STATUS_enum } from '../common/enums';
import { LLMUsageStats } from '../llm/responses';
import { CostDetails } from '../workflow/stats';

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
    /** Execution timeout */
    timeout?: number;
    
    /** Maximum retries */
    maxRetries?: number;
    
    /** Retry delay in milliseconds */
    retryDelay?: number;
    
    /** Abort signal */
    signal?: AbortSignal;
    
    /** Operation metadata */
    metadata?: Record<string, unknown>;
}

/**
 * Team execution context
 */
export interface TeamExecutionContext {
    /** Start timestamp */
    startTime: number;
    
    /** Workflow status */
    status: keyof typeof WORKFLOW_STATUS_enum;
    
    /** Active agent IDs */
    activeAgents: string[];
    
    /** Completed task IDs */
    completedTasks: string[];
    
    /** Statistics */
    stats: {
        /** Total tasks */
        taskCount: number;
        /** Completed tasks */
        completedTaskCount: number;
        /** Task completion percentage */
        completionPercentage: number;
        /** Task status counts */
        taskStatusCounts: Record<keyof typeof TASK_STATUS_enum, number>;
        /** LLM usage stats */
        llmUsageStats: LLMUsageStats;
        /** Cost details */
        costDetails: CostDetails;
    };
    
    /** Last error */
    lastError?: Error;
}

/**
 * Team performance metrics
 */
export interface TeamPerformanceMetrics {
    /** Task metrics */
    tasks: {
        /** Total tasks */
        total: number;
        /** Completed tasks */
        completed: number;
        /** Failed tasks */
        failed: number;
        /** Average task duration */
        averageDuration: number;
        /** Task success rate */
        successRate: number;
    };
    
    /** Resource metrics */
    resources: {
        /** Memory usage */
        memory: number;
        /** CPU usage */
        cpu: number;
        /** Average latency */
        averageLatency: number;
        /** Maximum latency */
        maxLatency: number;
    };
    
    /** Cost metrics */
    costs: {
        /** Total cost */
        total: number;
        /** Cost breakdown */
        breakdown: CostDetails;
        /** Cost per task */
        costPerTask: number;
        /** Cost per token */
        costPerToken: number;
    };
    
    /** LLM metrics */
    llm: {
        /** Total tokens */
        totalTokens: number;
        /** Input tokens */
        inputTokens: number;
        /** Output tokens */
        outputTokens: number;
        /** Average tokens per task */
        tokensPerTask: number;
        /** Token rate */
        tokensPerSecond: number;
    };
}

/**
 * Team validation result
 */
export interface TeamValidationResult {
    /** Validation success */
    isValid: boolean;
    
    /** Validation errors */
    errors: string[];
    
    /** Optional warnings */
    warnings?: string[];
    
    /** Validation context */
    context?: Record<string, unknown>;
}

/**
 * Team state snapshot
 */
export interface TeamStateSnapshot {
    /** Snapshot timestamp */
    timestamp: number;
    
    /** Workflow status */
    status: keyof typeof WORKFLOW_STATUS_enum;
    
    /** Active agents */
    agents: {
        id: string;
        name: string;
        status: string;
    }[];
    
    /** Active tasks */
    tasks: {
        id: string;
        title: string;
        status: string;
    }[];
    
    /** Performance metrics */
    metrics: TeamPerformanceMetrics;
    
    /** Resource usage */
    resources: {
        memory: number;
        cpu: number;
        tokens: number;
    };
}

/**
 * Team utility type guards
 */
export const TeamUtilityGuards = {
    /**
     * Check if value is team init params
     */
    isTeamInitParams: (value: unknown): value is TeamInitParams => {
        if (typeof value !== 'object' || value === null) return false;
        const params = value as Partial<TeamInitParams>;
        return typeof params.name === 'string';
    },

    /**
     * Check if value is team execution context
     */
    isTeamExecutionContext: (value: unknown): value is TeamExecutionContext => {
        if (typeof value !== 'object' || value === null) return false;
        const context = value as Partial<TeamExecutionContext>;
        return (
            typeof context.startTime === 'number' &&
            typeof context.status === 'string' &&
            Array.isArray(context.activeAgents) &&
            Array.isArray(context.completedTasks)
        );
    },

    /**
     * Check if value is team performance metrics
     */
    isTeamPerformanceMetrics: (value: unknown): value is TeamPerformanceMetrics => {
        if (typeof value !== 'object' || value === null) return false;
        const metrics = value as Partial<TeamPerformanceMetrics>;
        return (
            typeof metrics.tasks === 'object' &&
            metrics.tasks !== null &&
            typeof metrics.resources === 'object' &&
            metrics.resources !== null &&
            typeof metrics.costs === 'object' &&
            metrics.costs !== null &&
            typeof metrics.llm === 'object' &&
            metrics.llm !== null
        );
    }
};

/**
 * Team utility functions
 */
export const TeamUtils = {
    /**
     * Create empty execution context
     */
    createEmptyContext: (): TeamExecutionContext => ({
        startTime: Date.now(),
        status: 'INITIAL',
        activeAgents: [],
        completedTasks: [],
        stats: {
            taskCount: 0,
            completedTaskCount: 0,
            completionPercentage: 0,
            taskStatusCounts: {
                PENDING: 0,
                TODO: 0,
                DOING: 0,
                BLOCKED: 0,
                REVISE: 0,
                DONE: 0,
                ERROR: 0,
                AWAITING_VALIDATION: 0,
                VALIDATED: 0
            },
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
     * Create empty performance metrics
     */
    createEmptyMetrics: (): TeamPerformanceMetrics => ({
        tasks: {
            total: 0,
            completed: 0,
            failed: 0,
            averageDuration: 0,
            successRate: 0
        },
        resources: {
            memory: 0,
            cpu: 0,
            averageLatency: 0,
            maxLatency: 0
        },
        costs: {
            total: 0,
            breakdown: {
                inputCost: 0,
                outputCost: 0,
                totalCost: 0,
                currency: 'USD',
                breakdown: {
                    promptTokens: { count: 0, cost: 0 },
                    completionTokens: { count: 0, cost: 0 }
                }
            },
            costPerTask: 0,
            costPerToken: 0
        },
        llm: {
            totalTokens: 0,
            inputTokens: 0,
            outputTokens: 0,
            tokensPerTask: 0,
            tokensPerSecond: 0
        }
    })
};

// Re-export utility functions with explicit names
export const {
    createEmptyContext,
    createEmptyMetrics
} = TeamUtils;