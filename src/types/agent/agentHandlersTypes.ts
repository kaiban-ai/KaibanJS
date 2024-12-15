/**
 * @file agentHandlersTypes.ts
 * @path src/types/agent/agentHandlersTypes.ts
 * @description Type definitions for agent handlers with categorization and enhanced type safety
 *
 * @module @types/agent
 */

import { BaseMessage } from '@langchain/core/messages';
import { LLMResult } from '@langchain/core/outputs';
import type { IAgentType } from './agentBaseTypes';
import type { ITaskType } from '../task/taskBaseTypes';
import type { ILLMMetrics } from '../llm/llmMetricTypes';
import type { IHandlerResult } from '../common/commonHandlerTypes';
import type { IBaseHandlerMetadata } from '../common/commonMetadataTypes';
import type { IStandardCostDetails } from '../common/commonMetricTypes';
import type {
    IAgentResourceMetrics,
    IAgentPerformanceMetrics,
    IAgentUsageMetrics
} from './agentMetricTypes';
import type { AGENT_EVENT_CATEGORY } from './agentEventTypes';

// ─── Base Handler Types ────────────────────────────────────────────────────────

/**
 * Base handler metadata interface
 */
export interface IBaseAgentHandlerMetadata {
    category: AGENT_EVENT_CATEGORY;
    agent: {
        id: string;
        name: string;
        metrics: {
            iterations: number;
            executionTime: number;
            llmMetrics: ILLMMetrics;
        };
    };
    task?: {
        id: string;
        title: string;
        metrics: {
            iterations: number;
            executionTime: number;
            llmMetrics: ILLMMetrics;
        };
    };
}

/**
 * Base handler parameters interface
 */
export interface IBaseHandlerParams {
    agent: IAgentType;
    task?: ITaskType;
    context?: Record<string, unknown>;
}

// ─── Handler Categories ────────────────────────────────────────────────────────

/**
 * Lifecycle handler parameters
 */
export interface ILifecycleHandlerParams extends IBaseHandlerParams {
    category: AGENT_EVENT_CATEGORY.LIFECYCLE;
    operation: 'create' | 'update' | 'delete';
    previousState?: IAgentType;
    newState?: IAgentType;
}

/**
 * State handler parameters
 */
export interface IStateHandlerParams extends IBaseHandlerParams {
    category: AGENT_EVENT_CATEGORY.STATE;
    previousStatus?: string;
    newStatus?: string;
    reason?: string;
}

/**
 * Error handler parameters
 */
export interface IErrorHandlerParams extends IBaseHandlerParams {
    category: AGENT_EVENT_CATEGORY.ERROR;
    error: Error;
    operation: string;
    recoveryStrategy?: string;
    recoveryAttempts?: number;
}

/**
 * Thinking handler parameters
 */
export interface IThinkingHandlerParams extends IBaseHandlerParams {
    category: AGENT_EVENT_CATEGORY.ITERATION;
    messages: BaseMessage[];
    output?: LLMResult;
    metrics?: ILLMMetrics;
}

/**
 * Tool handler parameters
 */
export interface IToolHandlerParams extends IBaseHandlerParams {
    category: AGENT_EVENT_CATEGORY.ITERATION;
    tool?: unknown;
    error?: Error;
    toolName: string;
    metrics?: {
        executionTime: number;
        resourceUsage: IAgentResourceMetrics;
    };
}

// ─── Handler Metadata Types ─────────────────────────────────────────────────────

/**
 * Lifecycle handler metadata
 */
export interface ILifecycleHandlerMetadata extends IBaseAgentHandlerMetadata {
    category: AGENT_EVENT_CATEGORY.LIFECYCLE;
    operation: string;
    duration: number;
    changes?: Record<string, unknown>;
}

/**
 * State handler metadata
 */
export interface IStateHandlerMetadata extends IBaseAgentHandlerMetadata {
    category: AGENT_EVENT_CATEGORY.STATE;
    transition: {
        from: string;
        to: string;
        reason: string;
        duration: number;
    };
}

/**
 * Thinking handler metadata
 */
export interface IThinkingMetadata extends IBaseAgentHandlerMetadata {
    category: AGENT_EVENT_CATEGORY.ITERATION;
    thinking: {
        messageCount: number;
        processingTime: number;
        metrics: ILLMMetrics;
        context: {
            iteration: number;
            totalTokens: number;
            confidence: number;
            reasoningChain: string[];
        };
        performance: IAgentPerformanceMetrics;
        resources: IAgentResourceMetrics;
        usage: IAgentUsageMetrics;
        costs: IStandardCostDetails;
    };
}

/**
 * Error handler metadata
 */
export interface IErrorHandlerMetadata extends IBaseAgentHandlerMetadata {
    category: AGENT_EVENT_CATEGORY.ERROR;
    error: {
        type: string;
        message: string;
        stack?: string;
        context: Record<string, unknown>;
    };
    recovery?: {
        strategy: string;
        attempts: number;
        duration: number;
        success: boolean;
    };
}

// ─── Handler Result Types ──────────────────────────────────────────────────────

/**
 * Thinking execution parameters
 */
export interface IThinkingExecutionParams {
    agent: IAgentType;
    task: ITaskType;
    ExecutableAgent: any;
    feedbackMessage?: string;
}

/**
 * Thinking result interface
 */
export interface IThinkingResult {
    metrics: ILLMMetrics;
    messages: BaseMessage[];
    output: LLMResult;
}

/**
 * Domain-specific handler result types
 */
export type ILifecycleHandlerResult<T = unknown> = IHandlerResult<T, ILifecycleHandlerMetadata>;
export type IStateHandlerResult<T = unknown> = IHandlerResult<T, IStateHandlerMetadata>;
export type IThinkingHandlerResult<T = unknown> = IHandlerResult<T, IThinkingMetadata>;
export type IErrorHandlerResult<T = unknown> = IHandlerResult<T, IErrorHandlerMetadata>;

// ─── Handler Interfaces ────────────────────────────────────────────────────────

/**
 * Base agent handler interface
 */
export interface IBaseAgentHandler<P extends IBaseHandlerParams, R extends IHandlerResult> {
    handle(params: P): Promise<R>;
    validate?(params: P): Promise<boolean>;
    cleanup?(): Promise<void>;
}

/**
 * Lifecycle handler interface
 */
export interface ILifecycleHandler extends IBaseAgentHandler<ILifecycleHandlerParams, ILifecycleHandlerResult> {
    onCreated?(params: ILifecycleHandlerParams): Promise<void>;
    onUpdated?(params: ILifecycleHandlerParams): Promise<void>;
    onDeleted?(params: ILifecycleHandlerParams): Promise<void>;
}

/**
 * State handler interface
 */
export interface IStateHandler extends IBaseAgentHandler<IStateHandlerParams, IStateHandlerResult> {
    onStatusChanged?(params: IStateHandlerParams): Promise<void>;
    validateTransition?(from: string, to: string): Promise<boolean>;
}

/**
 * Thinking handler interface
 */
export interface IThinkingHandler extends IBaseAgentHandler<IThinkingHandlerParams, IThinkingHandlerResult> {
    onThinkingStarted?(params: IThinkingHandlerParams): Promise<void>;
    onThinkingCompleted?(params: IThinkingHandlerParams): Promise<void>;
    onThinkingError?(params: IThinkingHandlerParams & { error: Error }): Promise<void>;
}

/**
 * Error handler interface
 */
export interface IErrorHandler extends IBaseAgentHandler<IErrorHandlerParams, IErrorHandlerResult> {
    onErrorOccurred?(params: IErrorHandlerParams): Promise<void>;
    onErrorHandled?(params: IErrorHandlerParams): Promise<void>;
    onRecoveryStarted?(params: IErrorHandlerParams): Promise<void>;
    onRecoveryCompleted?(params: IErrorHandlerParams): Promise<void>;
    onRecoveryFailed?(params: IErrorHandlerParams): Promise<void>;
}
