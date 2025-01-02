/**
 * @file workflowStatsTypes.ts
 * @path KaibanJS/src/types/workflow/workflowStatsTypes.ts
 * @description Statistical type definitions for workflow metrics and costs
 *
 * @module types/workflow
 */

import { ILLMUsageMetrics } from "../llm/llmMetricTypes";

// ─── Token Usage Types ───────────────────────────────────────────────────────

/**
 * Token usage breakdown interface
 */
export interface ITokenUsageBreakdown {
    count: number;
    cost: number;
}

/**
 * Model token metrics
 */
export interface IModelTokenMetrics {
    input: number;
    output: number;
}

/**
 * Model request metrics
 */
export interface IModelRequestMetrics {
    successful: number;
    failed: number;
}

/**
 * Model latency metrics
 */
export interface IModelLatencyMetrics {
    average: number;
    p95: number;
    max: number;
}

/**
 * Individual model statistics
 */
export interface IModelStats {
    tokens: IModelTokenMetrics;
    requests: IModelRequestMetrics;
    latency: IModelLatencyMetrics;
    cost: number;
}

/**
 * Complete model usage statistics
 */
export interface IModelUsageStats {
    [model: string]: IModelStats;
}

/**
 * Task stats with model usage data
 */
export interface ITaskStatsWithModelUsage {
    modelUsage: ILLMUsageMetrics & {
        costBreakdown: {
            inputCost: number;
            outputCost: number;
            totalCost: number;
        };
    };
    duration: number;
}

export interface IWorkflowStats {
    llmUsageMetrics: ILLMUsageMetrics;
    iterationCount: number;
    duration: number;
}

export interface IWorkflowStatsWithMetadata {
    llmUsageMetrics: ILLMUsageMetrics;
    iterationCount: number;
    duration: number;
}
