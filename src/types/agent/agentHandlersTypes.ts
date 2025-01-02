/**
 * @file agentHandlersTypes.ts
 * @path src/types/agent/agentHandlersTypes.ts
 * @description Agent handler type definitions
 */

import { BaseMessage } from '@langchain/core/messages';
import { LLMResult } from '@langchain/core/outputs';
import type { IAgentConfig } from './agentConfigTypes';
import type { IAgentContext } from './agentContextTypes';
import type { IAgentState } from './agentStateTypes';
import type { IAgentMetrics } from './agentMetricTypes';
import type { IHandlerResult, IBaseHandlerMetadata } from '../common/baseTypes';
import type { IAgentPerformanceMetrics, IAgentResourceMetrics, IAgentUsageMetrics } from './agentMetricTypes';
import type { ICostDetails } from '../workflow/workflowCostsTypes';

/**
 * Base agent handler interface
 */
export interface IAgentHandler {
    readonly id: string;
    readonly name: string;
    readonly config: IAgentConfig;
    readonly context: IAgentContext;
    readonly state: IAgentState;
    readonly metrics: IAgentMetrics;
    readonly validationResult?: unknown;
}

/**
 * Agent handler result interface
 */
export interface IAgentHandlerResult {
    readonly success: boolean;
    readonly data?: unknown;
    readonly error?: Error;
    readonly metrics: IAgentMetrics;
    readonly validationResult?: unknown;
}

/**
 * Thinking execution parameters interface
 */
export interface IThinkingExecutionParams {
    agent: any;
    task: any;
    ExecutableAgent: any;
    feedbackMessage?: string;
    metadata?: IBaseHandlerMetadata;
}

/**
 * Thinking result interface
 */
export interface IThinkingResult {
    metrics: any;
    messages: BaseMessage[];
    output: LLMResult;
}

/**
 * Thinking metadata interface
 */
export interface IThinkingMetadata extends IBaseHandlerMetadata {
    agent: {
        id: string;
        name: string;
        role: string;
        status: string;
        metrics: {
            iterations: number;
            executionTime: number;
            llmMetrics: unknown;
        };
    };
    thinking: {
        messageCount: number;
        processingTime: number;
        metrics: unknown;
        context: {
            iteration: number;
            totalTokens: number;
            confidence: number;
            reasoningChain: string[];
        };
        performance: IAgentPerformanceMetrics;
        resources: IAgentResourceMetrics;
        usage: IAgentUsageMetrics;
        costs: ICostDetails;
    };
    task: {
        id: string;
        title: string;
        metrics: {
            iterations: number;
            executionTime: number;
            llmMetrics: unknown;
        };
    };
    llm?: {
        model: string;
        provider: string;
        requestId: string;
        usageMetrics: unknown;
    };
}

/**
 * Thinking handler result interface
 */
export interface IThinkingHandlerResult<T = unknown> extends IHandlerResult<T, IThinkingMetadata> {}

/**
 * Agent handler factory interface
 */
export interface IAgentHandlerFactory {
    createHandler(config: IAgentConfig): Promise<IAgentHandler>;
    validateHandler(handler: IAgentHandler): Promise<boolean>;
}

/**
 * Agent handler registry interface
 */
export interface IAgentHandlerRegistry {
    registerHandler(name: string, factory: IAgentHandlerFactory): void;
    getHandler(name: string): IAgentHandlerFactory;
    hasHandler(name: string): boolean;
    getRegisteredHandlers(): string[];
}
