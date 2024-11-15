/**
 * @file execution.ts
 * @path KaibanJS/src/utils/types/tool/execution.ts
 * @description Types for tool execution and management
 */

import { Tool } from 'langchain/tools';
import { AgentType } from '../agent/base';
import { TaskType } from '../task/base';
import { ParsedOutput } from '../llm/responses';

export interface LLMUsageStats {
    inputTokens: number;
    outputTokens: number;
    callsCount: number;
    callsErrorCount: number;
    parsingErrors: number;
    totalLatency: number;
    averageLatency: number;
    lastUsed: number;
    memoryUtilization: {
        peakMemoryUsage: number;
        averageMemoryUsage: number;
        cleanupEvents: number;
    };
    costBreakdown: {
        input: number;
        output: number;
        total: number;
        currency: string;
    };
}

export interface CostDetails {
    totalCost: number;
    inputCost: number;
    outputCost: number;
    modelName?: string;
    tokenRates?: {
        inputTokenRate: number;
        outputTokenRate: number;
    };
}

export interface ToolExecutionParams {
    agent: AgentType;
    task: TaskType;
    tool: Tool;
    input: unknown;
    context?: Record<string, unknown>;
    parsedOutput?: ParsedOutput;
}

export interface ToolHandlerParams {
    agent: AgentType;
    task: TaskType;
    tool?: Tool;
    error: Error;
    toolName: string;
}

export interface ToolExecutionResult {
    success: boolean;
    result?: string;
    error?: Error;
    feedbackMessage?: string;
    costDetails?: CostDetails;
    usageStats?: LLMUsageStats;
}

export interface HandlerResult {
    success: boolean;
    message?: string;
    error?: Error;
}
