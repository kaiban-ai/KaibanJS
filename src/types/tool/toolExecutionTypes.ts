/**
 * @file toolExecutionTypes.ts
 * @path KaibanJS/src/types/tool/toolExecutionTypes.ts
 * @description Types for tool execution and management, including execution parameters, results, and statistics
 *
 * @module types/tool
 */

import { Tool } from 'langchain/tools';
import { IAgentType } from '../agent/agentBaseTypes';
import { ITaskType } from '../task/taskBaseTypes';
import { IParsedOutput, ILLMUsageStats } from '../llm/llmResponseTypes';
import { IHandlerResult } from '../common/commonHandlerTypes';
import { IBaseHandlerMetadata } from '../common/commonMetadataTypes';
import { IResourceMetrics, IUsageMetrics, IPerformanceMetrics } from '../common/commonMetricTypes';

// ─── Tool Handler Types ──────────────────────────────────────────────────────

/** Tool-specific execution metrics interface */
export interface IToolExecutionMetrics {
    retryCount: number;
    successRate: number;
    executionTime: number;
    validationTime: number;
}

/** Tool-specific metadata interface */
export interface IToolHandlerMetadata extends IBaseHandlerMetadata {
    toolId: string;
    toolName: string;
    toolType: string;
    executionPhase: 'pre' | 'execute' | 'post';
    metrics: {
        resources: IResourceMetrics;
        usage: IUsageMetrics;
        performance: IPerformanceMetrics;
        execution: IToolExecutionMetrics;
    };
    costDetails: ICostDetails;
    usageStats?: ILLMUsageStats;
}

/** Tool handler result type */
export type IToolHandlerResult<T = unknown> = IHandlerResult<T, IToolHandlerMetadata>;

// ─── Cost Management ───────────────────────────────────────────────────────────

export interface ICostDetails {
    totalCost: number;
    inputCost: number;
    outputCost: number;
    modelName?: string;
    tokenRates?: {
        inputTokenRate: number;
        outputTokenRate: number;
    };
}

// ─── Tool Execution Parameters ──────────────────────────────────────────────────

export interface IToolExecutionParams {
    agent: IAgentType;
    task: ITaskType;
    tool: Tool;
    input: unknown;
    context?: Record<string, unknown>;
    parsedOutput?: IParsedOutput;
}

// ─── Tool Execution Results ────────────────────────────────────────────────────

/** Legacy tool execution result - kept for backward compatibility */
export interface IToolExecutionResult {
    success: boolean;
    result?: string;
    error?: Error;
    feedbackMessage?: string;
    costDetails?: ICostDetails;
    usageStats?: ILLMUsageStats;
}

/** Modern tool execution result using the handler system */
export interface IToolExecutionHandlerResult extends IToolHandlerResult<{
    result?: string;
    error?: Error;
    feedbackMessage?: string;
}> {}

// ─── Type Guards ────────────────────────────────────────────────────────────────

export const ToolExecutionTypeGuards = {
    isToolHandlerMetadata: (value: unknown): value is IToolHandlerMetadata => {
        if (typeof value !== 'object' || value === null) return false;
        const metadata = value as Partial<IToolHandlerMetadata>;
        return (
            typeof metadata.toolId === 'string' &&
            typeof metadata.toolName === 'string' &&
            typeof metadata.toolType === 'string' &&
            typeof metadata.executionPhase === 'string' &&
            ['pre', 'execute', 'post'].includes(metadata.executionPhase) &&
            typeof metadata.metrics === 'object' &&
            metadata.metrics !== null &&
            typeof metadata.metrics.resources === 'object' &&
            typeof metadata.metrics.usage === 'object' &&
            typeof metadata.metrics.performance === 'object' &&
            typeof metadata.metrics.execution === 'object' &&
            typeof metadata.metrics.execution.retryCount === 'number' &&
            typeof metadata.metrics.execution.successRate === 'number' &&
            typeof metadata.metrics.execution.executionTime === 'number' &&
            typeof metadata.metrics.execution.validationTime === 'number' &&
            typeof metadata.costDetails === 'object' &&
            metadata.costDetails !== null &&
            typeof metadata.costDetails.totalCost === 'number'
        );
    },

    isToolExecutionResult: (value: unknown): value is IToolExecutionResult => {
        if (typeof value !== 'object' || value === null) return false;
        const result = value as Partial<IToolExecutionResult>;
        return typeof result.success === 'boolean';
    },

    isToolExecutionHandlerResult: (value: unknown): value is IToolExecutionHandlerResult => {
        if (typeof value !== 'object' || value === null) return false;
        const result = value as Partial<IToolExecutionHandlerResult>;
        return (
            typeof result.success === 'boolean' &&
            ToolExecutionTypeGuards.isToolHandlerMetadata(result.metadata!)
        );
    }
};
