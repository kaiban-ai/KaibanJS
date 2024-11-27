/**
 * @file agentLoopTypes.ts
 * @path KaibanJS/src/types/agent/agentLoopTypes.ts
 * @description Types for agentic loop handling and control flow
 */

import type { IHandlerResult } from '../common/commonHandlerTypes';
import type { IBaseHandlerMetadata } from '../common/commonMetadataTypes';
import type { IAgentType } from './agentBaseTypes';
import type { ITaskType } from '../task/taskBaseTypes';
import type { IOutput, ILLMUsageStats } from '../llm/llmResponseTypes';
import type { 
    IPerformanceMetrics,
    IResourceMetrics,
    IUsageMetrics,
    IStandardCostDetails
} from '../common/commonMetricTypes';

// ─── Loop Parameters ────────────────────────────────────────────────────────

export interface ILoopExecutionParams {
    agent: IAgentType;
    task: ITaskType;
    feedbackMessage?: string;
    options?: {
        maxRetries?: number;
        retryDelay?: number;
        timeout?: number;
        validateOutput?: boolean;
    };
}

// ─── Loop Context & Control ────────────────────────────────────────────────

export interface ILoopContext {
    startTime: number;
    endTime?: number;
    iterations: number;
    maxIterations: number;
    lastUpdateTime: number;
    status: 'running' | 'completed' | 'error';
    error?: any;
    performance: IPerformanceMetrics;
    resources: IResourceMetrics;
    usage: IUsageMetrics;
    costs: IStandardCostDetails;
    lastOutput?: IOutput;
}

export interface ILoopControl {
    shouldContinue: boolean;
    feedbackMessage?: string;
    metrics?: {
        confidence: number;
        progress: number;
        remainingIterations: number;
        executionTime: number;
    };
}

// ─── Loop Metadata & Results ────────────────────────────────────────────────

export interface ILoopHandlerMetadata extends IBaseHandlerMetadata {
    loop: {
        iterations: number;
        maxIterations: number;
        status: 'running' | 'completed' | 'error';
        performance: IPerformanceMetrics;
        context: {
            startTime: number;
            endTime?: number;
            totalTokens: number;
            confidence: number;
            reasoningChain: string[];
        };
        resources: IResourceMetrics;
        usage: IUsageMetrics;
        costs: IStandardCostDetails;
        llmStats: ILLMUsageStats;
    };
    agent: {
        id: string;
        name: string;
        metrics: {
            iterations: number;
            executionTime: number;
            llmUsageStats: ILLMUsageStats;
            performance: IPerformanceMetrics;
        };
    };
    task: {
        id: string;
        title: string;
        metrics: {
            iterations: number;
            executionTime: number;
            llmUsageStats: ILLMUsageStats;
            performance: IPerformanceMetrics;
        };
    };
    [key: string]: unknown;
}

export interface ILoopResult {
    success: boolean;
    result?: IOutput;
    error?: string;
    metadata: {
        iterations: number;
        maxAgentIterations: number;
        metrics?: {
            performance: IPerformanceMetrics;
            resources: IResourceMetrics;
            usage: IUsageMetrics;
            costs: IStandardCostDetails;
        };
    };
}

export type ILoopHandlerResult<T = unknown> = IHandlerResult<T, ILoopHandlerMetadata>;

/** Utility function to create a loop handler result */
export const createLoopHandlerResult = (
    success: boolean,
    metadata: ILoopHandlerMetadata,
    data: {
        result?: IOutput;
        error?: string;
    }
): ILoopHandlerResult<ILoopResult> => ({
    success,
    data: {
        success,
        result: data.result,
        error: data.error,
        metadata: {
            iterations: metadata.loop.iterations,
            maxAgentIterations: metadata.loop.maxIterations,
            metrics: {
                performance: metadata.loop.performance,
                resources: metadata.loop.resources,
                usage: metadata.loop.usage,
                costs: metadata.loop.costs
            }
        }
    },
    metadata
});

// ─── Type Guards ────────────────────────────────────────────────────────────

export const ILoopTypeGuards = {
    isLoopContext: (value: unknown): value is ILoopContext => {
        if (typeof value !== 'object' || value === null) return false;
        const context = value as Partial<ILoopContext>;
        return (
            typeof context.startTime === 'number' &&
            typeof context.iterations === 'number' &&
            typeof context.maxIterations === 'number' &&
            typeof context.lastUpdateTime === 'number' &&
            typeof context.status === 'string' &&
            typeof context.performance === 'object' &&
            context.performance !== null &&
            typeof context.resources === 'object' &&
            context.resources !== null &&
            typeof context.usage === 'object' &&
            context.usage !== null &&
            typeof context.costs === 'object' &&
            context.costs !== null
        );
    },

    isLoopHandlerMetadata: (value: unknown): value is ILoopHandlerMetadata => {
        if (typeof value !== 'object' || value === null) return false;
        const metadata = value as Partial<ILoopHandlerMetadata>;
        return (
            metadata.loop !== undefined &&
            typeof metadata.loop.iterations === 'number' &&
            typeof metadata.loop.maxIterations === 'number' &&
            typeof metadata.loop.status === 'string' &&
            typeof metadata.loop.performance === 'object' &&
            metadata.loop.performance !== null &&
            typeof metadata.loop.context === 'object' &&
            metadata.loop.context !== null &&
            typeof metadata.loop.resources === 'object' &&
            metadata.loop.resources !== null &&
            typeof metadata.loop.usage === 'object' &&
            metadata.loop.usage !== null &&
            typeof metadata.loop.costs === 'object' &&
            metadata.loop.costs !== null &&
            typeof metadata.loop.llmStats === 'object' &&
            metadata.loop.llmStats !== null &&
            metadata.agent !== undefined &&
            typeof metadata.agent.id === 'string' &&
            typeof metadata.agent.name === 'string' &&
            typeof metadata.agent.metrics === 'object' &&
            metadata.agent.metrics !== null &&
            metadata.task !== undefined &&
            typeof metadata.task.id === 'string' &&
            typeof metadata.task.title === 'string' &&
            typeof metadata.task.metrics === 'object' &&
            metadata.task.metrics !== null
        );
    },

    isLoopResult: (value: unknown): value is ILoopResult => {
        if (typeof value !== 'object' || value === null) return false;
        const result = value as Partial<ILoopResult>;
        return (
            typeof result.success === 'boolean' &&
            typeof result.metadata === 'object' &&
            result.metadata !== null &&
            typeof result.metadata.iterations === 'number' &&
            typeof result.metadata.maxAgentIterations === 'number'
        );
    },

    isLoopControl: (value: unknown): value is ILoopControl => {
        if (typeof value !== 'object' || value === null) return false;
        const control = value as Partial<ILoopControl>;
        return (
            typeof control.shouldContinue === 'boolean' &&
            (control.metrics === undefined || (
                typeof control.metrics === 'object' &&
                control.metrics !== null &&
                typeof control.metrics.confidence === 'number' &&
                typeof control.metrics.progress === 'number' &&
                typeof control.metrics.remainingIterations === 'number' &&
                typeof control.metrics.executionTime === 'number'
            ))
        );
    }
};
