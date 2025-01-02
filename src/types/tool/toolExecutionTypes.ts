/**
 * @file toolExecutionTypes.ts
 * @path KaibanJS/src/types/tool/toolExecutionTypes.ts
 * @description Types for tool execution and management, including execution parameters, results, and statistics
 *
 * @module types/tool
 */

import { Tool } from '@langchain/core/tools';
import { IAgentType } from '../agent/agentBaseTypes';
import { ITaskType } from '../task/taskBaseTypes';
import { IHandlerResult, IBaseHandlerMetadata } from '../common/baseTypes';
import { IResourceMetrics } from '../metrics/base/resourceMetrics';
import { IUsageMetrics } from '../metrics/base/usageMetrics';
import { IPerformanceMetrics } from '../metrics/base/performanceMetrics';

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
    readonly timestamp: number;
    readonly component: string;
    readonly operation: string;
    readonly performance: IPerformanceMetrics;
    readonly context: {
        readonly source: string;
        readonly target: string;
        readonly correlationId: string;
        readonly causationId: string;
    };
    readonly validation: {
        readonly isValid: boolean;
        readonly errors: string[];
        readonly warnings: string[];
    };
    readonly toolId: string;
    readonly toolName: string;
    readonly toolType: string;
    readonly executionPhase: 'pre' | 'execute' | 'post';
    readonly metrics: {
        readonly timestamp: number;
        readonly component: string;
        readonly category: string;
        readonly version: string;
        readonly resources: IResourceMetrics;
        readonly usage: IUsageMetrics;
        readonly performance: IPerformanceMetrics;
        readonly execution: IToolExecutionMetrics;
    };
    readonly costDetails: ICostDetails;
    readonly usageStats?: Record<string, unknown>;
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
    parsedOutput?: Record<string, unknown>;
}

// ─── Tool Execution Results ────────────────────────────────────────────────────

/** Legacy tool execution result - kept for backward compatibility */
export interface IToolExecutionResult {
    success: boolean;
    result?: string;
    error?: Error;
    feedbackMessage?: string;
    costDetails?: ICostDetails;
    usageStats?: Record<string, unknown>;
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
            typeof metadata.timestamp === 'number' &&
            typeof metadata.component === 'string' &&
            typeof metadata.operation === 'string' &&
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
            typeof metadata.costDetails.totalCost === 'number' &&
            typeof metadata.performance === 'object' &&
            metadata.performance !== null &&
            typeof metadata.context === 'object' &&
            metadata.context !== null &&
            typeof metadata.validation === 'object' &&
            metadata.validation !== null &&
            typeof metadata.validation.isValid === 'boolean' &&
            Array.isArray(metadata.validation.errors) &&
            Array.isArray(metadata.validation.warnings)
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
        
        // Check required properties
        if (typeof result.success !== 'boolean') return false;
        if (!result.metadata || !ToolExecutionTypeGuards.isToolHandlerMetadata(result.metadata)) return false;

        // Optional properties
        if (result.data !== undefined) {
            const data = result.data as Partial<{
                result: string;
                error: Error;
                feedbackMessage: string;
            }>;
            if (data.result !== undefined && typeof data.result !== 'string') return false;
            if (data.error !== undefined && !(data.error instanceof Error)) return false;
            if (data.feedbackMessage !== undefined && typeof data.feedbackMessage !== 'string') return false;
        }

        return true;
    }
};
