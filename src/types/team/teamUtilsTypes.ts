/**
 * @file teamUtilsTypes.ts
 * @path KaibanJS/src/types/team/teamUtilsTypes.ts
 * @description Team utility types and interfaces for managing team operations, execution context, and performance metrics
 *
 * @module types/team
 */

import { IAgentType } from '../agent/agentBaseTypes';
import { ITaskType } from '../task/taskBaseTypes';
import { WORKFLOW_STATUS_enum, TASK_STATUS_enum } from '../common';
import { ILLMUsageMetrics } from '../llm/llmMetricTypes';
import { ICostDetails } from '../workflow';

// ─── Team Initialization ────────────────────────────────────────────────────────

/** Team initialization parameters */
export interface ITeamInitParams {
    name: string;
    agents?: IAgentType[];
    tasks?: ITaskType[];
    inputs?: Record<string, unknown>;
    env?: Record<string, unknown>;
    logLevel?: string;
}

// ─── Team Operation Configuration ───────────────────────────────────────────────

/** Team operation configuration */
export interface ITeamOperationConfig {
    timeout?: number;
    maxRetries?: number;
    retryDelay?: number;
    signal?: AbortSignal;
    metadata?: Record<string, unknown>;
}

// ─── Team Execution Context ───────────────────────────────────────────────────

/** Team execution context */
export interface ITeamExecutionContext {
    startTime: number;
    status: keyof typeof WORKFLOW_STATUS_enum;
    activeAgents: string[];
    completedTasks: string[];
    stats: {
        taskCount: number;
        completedTaskCount: number;
        completionPercentage: number;
        taskStatusCounts: Record<keyof typeof TASK_STATUS_enum, number>;
        llmUsageMetrics: ILLMUsageMetrics;
        costDetails: ICostDetails;
    };
    lastError?: Error;
}

// ─── Team Performance Metrics ──────────────────────────────────────────────────

/** Team performance metrics */
export interface ITeamPerformanceMetrics {
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
        breakdown: ICostDetails;
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

// ─── Team Validation ──────────────────────────────────────────────────────────

/** Team validation result */
export interface ITeamValidationResult {
    isValid: boolean;
    errors: string[];
    warnings?: string[];
    context?: Record<string, unknown>;
}

// ─── Team State Snapshots ───────────────────────────────────────────────────

/** Team state snapshot */
export interface ITeamStateSnapshot {
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
    metrics: ITeamPerformanceMetrics;
    resources: {
        memory: number;
        cpu: number;
        tokens: number;
    };
}

// ─── Type Guards ────────────────────────────────────────────────────────────

export const ITeamUtilityGuards = {
    isTeamInitParams: (value: unknown): value is ITeamInitParams => {
        if (!value || typeof value !== 'object') return false;
        const params = value as Partial<ITeamInitParams>;
        return typeof params.name === 'string';
    },

    isTeamExecutionContext: (value: unknown): value is ITeamExecutionContext => {
        if (!value || typeof value !== 'object') return false;
        const context = value as Partial<ITeamExecutionContext>;
        return (
            typeof context.startTime === 'number' &&
            typeof context.status === 'string' &&
            Array.isArray(context.activeAgents) &&
            Array.isArray(context.completedTasks)
        );
    },

    isTeamPerformanceMetrics: (value: unknown): value is ITeamPerformanceMetrics => {
        if (!value || typeof value !== 'object') return false;
        const metrics = value as Partial<ITeamPerformanceMetrics>;
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

// ─── Utility Functions ─────────────────────────────────────────────────────────

/**
 * Create default team execution context
 */
export const createEmptyContext = (): ITeamExecutionContext => ({
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
        llmUsageMetrics: {
            totalRequests: 0,
            activeInstances: 0,
            requestsPerSecond: 0,
            averageResponseLength: 0,
            peakMemoryUsage: 0,
            uptime: 0,
            rateLimit: {
                current: 0,
                limit: 0,
                remaining: 0,
                resetTime: 0
            },
            tokenDistribution: {
                prompt: 0,
                completion: 0,
                total: 0
            },
            modelDistribution: {
                gpt4: 0,
                gpt35: 0,
                other: 0
            },
            timestamp: Date.now()
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
});

/**
 * Create empty metrics object
 */
export const createEmptyMetrics = (): ITeamPerformanceMetrics => ({
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
});
