/**
 * @file handlers.ts
 * @path src/utils/types/agent/handlers.ts
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

/**
 * Base parameters for handler operations
 */
export interface HandlerBaseParams {
    agent: AgentType;
    task: TaskType;
    metadata?: Record<string, unknown>;
}

/**
 * Parameters for handling agent thinking process
 */
export interface ThinkingHandlerParams extends HandlerBaseParams {
    /** Message history for context */
    messages?: BaseMessage[];
    output?: Output;
}

/**
 * Parameters for tool execution handling
 */
export interface ToolHandlerParams extends HandlerBaseParams {
    tool?: Tool;
    toolName?: string;
    toolResult?: string | Record<string, unknown>;
    error?: Error;
    input?: unknown;
}

/**
 * Result structure for tool execution
 */
export interface ToolExecutionResult {
    success: boolean;
    result?: string | Record<string, unknown>;
    error?: Error;
    toolName?: string;
}

/**
 * Parameters for iteration control
 */
export interface IterationHandlerParams extends HandlerBaseParams {
    iterations: number;
    maxAgentIterations: number;
}

/**
 * Structure for thinking process results
 */
export interface ThinkingResult {
    parsedLLMOutput: Output | null;
    llmOutput: string;
    llmUsageStats: LLMUsageStats;
}

/**
 * Parameters for error handling
 */
export interface ErrorHandlerParams extends HandlerBaseParams {
    error: ErrorType;
    context?: Record<string, unknown>;
    store?: {
        getState: () => unknown;
        setState: (fn: (state: unknown) => unknown) => void;
        prepareNewLog: (params: unknown) => unknown;
    };
}

/**
 * Base result interface for handlers
 */
export interface HandlerResult<T = unknown> {
    success: boolean;
    data?: T;
    error?: Error;
    metadata?: Record<string, unknown>;
}

/**
 * Base error handler interface
 */
export interface IErrorHandler {
    handleError(params: ErrorHandlerParams & { store: Required<ErrorHandlerParams>['store'] }): Promise<HandlerResult>;
    handleLLMError(params: ErrorHandlerParams & { store: Required<ErrorHandlerParams>['store'] }): Promise<HandlerResult>;
    handleToolError(params: ToolHandlerParams & { 
        store: Required<ErrorHandlerParams>['store'];
        tool: Required<ToolHandlerParams>['tool'];
    }): Promise<HandlerResult>;
}

/**
 * Type guards for handler types
 */
export const HandlerTypeGuards = {
    isHandlerBaseParams: (value: unknown): value is HandlerBaseParams => {
        return (
            typeof value === 'object' &&
            value !== null &&
            'agent' in value &&
            'task' in value
        );
    },

    isThinkingHandlerParams: (value: unknown): value is ThinkingHandlerParams => {
        return (
            isHandlerBaseParams(value) &&
            (!('messages' in value) || Array.isArray(value.messages)) &&
            (!('output' in value) || typeof value.output === 'object')
        );
    },

    /**
     * Check if value is HandlerResult
     */
    isHandlerResult: (value: unknown): value is HandlerResult => {
        return (
            typeof value === 'object' &&
            value !== null &&
            'success' in value &&
            typeof value.success === 'boolean'
        );
    }
};

function isHandlerBaseParams(value: unknown): value is HandlerBaseParams {
    return (
        typeof value === 'object' &&
        value !== null &&
        'agent' in value &&
        'task' in value
    );
}