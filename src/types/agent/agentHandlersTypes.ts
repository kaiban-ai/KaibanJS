/**
 * @file agentHandlersTypes.ts
 * @path src/types/agent/agentHandlersTypes.ts
 * @description Type definitions for agent handlers and their parameters
 *
 * @module @types/agent
 */

import type { IAgentType } from './agentBaseTypes';
import type { ITaskType } from '../task/taskBaseTypes';
import type { 
    IOutput, 
    IParsedOutput, 
    ILLMEventMetadata 
} from '../llm/llmResponseTypes';
import type { ILLMMetrics } from '../llm/llmMetricTypes';
import type { IHandlerResult } from '../common/commonHandlerTypes';
import type { IBaseHandlerMetadata } from '../common/commonMetadataTypes';
import type { IStandardCostDetails } from '../common/commonMetricTypes';
import type {
    IAgentResourceMetrics,
    IAgentPerformanceMetrics,
    IAgentUsageMetrics
} from './agentMetricTypes';

// ─── Handler Parameters ─────────────────────────────────────────────────────────

export interface IErrorHandlerParams {
    /** The agent instance that encountered the error */
    agent: IAgentType;
    /** The task being executed when the error occurred */
    task: ITaskType;
    /** The error that was encountered */
    error: Error;
    /** Additional context about the error */
    context?: Record<string, unknown>;
}

export interface IThinkingHandlerParams {
    /** The agent instance that is thinking */
    agent: IAgentType;
    /** The task being processed */
    task: ITaskType;
    /** The messages being processed */
    messages: unknown[];
    /** The output from processing */
    output?: IOutput;
}

export interface IToolHandlerParams {
    /** The agent instance using the tool */
    agent: IAgentType;
    /** The task being executed */
    task: ITaskType;
    /** The tool being used */
    tool?: unknown;
    /** Any error that occurred */
    error: Error;
    /** The name of the tool */
    toolName: string;
}

// ─── Thinking Types ───────────────────────────────────────────────────────────

/**
 * Thinking-specific metadata interface
 */
export interface IThinkingMetadata extends IBaseHandlerMetadata {
    [key: string]: unknown;
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
    agent: {
        id: string;
        name: string;
        metrics: {
            iterations: number;
            executionTime: number;
            llmMetrics: ILLMMetrics;
        };
    };
    task: {
        id: string;
        title: string;
        metrics: {
            iterations: number;
            executionTime: number;
            llmMetrics: ILLMMetrics;
        };
    };
    llm: ILLMEventMetadata['llm'];
}

/**
 * Thinking execution parameters
 */
export interface IThinkingExecutionParams {
    /** The agent instance that is thinking */
    agent: IAgentType;
    /** The task being processed */
    task: ITaskType;
    /** The executable agent instance */
    ExecutableAgent: any;
    /** Optional feedback message */
    feedbackMessage?: string;
}

/**
 * Thinking result interface
 */
export interface IThinkingResult {
    /** The parsed LLM output */
    parsedLLMOutput: IParsedOutput | null;
    /** The raw LLM output */
    llmOutput: string;
    /** LLM metrics */
    metrics: ILLMMetrics;
    /** Messages processed */
    messages?: any[];
    /** Final output */
    output?: IOutput;
}

/**
 * Domain-specific handler result type
 */
export type IThinkingHandlerResult<T = unknown> = IHandlerResult<T, IThinkingMetadata>;

// ─── Manager Interfaces ────────────────────────────────────────────────────────

/**
 * Thinking manager interface
 */
export interface IThinkingManager {
    /**
     * Execute thinking process
     * @param params Thinking execution parameters
     * @returns Handler result containing thinking output
     */
    executeThinking(params: IThinkingExecutionParams): Promise<IHandlerResult<IThinkingResult>>;
}
