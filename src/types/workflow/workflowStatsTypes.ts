/**
 * @file workflowStatsTypes.ts
 * @path KaibanJS/src/types/workflow/workflowStatsTypes.ts
 * @description Statistical type definitions for workflow metrics and costs
 *
 * @module types/workflow
 */

import { ILLMUsageStats } from "../llm/llmResponseTypes";
import { ICostDetails, ICostBreakdown } from "./workflowCostsTypes";

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
    modelUsage: ILLMUsageStats & {
        costBreakdown: {
            total: number;
        };
    };
    startTime: number;
    endTime: number;
    duration: number;
    llmUsageStats: ILLMUsageStats;
    iterationCount: number;
}

// ─── Workflow-Level Metrics ──────────────────────────────────────────────────

/**
 * Workflow-level task metrics
 */
export interface IWorkflowTaskMetrics {
    completed: number;
    failed: number;
    blocked: number;
    average_duration: number;
}

/**
 * Resource utilization metrics
 */
export interface IResourceMetrics {
    peak_memory: number;
    average_memory: number;
    peak_tokens_per_second: number;
    average_tokens_per_second: number;
}

/**
 * Error tracking metrics
 */
export interface IErrorMetrics {
    total: number;
    by_type: Record<string, number>;
    recovery_attempts: number;
    recovery_success_rate: number;
}

/**
 * Timing metrics
 */
export interface ITimingMetrics {
    total_runtime: number;
    average_task_time: number;
    average_agent_response_time: number;
    idle_time: number;
}

/**
 * Complete performance metrics interface
 */
export interface IPerformanceMetrics {
    tasks: IWorkflowTaskMetrics;
    resources: IResourceMetrics;
    errors: IErrorMetrics;
    timing: ITimingMetrics;
}

/**
 * Workflow statistics interface
 */
export interface IWorkflowStats {
    startTime: number;
    endTime: number;
    duration: number;
    llmUsageStats: ILLMUsageStats;
    iterationCount: number;
    costDetails: ICostDetails;
    taskCount: number;
    agentCount: number;
    teamName: string;
    messageCount: number;
    modelUsage: IModelUsageStats;
}

