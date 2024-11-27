/**
 * @file toolHandlerTypes.ts
 * @path KaibanJS/src/types/tool/toolHandlerTypes.ts
 * @description Handler-specific types for tool execution and management
 *
 * @module types/tool
 */

import { Tool } from 'langchain/tools';
import { IAgentType } from '../agent/agentBaseTypes';
import { ITaskType } from '../task/taskBaseTypes';
import { IBaseHandlerMetadata } from '../common/commonMetadataTypes';
import { 
    IResourceMetrics,
    IStandardCostDetails,
    IPerformanceMetrics
} from '../common/commonMetricTypes';
import { ILLMUsageStats } from '../llm/llmResponseTypes';
import { IToolUsageMetrics } from './toolMetricTypes';

// ─── Tool Handler Types ──────────────────────────────────────────────────────

/** Tool-specific handler metadata interface */
export interface IToolHandlerMetadata extends IBaseHandlerMetadata, Record<string, unknown> {
    tool: {
        name: string;
        executionTime: number;
        status: 'success' | 'failed';
        inputSize: number;
        outputSize: number;
        performance: IPerformanceMetrics;
        resources: IResourceMetrics;
        error?: {
            code: string;
            message: string;
            timestamp: number;
        };
        environment?: string;
        parameters?: Record<string, string>;
        version?: string;
    };
    toolId: string;
    executionPhase: 'pre' | 'execute' | 'post';
    metrics: {
        resources: IResourceMetrics;
        usage: IToolUsageMetrics;
        performance: IPerformanceMetrics;
    };
    costDetails: IStandardCostDetails;
    usageStats?: ILLMUsageStats;
    [key: string]: unknown;
}

/** Tool handler parameters interface */
export interface IToolHandlerParams {
    agent: IAgentType;
    task: ITaskType;
    tool: Tool;
    input: unknown;
    context?: Record<string, unknown>;
    metadata?: IToolHandlerMetadata;
}

/** Tool handler result interface */
export interface IToolHandlerResult {
    success: boolean;
    error?: Error;
    data: {
        result?: string;
        error?: Error;
        feedbackMessage?: string;
    };
    metadata: IToolHandlerMetadata;
}

// ─── Type Guards ────────────────────────────────────────────────────────────────

export const ToolHandlerTypeGuards = {
    isToolHandlerMetadata: (value: unknown): value is IToolHandlerMetadata => {
        if (typeof value !== 'object' || value === null) return false;
        const metadata = value as Partial<IToolHandlerMetadata>;
        return (
            typeof metadata.toolId === 'string' &&
            typeof metadata.tool?.name === 'string' &&
            typeof metadata.tool?.executionTime === 'number' &&
            typeof metadata.tool?.status === 'string' &&
            ['success', 'failed'].includes(metadata.tool?.status) &&
            typeof metadata.tool?.inputSize === 'number' &&
            typeof metadata.tool?.outputSize === 'number' &&
            typeof metadata.tool?.performance === 'object' &&
            metadata.tool?.performance !== null &&
            typeof metadata.tool?.resources === 'object' &&
            metadata.tool?.resources !== null &&
            typeof metadata.executionPhase === 'string' &&
            ['pre', 'execute', 'post'].includes(metadata.executionPhase) &&
            typeof metadata.metrics === 'object' &&
            metadata.metrics !== null &&
            typeof metadata.metrics.resources === 'object' &&
            metadata.metrics.resources !== null &&
            typeof metadata.metrics.usage === 'object' &&
            metadata.metrics.usage !== null &&
            typeof metadata.metrics.performance === 'object' &&
            metadata.metrics.performance !== null &&
            typeof metadata.costDetails === 'object' &&
            metadata.costDetails !== null &&
            typeof metadata.costDetails.totalCost === 'number'
        );
    },

    isToolHandlerResult: (value: unknown): value is IToolHandlerResult => {
        if (typeof value !== 'object' || value === null) return false;
        const result = value as Partial<IToolHandlerResult>;
        return (
            typeof result.success === 'boolean' &&
            ToolHandlerTypeGuards.isToolHandlerMetadata(result.metadata!)
        );
    }
};

/** Utility function to create a tool handler result */
export const createToolHandlerResult = (
    success: boolean,
    metadata: IToolHandlerMetadata,
    data: {
        result?: string;
        error?: Error;
        feedbackMessage?: string;
    }
): IToolHandlerResult => ({
    success,
    data,
    metadata
});
