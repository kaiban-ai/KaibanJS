/**
 * @file llmCallbacksTypes.ts
 * @path KaibanJS/src/types/llm/llmCallbacksTypes.ts
 * @description Type definitions for LLM callbacks and event handling
 *
 * @module types/llm
 */

import { BaseMessage } from "@langchain/core/messages";
import { ILLMProvider, ILLMEventMetadata, IStreamingChunk } from "./llmCommonTypes";
import { IOutput } from "./llmResponseTypes";
import { IBaseError } from "../common/commonErrorTypes";

/**
 * Callback interface for Groq chat interactions
 */
export interface IChatGroqCallbacks {
    handleLLMStart?: (llm: any, messages: BaseMessage[]) => void | Promise<void>;
    handleLLMEnd?: (output: IOutput) => void | Promise<void>;
    handleLLMError?: (error: IBaseError) => void | Promise<void>;
    handleChainStart?: (chain: any, inputs: Record<string, any>) => void | Promise<void>;
    handleChainEnd?: (outputs: Record<string, any>) => void | Promise<void>;
    handleChainError?: (error: IBaseError) => void | Promise<void>;
    handleToolStart?: (tool: string, input: string) => void | Promise<void>;
    handleToolEnd?: (output: string) => void | Promise<void>;
    handleToolError?: (error: IBaseError) => void | Promise<void>;
}

/**
 * LLM event types
 */
export type LLMEventType = 
    | 'request.start'
    | 'request.end'
    | 'request.error'
    | 'token.received'
    | 'rate.limited'
    | 'cache.hit'
    | 'cache.miss'
    | 'memory.pruned'
    | 'budget.exceeded';

/**
 * LLM event interface
 */
export interface ILLMEvent {
    type: LLMEventType;
    timestamp: number;
    data: Record<string, unknown>;
    metadata?: ILLMEventMetadata;
}

/**
 * Event handler configuration
 */
export interface IEventHandlerConfig {
    handlers: Partial<Record<LLMEventType, (event: ILLMEvent) => void>>;
    errorHandler?: (error: IBaseError, event: ILLMEvent) => void;
    batchEvents?: boolean;
    batchSize?: number;
    batchInterval?: number;
}

/**
 * Streaming handler configuration
 */
export interface IStreamingHandlerConfig {
    content?: string;
    chunk?: IStreamingChunk;
    metadata?: Record<string, unknown>;
    onToken?: (token: string) => void;
    onComplete?: (fullContent: string) => void;
    onError?: (error: IBaseError) => void;
}
