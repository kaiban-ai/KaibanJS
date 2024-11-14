/**
 * @file handlers.ts
 * @path KaibanJS/src/utils/types/agent/handlers.ts
 * @description Agent handler interfaces and types for managing agent operations
 */

import { Tool } from "langchain/tools";
import { BaseMessage } from "@langchain/core/messages";
import { AgentType } from "./base";
import { TaskType } from "../task/base";
import { Output, LLMUsageStats } from "../llm/responses";
import { ErrorType } from "../common/errors";
import { ParsingHandlerParams } from "../llm/parsing";
import { CostDetails } from "../workflow/costs";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import { ParsedOutput } from "../llm/responses";
import { ExecutionContext } from "./config";

// Base parameters for handler operations
export interface HandlerBaseParams {
    agent?: AgentType;
    task?: TaskType;
    metadata?: Record<string, unknown>;
}

// Parameters for handling agent thinking process
export interface ThinkingHandlerParams extends HandlerBaseParams {
    messages?: BaseMessage[];
    output?: Output;
}

// Parameters for tool execution handling
export interface ToolHandlerParams extends HandlerBaseParams {
    tool?: Tool;
    toolName?: string;
    toolResult?: string | Record<string, unknown>;
    error?: Error;
    input?: unknown;
}

// Parameters for agent thinking execution
export interface ThinkingExecutionParams {
    task: TaskType;
    ExecutableAgent: RunnableWithMessageHistory<Record<string, any>, string>;
    feedbackMessage: string;
    callOptions?: {
        stop?: string[];
        timeout?: number;
        metadata?: Record<string, unknown>;
        tags?: string[];
    };
}

// Result structure for thinking process results
export interface ThinkingExecutionResult {
    parsedOutput: ParsedOutput | null;
    llmOutput: string;
    llmUsageStats: LLMUsageStats;
    messages?: BaseMessage[];
}

// Parameters for tool execution
export interface ToolExecutionParams {
    task: TaskType;
    tool: Tool;
    input: string | Record<string, unknown>;
    context: ExecutionContext;
    parsedOutput?: ParsedOutput;
    ExecutableAgent?: RunnableWithMessageHistory<Record<string, any>, string>;
}

export interface ToolExecutionResult {
    success: boolean;
    result?: string;
    error?: Error;
    costDetails?: CostDetails;
    usageStats?: LLMUsageStats;
}

// Parameters for action handling configuration
export interface ActionHandlerConfig {
    task: TaskType;
    agent: AgentType;
    context: ExecutionContext;
    parsedOutput: ParsedOutput;
}

// Result structure for action handling
export interface ActionHandlerResult {
    success: boolean;
    feedbackMessage: string;
    error?: Error;
    shouldContinue: boolean;
}

// Parameters for iteration control
export interface IterationHandlerParams extends HandlerBaseParams {
    iterations: number;
    maxAgentIterations: number;
}

// Parameters for loop control
export interface LoopControlParams {
    task: TaskType;
    agent: AgentType;
    iterations: number;
    maxIterations: number;
    lastOutput?: Output;
    error?: Error;
}

// Result structure for loop control
export interface LoopControlResult {
    shouldContinue: boolean;
    feedbackMessage?: string;
    error?: Error;
}

// Parameters for error handling
export interface ErrorHandlerParams extends HandlerBaseParams {
    error: ErrorType;
    context?: Record<string, unknown>;
    store?: {
        getState: () => unknown;
        setState: (fn: (state: unknown) => unknown) => void;
        prepareNewLog: (params: unknown) => unknown;
    };
}

// Base result interface for handlers
export interface HandlerResult<T = unknown> {
    success: boolean;
    data?: T;
    error?: Error;
    metadata?: Record<string, unknown>;
}

// Status update parameters
export interface StatusUpdateParams {
    task: TaskType;
    agent: AgentType;
    status: string;
    metadata?: Record<string, unknown>;
    description?: string;
}

// Base error handler interface
export interface IErrorHandler {
    handleError(params: ErrorHandlerParams & { store: Required<ErrorHandlerParams>['store'] }): Promise<HandlerResult>;
    handleLLMError(params: ErrorHandlerParams & { store: Required<ErrorHandlerParams>['store'] }): Promise<HandlerResult>;
    handleToolError(params: ToolHandlerParams & { 
        store: Required<ErrorHandlerParams>['store'];
        tool: Required<ToolHandlerParams>['tool'];
    }): Promise<HandlerResult>;
}

// Type guards for handler types
export const HandlerTypeGuards = {
    isExecutionContext: (value: unknown): value is ExecutionContext => {
        if (!value || typeof value !== 'object') return false;
        const ctx = value as Partial<ExecutionContext>;
        return !!(
            ctx.task &&
            ctx.agent &&
            typeof ctx.iterations === 'number' &&
            typeof ctx.maxAgentIterations === 'number' &&
            typeof ctx.startTime === 'number'
        );
    },

    isThinkingExecutionResult: (value: unknown): value is ThinkingExecutionResult => {
        if (!value || typeof value !== 'object') return false;
        const result = value as Partial<ThinkingExecutionResult>;
        return !!(
            'llmOutput' in result &&
            'llmUsageStats' in result &&
            typeof result.llmOutput === 'string'
        );
    },

    isToolExecutionResult: (value: unknown): value is ToolExecutionResult => {
        if (!value || typeof value !== 'object') return false;
        const result = value as Partial<ToolExecutionResult>;
        return typeof result.success === 'boolean';
    },

    isActionHandlerResult: (value: unknown): value is ActionHandlerResult => {
        if (!value || typeof value !== 'object') return false;
        const result = value as Partial<ActionHandlerResult>;
        return !!(
            typeof result.success === 'boolean' &&
            typeof result.feedbackMessage === 'string' &&
            typeof result.shouldContinue === 'boolean'
        );
    }
};

// Default values for various configurations
export const DefaultValues = {
    llmUsageStats: (): LLMUsageStats => ({
        inputTokens: 0,
        outputTokens: 0,
        callsCount: 0,
        callsErrorCount: 0,
        parsingErrors: 0,
        totalLatency: 0,
        averageLatency: 0,
        lastUsed: Date.now(),
        memoryUtilization: {
            peakMemoryUsage: 0,
            averageMemoryUsage: 0,
            cleanupEvents: 0
        },
        costBreakdown: {
            input: 0,
            output: 0,
            total: 0,
            currency: 'USD'
        }
    })
};
