/**
 * @file agentIterationTypes.ts
 * @path KaibanJS/src/types/agent/agentIterationTypes.ts
 * @description Types for agent iteration handling and control flow
 *
 * @module types/agent
 */

import type { IHandlerResult } from '../common/commonHandlerTypes';
import type { IBaseHandlerMetadata } from '../common/commonMetadataTypes';
import type { IAgentType } from './agentBaseTypes';
import type { ITaskType } from '../task/taskBaseTypes';
import type { IOutput, ILLMUsageStats } from '../llm/llmResponseTypes';
import type { IStandardCostDetails } from '../common/commonMetricTypes';
import type {
    IAgentResourceMetrics,
    IAgentPerformanceMetrics,
    IAgentUsageMetrics
} from './agentMetricTypes';

// ─── Iteration Parameters ────────────────────────────────────────────────────

export interface IIterationStartParams {
    agent: IAgentType;
    task: ITaskType;
    iterations: number;
    maxAgentIterations: number;
}

export interface IIterationEndParams extends IIterationStartParams {
    output?: IOutput;
}

export interface IIterationControlParams {
    maxIterations?: number;
    iterationDelay?: number;
    timeoutPerIteration?: number;
    retryOptions?: {
        maxRetries: number;
        retryDelay: number;
        exponentialBackoff: boolean;
    };
}

// ─── Iteration Context & Control ────────────────────────────────────────────

export interface IIterationContext {
    startTime: number;
    endTime?: number;
    iterations: number;
    maxIterations: number;
    lastUpdateTime: number;
    status: 'running' | 'completed' | 'error';
    error?: any;
    performance: IAgentPerformanceMetrics;
    resources: IAgentResourceMetrics;
    usage: IAgentUsageMetrics;
    costs: IStandardCostDetails;
}

export interface IIterationControl {
    shouldContinue: boolean;
    feedbackMessage?: string;
    metrics?: {
        confidence: number;
        progress: number;
        remainingIterations: number;
    };
}

// ─── Iteration Metadata & Results ────────────────────────────────────────────

export interface IIterationHandlerMetadata extends IBaseHandlerMetadata {
    iteration: {
        current: number;
        max: number;
        status: 'running' | 'completed' | 'error';
        performance: IAgentPerformanceMetrics;
        context: {
            startTime: number;
            endTime?: number;
            totalTokens: number;
            confidence: number;
            reasoningChain: string[];
        };
        resources: IAgentResourceMetrics;
        usage: IAgentUsageMetrics;
        costs: IStandardCostDetails;
    };
    agent: {
        id: string;
        name: string;
        metrics: {
            iterations: number;
            executionTime: number;
            llmUsageStats: ILLMUsageStats;
            performance: IAgentPerformanceMetrics;
        };
    };
    task: {
        id: string;
        title: string;
        metrics: {
            iterations: number;
            executionTime: number;
            llmUsageStats: ILLMUsageStats;
            performance: IAgentPerformanceMetrics;
        };
    };
    llm?: {
        model: string;
        provider: string;
        requestId: string;
        usageStats: ILLMUsageStats;
    };
}

export interface IIterationResult {
    context: IIterationContext;
    control: IIterationControl;
    metrics: {
        performance: IAgentPerformanceMetrics;
        resources: IAgentResourceMetrics;
        usage: IAgentUsageMetrics;
        costs: IStandardCostDetails;
    };
    output?: IOutput;
}

export type IIterationHandlerResult<T = unknown> = IHandlerResult<T, IIterationHandlerMetadata>;

// ─── Type Guards ────────────────────────────────────────────────────────────

export const IIterationTypeGuards = {
    isIterationContext: (value: unknown): value is IIterationContext => {
        if (typeof value !== 'object' || value === null) return false;
        const context = value as Partial<IIterationContext>;
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

    isIterationHandlerMetadata: (value: unknown): value is IIterationHandlerMetadata => {
        if (typeof value !== 'object' || value === null) return false;
        const metadata = value as Partial<IIterationHandlerMetadata>;
        return (
            metadata.iteration !== undefined &&
            typeof metadata.iteration.current === 'number' &&
            typeof metadata.iteration.max === 'number' &&
            typeof metadata.iteration.status === 'string' &&
            typeof metadata.iteration.performance === 'object' &&
            metadata.iteration.performance !== null &&
            typeof metadata.iteration.resources === 'object' &&
            metadata.iteration.resources !== null &&
            typeof metadata.iteration.usage === 'object' &&
            metadata.iteration.usage !== null &&
            typeof metadata.iteration.costs === 'object' &&
            metadata.iteration.costs !== null &&
            metadata.agent !== undefined &&
            typeof metadata.agent.id === 'string' &&
            typeof metadata.agent.name === 'string' &&
            metadata.task !== undefined &&
            typeof metadata.task.id === 'string' &&
            typeof metadata.task.title === 'string'
        );
    },

    isIterationResult: (value: unknown): value is IIterationResult => {
        if (typeof value !== 'object' || value === null) return false;
        const result = value as Partial<IIterationResult>;
        return (
            IIterationTypeGuards.isIterationContext(result.context as unknown) &&
            typeof result.control === 'object' &&
            result.control !== null &&
            typeof result.metrics === 'object' &&
            result.metrics !== null &&
            typeof result.metrics.performance === 'object' &&
            result.metrics.performance !== null &&
            typeof result.metrics.resources === 'object' &&
            result.metrics.resources !== null &&
            typeof result.metrics.usage === 'object' &&
            result.metrics.usage !== null &&
            typeof result.metrics.costs === 'object' &&
            result.metrics.costs !== null
        );
    }
};
