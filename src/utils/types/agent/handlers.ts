/**
 * @file handlers.ts
 * @path src/utils/types/agent/handlers.ts
 * @description Agent handler interfaces and types for managing agent operations,
 * tool execution, streaming, and error handling.
 *
 * @packageDocumentation
 * @module @types/agent
 */

import { Tool } from "langchain/tools";
import { BaseMessage } from "@langchain/core/messages";
import { AgentType } from "./base";
import { TaskType } from "@/utils/types/task";
import { Output, ParsedOutput, LLMUsageStats } from "@/utils/types/llm";
import { ErrorType } from "@/utils/types/common";
import { TaskCompletionParams as BaseTaskCompletionParams } from "@/utils/types/task";
import { ParsingHandlerParams as BaseLLMParsingParams } from "@/utils/types/llm";

/**
 * Base parameters interface for all handler types
 */
export interface HandlerBaseParams {
    /** Agent instance handling the operation */
    agent: AgentType;
    
    /** Task being processed */
    task: TaskType;
    
    /** Parsed LLM output if available */
    parsedLLMOutput?: ParsedOutput | null;
}

/**
 * Parameters for handling agent thinking process
 */
export interface ThinkingHandlerParams extends HandlerBaseParams {
    /** Message history for context */
    messages?: BaseMessage[];
    
    /** Raw LLM output */
    output?: Output;
}

/**
 * Parameters for tool execution handling
 */
export interface ToolHandlerParams extends HandlerBaseParams {
    /** Tool instance being used */
    tool?: Tool;
    
    /** Name of the tool */
    toolName?: string;
    
    /** Result from tool execution */
    toolResult?: string | Record<string, unknown>;
    
    /** Error if tool execution failed */
    error?: Error;
    
    /** Input provided to the tool */
    input?: unknown;
}

/**
 * Result structure for tool execution
 */
export interface ToolExecutionResult {
    /** Whether the execution was successful */
    success: boolean;
    
    /** Execution result data */
    result?: string | Record<string, unknown>;
    
    /** Error details if execution failed */
    error?: Error;
    
    /** Name of the executed tool */
    toolName?: string;
}

/**
 * Parameters for tool execution
 */
export interface ToolExecutionParams {
    /** Agent instance */
    agent: AgentType;
    
    /** Current task */
    task: TaskType;
    
    /** Tool to execute */
    tool: Tool;
    
    /** Tool input */
    input: string;
    
    /** Tool result */
    result?: string;
    
    /** Execution error */
    error?: Error;
    
    /** Execution context */
    context?: Record<string, unknown>;
}

/**
 * Parameters for iteration control
 */
export interface IterationHandlerParams extends HandlerBaseParams {
    /** Current iteration count */
    iterations: number;
    
    /** Maximum allowed iterations */
    maxAgentIterations: number;
}

/**
 * Parameters for task completion handling
 */
export interface TaskCompletionParams extends BaseTaskCompletionParams, IterationHandlerParams {
    /** Final parsed result with answer */
    parsedResultWithFinalAnswer: ParsedOutput;
}

/**
 * Parameters for stream processing
 */
export interface StreamHandlerParams extends HandlerBaseParams {
    /** Stream data buffer */
    buffer: string[];
    
    /** Maximum buffer size */
    bufferSize: number;
    
    /** Callback for processing stream chunks */
    onChunk?: (chunk: string) => void;
}

/**
 * Parameters for retry handling
 */
export interface RetryHandlerParams extends HandlerBaseParams {
    /** Error that triggered the retry */
    error: Error;
    
    /** Current retry attempt number */
    attempt: number;
    
    /** Maximum number of retry attempts */
    maxAttempts: number;
    
    /** Delay between retries in milliseconds */
    delay: number;
}

/**
 * Parameters for validation handling
 */
export interface ValidationHandlerParams extends HandlerBaseParams {
    /** Configuration being validated */
    config: Record<string, unknown>;
    
    /** Validation result details */
    validationResult: {
        isValid: boolean;
        errors: string[];
    };
}

/**
 * Parameters for status updates and result handling
 */
export interface StatusHandlerParams extends HandlerBaseParams {
    /** Operation output */
    output: Output;
    
    /** Error if operation failed */
    error?: Error;
}

/**
 * Parameters for error handling
 */
export interface ErrorHandlerParams extends HandlerBaseParams {
    /** Error that occurred */
    error: ErrorType;
    
    /** Additional error context */
    context?: Record<string, unknown>;
    
    /** Store reference for state management */
    store?: {
        /** Get current state */
        getState: () => unknown;
        
        /** Update state */
        setState: (fn: (state: unknown) => unknown) => void;
        
        /** Create new log entry */
        prepareNewLog: (params: unknown) => unknown;
    };
}

/**
 * Parameters for parsing error handling
 */
export interface ParsingHandlerParams extends HandlerBaseParams, BaseLLMParsingParams {}

/**
 * Base result interface for all handlers
 */
export interface HandlerResult {
    success: boolean;
    error?: Error;
    data?: unknown;
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
 * Structure for thinking process results
 */
export interface ThinkingResult {
    parsedLLMOutput: ParsedOutput | null;
    llmOutput: string;
    llmUsageStats: LLMUsageStats;
}