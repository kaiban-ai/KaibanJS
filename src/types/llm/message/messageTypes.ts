/**
 * @file messageTypes.ts
 * @path KaibanJS/src/types/llm/message/messageTypes.ts
 * @description Core type definitions for LLM message domain
 * 
 * @module @types/llm/message
 */

import { MESSAGE_STATUS_enum } from '../../common/commonEnums';
import { BaseMessage, MessageContent } from "@langchain/core/messages";
import type { ILLMUsageMetrics } from '../llmMetricTypes';
import type { IStandardCostDetails } from '../../common/commonMetricTypes';

// ─── Message Role Types ────────────────────────────────────────────────────────────

export type MessageRole = 'system' | 'user' | 'assistant' | 'function';

// ─── Function and Tool Types ────────────────────────────────────────────────────────

export interface IFunctionCall {
    name: string;
    arguments: string;
}

export interface IToolCall {
    id: string;
    type: string;
    function: {
        name: string;
        arguments: string;
    };
}

// ─── Additional Arguments ──────────────────────────────────────────────────────────

export interface IAdditionalKwargs {
    function_call?: IFunctionCall;
    tool_calls?: IToolCall[];
    [key: string]: unknown;
}

// ─── Message Metadata ──────────────────────────────────────────────────────────────

export interface IMessageMetadata extends IAdditionalKwargs {
    id: string;
    messageId?: string;
    parentMessageId?: string;
    conversationId?: string;
    timestamp: number;
    status: MESSAGE_STATUS_enum;
    retryCount: number;
    priority: number;
    ttl: number;
    createdAt?: number;
    updatedAt?: number;
    tags?: string[];
    importance?: number;
    llmUsageStats?: ILLMUsageMetrics;
    costDetails?: IStandardCostDetails;
    tokenCount?: number;
    role?: MessageRole;
    content?: string;
    name?: string;
}

// ─── Message Content ───────────────────────────────────────────────────────────────

export interface IMessageContent {
    text: string;
    format?: 'text' | 'markdown' | 'html';
    encoding?: string;
    metadata?: Record<string, unknown>;
}

// ─── Message Context ───────────────────────────────────────────────────────────────

export interface IMessageContext {
    role: MessageRole;
    content: string;
    timestamp: number;
    metadata?: IMessageMetadata;
    tokenCount?: number;
    conversationId?: string;
    parentMessageId?: string;
    threadId?: string;
    tags?: string[];
    source?: string;
    target?: string;
}

// ─── Message Types ────────────────────────────────────────────────────────────────

export interface IInternalChatMessage {
    role: MessageRole;
    content: MessageContent | null;
    name?: string;
    functionCall?: IFunctionCall;
    metadata?: IMessageMetadata;
    additional_kwargs: IAdditionalKwargs;
}

export interface IChatMessage {
    role: MessageRole;
    content: MessageContent;
    name?: string;
    functionCall?: IFunctionCall;
    metadata?: IMessageMetadata;
    additional_kwargs: IAdditionalKwargs;
}

// ─── Message Configuration ───────────────────────────────────────────────────────

export interface IMessageConfig {
    maxRetries?: number;
    timeout?: number;
    priority?: number;
    ttl?: number;
    validation?: {
        maxSize?: number;
        allowedFormats?: string[];
        requiredFields?: string[];
    };
}

// ─── Message Rules ────────────────────────────────────────────────────────────────

export interface IMessageRules {
    maxMessageSize: number;
    minMessageSize: number;
    maxQueueSize: number;
    maxRetryAttempts: number;
    validStatusTransitions: Map<MESSAGE_STATUS_enum, MESSAGE_STATUS_enum[]>;
}

// ─── Message Result ───────────────────────────────────────────────────────────────

export interface IMessageResult<T = unknown> {
    success: boolean;
    data?: T;
    error?: Error;
    metadata?: IMessageMetadata;
    context?: IMessageContext;
}
