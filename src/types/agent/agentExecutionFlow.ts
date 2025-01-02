/**
 * @file executionFlow.ts
 * @path KaibanJS/src/types/agent/executionFlow.ts
 * @description Consolidated types for agent execution flow, combining loop and iteration handling
 */

import { LLMResult } from '@langchain/core/outputs';
import type {
    IHandlerResult,
    IBaseHandlerMetadata,
    IStandardCostDetails,
    IBaseContextPartial
} from '../common/baseTypes';
import type { IValidationResult } from '../common/validationTypes';
import type { IPerformanceMetrics } from '../metrics/base/performanceMetrics';
import type { IAgentType } from './agentBaseTypes';
import type { ITaskType } from '../task/taskBaseTypes';
import type { LLMResponse } from '../llm/llmResponseTypes';
import type { ILLMUsageMetrics } from '../llm/llmMetricTypes';
import type { IErrorType } from '../common/errorTypes';
import type {
    IAgentResourceMetrics,
    IAgentPerformanceMetrics,
    IAgentUsageMetrics
} from './agentMetricTypes';

// ─── Common Types ────────────────────────────────────────────────────────────

export type ExecutionStatus = 'running' | 'completed' | 'error';

export interface IBaseExecutionContext {
    startTime: number;
    endTime?: number;
    lastUpdateTime: number;
    status: ExecutionStatus;
    error?: IErrorType;
    performance: IAgentPerformanceMetrics;
    resources: IAgentResourceMetrics;
    usage: IAgentUsageMetrics;
    costs: IStandardCostDetails;
}

export interface IBaseExecutionControl {
    shouldContinue: boolean;
    feedbackMessage?: string;
    metrics?: {
        confidence: number;
        progress: number;
        remainingIterations: number;
    };
}

// ─── Iteration Types ────────────────────────────────────────────────────────

export interface IIterationStartParams {
    agent: IAgentType;
    task: ITaskType;
    iterations: number;
    maxAgentIterations: number;
}

export interface IIterationEndParams extends IIterationStartParams {
    output?: LLMResponse;
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

export interface IIterationContext extends IBaseExecutionContext {
    iterations: number;
    maxIterations: number;
}

export interface IIterationControl extends IBaseExecutionControl {
    metrics?: {
        confidence: number;
        progress: number;
        remainingIterations: number;
    };
}

export interface IIterationHandlerMetadata extends IBaseHandlerMetadata {
    timestamp: number;
    component: string;
    operation: string;
    performance: IPerformanceMetrics;
    context: IBaseContextPartial;
    validation: IValidationResult;
    iteration: {
        current: number;
        max: number;
        status: ExecutionStatus;
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
        role: string;
        status: string;
        metrics: {
            iterations: number;
            executionTime: number;
            llmUsageMetrics: ILLMUsageMetrics;
            performance: IAgentPerformanceMetrics;
        };
    };
    task: {
        id: string;
        title: string;
        metrics: {
            iterations: number;
            executionTime: number;
            llmUsageMetrics: ILLMUsageMetrics;
            performance: IAgentPerformanceMetrics;
        };
    };
    llm?: {
        model: string;
        provider: string;
        requestId: string;
        usageMetrics: ILLMUsageMetrics;
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
    output?: LLMResponse;
}

export type IIterationHandlerResult<T = unknown> = IHandlerResult<T, IIterationHandlerMetadata>;

// ─── Loop Types ────────────────────────────────────────────────────────────

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

export interface ILoopContext extends IBaseExecutionContext {
    iterations: number;
    maxIterations: number;
    lastOutput?: LLMResult;
}

export interface ILoopControl extends IBaseExecutionControl {
    metrics?: {
        confidence: number;
        progress: number;
        remainingIterations: number;
        executionTime: number;
    };
}

export interface IStateTransaction {
    id: string;
    timestamp: number;
    context: ILoopContext;
    previousContext?: ILoopContext;
    status: 'pending' | 'committed' | 'rolled_back';
}

export interface IStateManager {
    beginTransaction: (loopKey: string, context: ILoopContext) => string;
    commitTransaction: (transactionId: string) => void;
    rollbackTransaction: (transactionId: string) => ILoopContext | undefined;
    getLatestState: (loopKey: string) => ILoopContext | undefined;
    getStateHistory: (loopKey: string) => ILoopContext[];
    cleanup: (loopKey: string) => void;
}

export interface ILoopHandlerMetadata extends IBaseHandlerMetadata {
    timestamp: number;
    component: string;
    operation: string;
    performance: IPerformanceMetrics;
    context: IBaseContextPartial;
    validation: IValidationResult;
    loop: {
        iterations: number;
        maxIterations: number;
        status: ExecutionStatus;
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
        llmUsageMetrics: ILLMUsageMetrics;
    };
    agent: {
        id: string;
        name: string;
        role: string;
        status: string;
        metrics: {
            iterations: number;
            executionTime: number;
            llmUsageMetrics: ILLMUsageMetrics;
            performance: IAgentPerformanceMetrics;
        };
    };
    task: {
        id: string;
        title: string;
        metrics: {
            iterations: number;
            executionTime: number;
            llmUsageMetrics: ILLMUsageMetrics;
            performance: IAgentPerformanceMetrics;
        };
    };
}

export interface ILoopResult {
    success: boolean;
    result?: LLMResult;
    error?: IErrorType;
    metadata: {
        iterations: number;
        maxAgentIterations: number;
        metrics?: {
            performance: IAgentPerformanceMetrics;
            resources: IAgentResourceMetrics;
            usage: IAgentUsageMetrics;
            costs: IStandardCostDetails;
        };
        [key: string]: unknown;
    };
}

export type ILoopHandlerResult<T = unknown> = IHandlerResult<T, ILoopHandlerMetadata>;

/** Utility function to create a loop handler result */
export const createLoopHandlerResult = (
    success: boolean,
    metadata: ILoopHandlerMetadata,
    data: ILoopResult
): ILoopHandlerResult<ILoopResult> => ({
    success,
    data,
    metadata
});

// ─── Type Guards ────────────────────────────────────────────────────────────

export const ExecutionFlowTypeGuards = {
    isBaseExecutionContext: (value: unknown): value is IBaseExecutionContext => {
        if (typeof value !== 'object' || value === null) return false;
        const context = value as Partial<IBaseExecutionContext>;
        return (
            typeof context.startTime === 'number' &&
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

    isIterationContext: (value: unknown): value is IIterationContext => {
        if (!ExecutionFlowTypeGuards.isBaseExecutionContext(value)) return false;
        const context = value as Partial<IIterationContext>;
        return (
            typeof context.iterations === 'number' &&
            typeof context.maxIterations === 'number'
        );
    },

    isLoopContext: (value: unknown): value is ILoopContext => {
        if (!ExecutionFlowTypeGuards.isBaseExecutionContext(value)) return false;
        const context = value as Partial<ILoopContext>;
        return (
            typeof context.iterations === 'number' &&
            typeof context.maxIterations === 'number'
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
            typeof metadata.loop.llmUsageMetrics === 'object' &&
            metadata.loop.llmUsageMetrics !== null &&
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
            ExecutionFlowTypeGuards.isIterationContext(result.context as unknown) &&
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
    }
};
