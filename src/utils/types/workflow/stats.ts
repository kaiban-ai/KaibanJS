/**
 * @file stats.ts
 * @path src/types/workflow/stats.ts
 * @description Workflow statistics interfaces and types
 *
 * @packageDocumentation
 * @module @types/workflow
 */

import { LLMUsageStats } from "../llm";

/**
 * Workflow statistics interface
 */
export interface WorkflowStats {
    /** Start time timestamp */
    startTime: number;
    
    /** End time timestamp */
    endTime: number;
    
    /** Duration in seconds */
    duration: number;
    
    /** LLM usage statistics */
    llmUsageStats: LLMUsageStats;
    
    /** Total iterations */
    iterationCount: number;
    
    /** Cost details */
    costDetails: CostDetails;
    
    /** Task count */
    taskCount: number;
    
    /** Agent count */
    agentCount: number;
    
    /** Team name */
    teamName: string;
    
    /** Message count */
    messageCount: number;
    
    /** Model usage statistics */
    modelUsage: Record<string, LLMUsageStats>;
}

/**
 * Cost details interface
 */
export interface CostDetails {
    /** Input token cost */
    inputCost: number;
    
    /** Output token cost */
    outputCost: number;
    
    /** Total cost */
    totalCost: number;
    
    /** Currency code */
    currency: string;
    
    /** Detailed breakdown */
    breakdown: {
        promptTokens: {
            count: number;
            cost: number;
        };
        completionTokens: {
            count: number;
            cost: number;
        };
        functionCalls?: {
            count: number;
            cost: number;
        };
    };
}

/**
 * Model usage tracking interface
 */
export interface ModelUsageStats {
    [model: string]: {
        tokens: {
            input: number;
            output: number;
        };
        requests: {
            successful: number;
            failed: number;
        };
        latency: {
            average: number;
            p95: number;
            max: number;
        };
        cost: number;
    };
}

/**
 * Performance metrics interface
 */
export interface PerformanceMetrics {
    /** Task completion metrics */
    tasks: {
        completed: number;
        failed: number;
        blocked: number;
        average_duration: number;
    };
    
    /** Resource utilization */
    resources: {
        peak_memory: number;
        average_memory: number;
        peak_tokens_per_second: number;
        average_tokens_per_second: number;
    };
    
    /** Error metrics */
    errors: {
        total: number;
        by_type: Record<string, number>;
        recovery_attempts: number;
        recovery_success_rate: number;
    };
    
    /** Timing metrics */
    timing: {
        total_runtime: number;
        average_task_time: number;
        average_agent_response_time: number;
        idle_time: number;
    };
}

/**
 * Budget tracking interface
 */
export interface BudgetStats {
    /** Current usage */
    current: {
        tokens: number;
        cost: number;
    };
    
    /** Limits */
    limits: {
        max_tokens: number;
        max_cost: number;
    };
    
    /** Projections */
    projected: {
        tokens_at_completion: number;
        final_cost: number;
    };
    
    /** Alerts */
    alerts: {
        budget_warnings: number;
        budget_exceeded: boolean;
        last_warning_at?: number;
    };
}

/**
 * Statistics utility functions
 */
export const StatsUtils = {
    /**
     * Calculate cost rate
     */
    calculateCostRate: (stats: WorkflowStats): number => {
        const duration = (stats.endTime - stats.startTime) / 1000; // in seconds
        return stats.costDetails.totalCost / duration;
    },

    /**
     * Calculate token rate
     */
    calculateTokenRate: (stats: WorkflowStats): number => {
        const duration = (stats.endTime - stats.startTime) / 1000; // in seconds
        const totalTokens = stats.llmUsageStats.inputTokens + stats.llmUsageStats.outputTokens;
        return totalTokens / duration;
    },

    /**
     * Format cost for display
     */
    formatCost: (cost: number, currency: string = 'USD'): string => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(cost);
    }
};