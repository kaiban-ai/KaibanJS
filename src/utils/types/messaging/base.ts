/**
 * @file base.ts
 * @path src/types/messaging/base.ts
 * @description Core message type definitions and interfaces
 *
 * @packageDocumentation
 * @module @types/messaging
 */

import { LLMUsageStats } from "../llm/responses";
import { CostDetails } from "../workflow/stats";
import { BaseMessage, MessageType, MessageContent } from "@langchain/core/messages";

/**
 * Message role types
 */
export type MessageRole = 'system' | 'user' | 'assistant' | 'function';

/**
 * Function call interface matching LangChain requirements
 */
export interface FunctionCall {
    name: string;
    arguments: string; // Must be a string for LangChain compatibility
}

/**
 * Tool call interface for chat models
 */
export interface ToolCall {
    id: string;
    type: string;
    function: {
        name: string;
        arguments: string;
    };
}

/**
 * Base additional arguments for messages
 */
export interface AdditionalKwargs {
    function_call?: FunctionCall;
    tool_calls?: ToolCall[];
    [key: string]: unknown;
}

/**
 * Base message metadata fields
 */
export interface BaseMessageMetadataFields extends AdditionalKwargs {
    messageId?: string;
    parentMessageId?: string;
    conversationId?: string;
    timestamp?: number;
}

/**
 * Extended metadata for chat messages
 */
export interface ChatMessageMetadataFields extends BaseMessageMetadataFields {
    id: string;
    parentId?: string;
    createdAt: number;
    updatedAt: number;
    tags?: string[];
    importance?: number;
}

/**
 * Metadata fields for logging
 */
export interface LogMessageMetadataFields extends BaseMessageMetadataFields {
    llmUsageStats: LLMUsageStats;
    costDetails: CostDetails;
    tokenCount?: number;
}

/**
 * Combined metadata fields
 */
export interface MessageMetadataFields extends AdditionalKwargs {
    messageId?: string;
    parentMessageId?: string;
    conversationId?: string;
    timestamp?: number;
    id?: string;
    parentId?: string;
    createdAt?: number;
    updatedAt?: number;
    tags?: string[];
    importance?: number;
    llmUsageStats?: LLMUsageStats;
    costDetails?: CostDetails;
    tokenCount?: number;
    role?: MessageRole;
    content?: string;
    name?: string;
}

/**
 * Internal chat message type
 */
export interface InternalChatMessage {
    role: MessageRole;
    content: MessageContent | null;
    name?: string;
    functionCall?: FunctionCall;
    metadata?: MessageMetadataFields;
    additional_kwargs: AdditionalKwargs;
}

/**
 * LangChain-compatible chat message
 */
export interface ChatMessage {
    role: MessageRole;
    content: MessageContent;
    name?: string;
    functionCall?: FunctionCall;
    metadata?: MessageMetadataFields;
    additional_kwargs: AdditionalKwargs;
}

/**
 * Message context interface
 */
export interface MessageContext {
    role: MessageRole;
    content: string;
    timestamp: number;
    metadata?: MessageMetadataFields;
    tokenCount?: number;
}

/**
 * Utility functions for handling message types
 */
export const MessageTypeUtils = {
    isBaseMessage: (message: unknown): message is BaseMessage => 
        message instanceof BaseMessage,

    isInternalChatMessage: (message: unknown): message is InternalChatMessage => 
        typeof message === 'object' &&
        message !== null &&
        'role' in message &&
        'content' in message &&
        'additional_kwargs' in message,

    isChatMessage: (message: unknown): message is ChatMessage => 
        typeof message === 'object' &&
        message !== null &&
        'role' in message &&
        'content' in message &&
        'additional_kwargs' in message,

    isMessageMetadata: (metadata: unknown): metadata is MessageMetadataFields =>
        typeof metadata === 'object' &&
        metadata !== null &&
        ('messageId' in metadata || 'role' in metadata)
};