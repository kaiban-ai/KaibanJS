/**
 * @file stats.ts
 * @path src/types/workflow/stats.ts
 * @description Statistical type definitions for workflow metrics and costs
 */

import { LLMUsageStats } from "../llm/responses";

/**
 * Token usage breakdown interface
 */
export interface TokenUsageBreakdown {
    count: number;
    cost: number;
}

/**
 * Cost breakdown interface
 */
export interface CostBreakdown {
    promptTokens: TokenUsageBreakdown;
    completionTokens: TokenUsageBreakdown;
    functionCalls?: TokenUsageBreakdown;
}

/**
 * Cost details interface
 */
export interface CostDetails {
    inputCost: number;
    outputCost: number;
    totalCost: number;
    currency: string;
    breakdown: CostBreakdown;
}

/**
 * Model latency metrics
 */
export interface ModelLatencyMetrics {
    average: number;
    p95: number;
    max: number;
}

/**
 * Model request metrics
 */
export interface ModelRequestMetrics {
    successful: number;
    failed: number;
}

/**
 * Model token metrics
 */
export interface ModelTokenMetrics {
    input: number;
    output: number;
}

/**
 * Individual model statistics
 */
export interface ModelStats {
    tokens: ModelTokenMetrics;
    requests: ModelRequestMetrics;
    latency: ModelLatencyMetrics;
    cost: number;
}

/**
 * Complete model usage statistics
 */
export interface ModelUsageStats {
    [model: string]: ModelStats;
}

/**
 * Task stats with LLM model usage data
 */
export interface TaskStatsWithModelUsage {
    modelUsage: {
        [key: string]: LLMUsageStats & {
            costBreakdown: {
                total: number;
            };
        };
    };
    startTime: number;
    endTime: number;
    duration: number;
    llmUsageStats: LLMUsageStats;
    iterationCount: number;
}

/**
 * Workflow-level task metrics
 */
export interface WorkflowTaskMetrics {
    completed: number;
    failed: number;
    blocked: number;
    average_duration: number;
}

/**
 * Resource utilization metrics
 */
export interface ResourceMetrics {
    peak_memory: number;
    average_memory: number;
    peak_tokens_per_second: number;
    average_tokens_per_second: number;
}

/**
 * Error tracking metrics
 */
export interface ErrorMetrics {
    total: number;
    by_type: Record<string, number>;
    recovery_attempts: number;
    recovery_success_rate: number;
}

/**
 * Timing metrics
 */
export interface TimingMetrics {
    total_runtime: number;
    average_task_time: number;
    average_agent_response_time: number;
    idle_time: number;
}

/**
 * Complete performance metrics interface
 */
export interface PerformanceMetrics {
    tasks: WorkflowTaskMetrics;
    resources: ResourceMetrics;
    errors: ErrorMetrics;
    timing: TimingMetrics;
}

/**
 * Budget state interface
 */
export interface CurrentBudget {
    tokens: number;
    cost: number;
}

/**
 * Budget limits interface
 */
export interface BudgetLimits {
    max_tokens: number;
    max_cost: number;
}

/**
 * Budget projections interface
 */
export interface BudgetProjections {
    tokens_at_completion: number;
    final_cost: number;
}

/**
 * Budget alerts interface
 */
export interface BudgetAlerts {
    budget_warnings: number;
    budget_exceeded: boolean;
    last_warning_at?: number;
}

/**
 * Complete budget tracking interface
 */
export interface BudgetStats {
    current: CurrentBudget;
    limits: BudgetLimits;
    projected: BudgetProjections;
    alerts: BudgetAlerts;
}

/**
 * Workflow statistics interface
 */
export interface WorkflowStats {
    startTime: number;
    endTime: number;
    duration: number;
    llmUsageStats: LLMUsageStats;
    iterationCount: number;
    costDetails: CostDetails;
    taskCount: number;
    agentCount: number;
    teamName: string;
    messageCount: number;
    modelUsage: Record<string, ModelStats>;
}