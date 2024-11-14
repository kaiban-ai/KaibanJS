/**
 * @file callbacks.ts
 * @path KaibanJS/src/types/llm/callbacks.ts
 * @description Type definitions for LLM callbacks and event handling
 *
 * @packageDocumentation
 * @module @types/llm
 */

import { BaseMessage } from "@langchain/core/messages";
import { LLMProvider, LLMEventMetadata, StreamingChunk } from "./common";
import { Output } from "./responses";

/**
 * Callback interface for Groq chat interactions
 */
export interface ChatGroqCallbacks {
    handleLLMStart?: (llm: any, messages: BaseMessage[]) => void | Promise<void>;
    handleLLMEnd?: (output: Output) => void | Promise<void>;
    handleLLMError?: (error: Error) => void | Promise<void>;
    handleChainStart?: (chain: any, inputs: Record<string, any>) => void | Promise<void>;
    handleChainEnd?: (outputs: Record<string, any>) => void | Promise<void>;
    handleChainError?: (error: Error) => void | Promise<void>;
    handleToolStart?: (tool: string, input: string) => void | Promise<void>;
    handleToolEnd?: (output: string) => void | Promise<void>;
    handleToolError?: (error: Error) => void | Promise<void>;
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
export interface LLMEvent {
    type: LLMEventType;
    timestamp: number;
    data: Record<string, unknown>;
    metadata?: LLMEventMetadata;
}

/**
 * Event handler configuration
 */
export interface EventHandlerConfig {
    handlers: Partial<Record<LLMEventType, (event: LLMEvent) => void>>;
    errorHandler?: (error: Error, event: LLMEvent) => void;
    batchEvents?: boolean;
    batchSize?: number;
    batchInterval?: number;
}

/**
 * Streaming handler configuration
 */
export interface StreamingHandlerConfig {
    content?: string;
    chunk?: StreamingChunk;
    metadata?: Record<string, unknown>;
    onToken?: (token: string) => void;
    onComplete?: (fullContent: string) => void;
    onError?: (error: Error) => void;
}