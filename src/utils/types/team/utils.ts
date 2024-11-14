/**
 * @file utils.ts
 * @path KaibanJS/src/utils/types/team/utils.ts
 * @description Team utility types and interfaces
 */

import { AgentType, TaskType } from '@/utils/types';
import { WORKFLOW_STATUS_enum, TASK_STATUS_enum } from '../common';
import { LLMUsageStats } from '../llm';
import { CostDetails } from '../workflow';

// Team initialization parameters
export interface TeamInitParams {
    name: string;
    agents?: AgentType[];
    tasks?: TaskType[];
    inputs?: Record<string, unknown>;
    env?: Record<string, unknown>;
    logLevel?: string;
}

// Team operation configuration
export interface TeamOperationConfig {
    timeout?: number;
    maxRetries?: number;
    retryDelay?: number;
    signal?: AbortSignal;
    metadata?: Record<string, unknown>;
}

// Team execution context
export interface TeamExecutionContext {
    startTime: number;
    status: keyof typeof WORKFLOW_STATUS_enum;
    activeAgents: string[];
    completedTasks: string[];
    stats: {
        taskCount: number;
        completedTaskCount: number;
        completionPercentage: number;
        taskStatusCounts: Record<keyof typeof TASK_STATUS_enum, number>;
        llmUsageStats: LLMUsageStats;
        costDetails: CostDetails;
    };
    lastError?: Error;
}

// Team performance metrics
export interface TeamPerformanceMetrics {
    tasks: {
        total: number;
        completed: number;
        failed: number;
        averageDuration: number;
        successRate: number;
    };
    resources: {
        memory: number;
        cpu: number;
        averageLatency: number;
        maxLatency: number;
    };
    costs: {
        total: number;
        breakdown: CostDetails;
        costPerTask: number;
        costPerToken: number;
    };
    llm: {
        totalTokens: number;
        inputTokens: number;
        outputTokens: number;
        tokensPerTask: number;
        tokensPerSecond: number;
    };
}

// Team validation result
export interface TeamValidationResult {
    isValid: boolean;
    errors: string[];
    warnings?: string[];
    context?: Record<string, unknown>;
}

// Team state snapshot
export interface TeamStateSnapshot {
    timestamp: number;
    status: keyof typeof WORKFLOW_STATUS_enum;
    agents: {
        id: string;
        name: string;
        status: string;
    }[];
    tasks: {
        id: string;
        title: string;
        status: string;
    }[];
    metrics: TeamPerformanceMetrics;
    resources: {
        memory: number;
        cpu: number;
        tokens: number;
    };
}

// Team utility type guards
export const TeamUtilityGuards = {
    isTeamInitParams: (value: unknown): value is TeamInitParams => {
        if (typeof value !== 'object' || value === null) return false;
        const params = value as Partial<TeamInitParams>;
        return typeof params.name === 'string';
    },

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

// Team utility functions
export const TeamUtils = {
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
