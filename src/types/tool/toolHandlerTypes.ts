/**
 * @file toolHandlerTypes.ts
 * @path KaibanJS/src/types/tool/toolHandlerTypes.ts
 * @description Tool handler type definitions and utilities
 * 
 * @module types/tool
 */

import { IAgentType } from '../agent/agentBaseTypes';
import { ITaskType } from '../task/taskBaseTypes';
import { Tool } from '@langchain/core/tools';
import { BaseMessage } from '@langchain/core/messages';
import { IToolResourceMetrics, IToolPerformanceMetrics, IToolUsageMetrics } from './toolMetricTypes';
import { IStandardCostDetails } from '../common/commonMetricTypes';

/**
 * Tool handler parameters
 */
export interface IToolHandlerParams {
    agent: IAgentType;
    task: ITaskType;
    tool: Tool;
    input?: unknown;
    messages?: BaseMessage[];
}

/**
 * Tool handler data (for backward compatibility)
 */
export interface IToolHandlerData {
    result?: string;
    error?: Error;
    feedbackMessage?: string;
}

/**
 * Tool handler result
 */
export interface IToolHandlerResult {
    success: boolean;
    metadata?: IToolHandlerMetadata;
    data?: IToolHandlerData;
    error?: Error;
}

/**
 * Tool handler metadata
 */
export interface IToolHandlerMetadata {
    tool: {
        name: string;
        executionTime: number;
        status: 'success' | 'failed';
        inputSize: number;
        outputSize: number;
        performance: IToolPerformanceMetrics;
        resources: IToolResourceMetrics;
        error?: {
            code: string;
            message: string;
            timestamp: number;
        };
        environment: string;
        parameters: Record<string, unknown>;
        version: string;
    };
    toolId: string;
    executionPhase: 'pre' | 'execute' | 'post';
    metrics: {
        resources: IToolResourceMetrics;
        usage: IToolUsageMetrics;
        performance: IToolPerformanceMetrics;
    };
    costDetails: IStandardCostDetails;
    usageStats?: Record<string, unknown>;
}

// ─── Type Guards ────────────────────────────────────────────────────────────

/**
 * Type guard for tool handler parameters
 */
export function isToolHandlerParams(value: unknown): value is IToolHandlerParams {
    if (typeof value !== 'object' || value === null) return false;
    const params = value as Partial<IToolHandlerParams>;
    
    return (
        typeof params.agent === 'object' && params.agent !== null &&
        typeof params.task === 'object' && params.task !== null &&
        typeof params.tool === 'object' && params.tool !== null &&
        'name' in params.tool && 'description' in params.tool && 'invoke' in params.tool &&
        (params.messages === undefined || Array.isArray(params.messages))
    );
}

/**
 * Type guard for tool handler data
 */
export function isToolHandlerData(value: unknown): value is IToolHandlerData {
    if (typeof value !== 'object' || value === null) return false;
    const data = value as Partial<IToolHandlerData>;
    
    return (
        (data.result === undefined || typeof data.result === 'string') &&
        (data.error === undefined || data.error instanceof Error) &&
        (data.feedbackMessage === undefined || typeof data.feedbackMessage === 'string')
    );
}

/**
 * Type guard for tool handler result
 */
export function isToolHandlerResult(value: unknown): value is IToolHandlerResult {
    if (typeof value !== 'object' || value === null) return false;
    const result = value as Partial<IToolHandlerResult>;
    
    return (
        typeof result.success === 'boolean' &&
        (result.metadata === undefined || isToolHandlerMetadata(result.metadata)) &&
        (result.data === undefined || isToolHandlerData(result.data)) &&
        (result.error === undefined || result.error instanceof Error)
    );
}

/**
 * Type guard for tool handler metadata
 */
export function isToolHandlerMetadata(value: unknown): value is IToolHandlerMetadata {
    if (typeof value !== 'object' || value === null) return false;
    const metadata = value as Partial<IToolHandlerMetadata>;
    
    return (
        typeof metadata.tool === 'object' && metadata.tool !== null &&
        typeof metadata.tool.name === 'string' &&
        typeof metadata.tool.executionTime === 'number' &&
        (metadata.tool.status === 'success' || metadata.tool.status === 'failed') &&
        typeof metadata.tool.inputSize === 'number' &&
        typeof metadata.tool.outputSize === 'number' &&
        typeof metadata.tool.performance === 'object' && metadata.tool.performance !== null &&
        typeof metadata.tool.resources === 'object' && metadata.tool.resources !== null &&
        typeof metadata.toolId === 'string' &&
        (metadata.executionPhase === 'pre' || metadata.executionPhase === 'execute' || metadata.executionPhase === 'post') &&
        typeof metadata.metrics === 'object' && metadata.metrics !== null &&
        typeof metadata.costDetails === 'object' && metadata.costDetails !== null
    );
}

/**
 * Create a tool handler result
 */
export function createToolHandlerResult(
    success: boolean,
    metadata?: IToolHandlerMetadata,
    data?: IToolHandlerData
): IToolHandlerResult {
    return {
        success,
        metadata,
        data
    };
}
