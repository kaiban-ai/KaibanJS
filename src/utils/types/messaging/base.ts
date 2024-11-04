/**
 * @file base.ts
 * @path src/utils/types/messaging/base.ts
 * @description Core message type definitions and interfaces
 */

import type { LLMUsageStats } from "../llm/responses";
import type { CostDetails } from "../workflow/stats";
import { BaseMessage, MessageType, MessageContent } from "@langchain/core/messages";

/**
 * Message role types
 */
export type MessageRole = 'system' | 'user' | 'assistant' | 'function';

/**
 * Function call interface matching LangChain requirements
 */
export interface FunctionCall {
    /** Function name */
    name: string;
    
    /** Stringified arguments */
    arguments: string; // Must be a string for LangChain compatibility
}

/**
 * Tool call interface for chat models
 */
export interface ToolCall {
    /** Call identifier */
    id: string;
    
    /** Call type */
    type: string;
    
    /** Function details */
    function: {
        name: string;
        arguments: string;
    };
}

/**
 * Base additional arguments for messages
 */
export interface AdditionalKwargs {
    /** Optional function call */
    function_call?: FunctionCall;
    
    /** Optional tool calls */
    tool_calls?: ToolCall[];
    
    /** Additional properties */
    [key: string]: unknown;
}

/**
 * Base message metadata fields
 */
export interface BaseMessageMetadataFields extends AdditionalKwargs {
    /** Message identifier */
    messageId?: string;
    
    /** Parent message identifier */
    parentMessageId?: string;
    
    /** Conversation identifier */
    conversationId?: string;
    
    /** Message timestamp */
    timestamp?: number;
}

/**
 * Extended metadata for chat messages
 */
export interface ChatMessageMetadataFields extends BaseMessageMetadataFields {
    /** Message identifier */
    id: string;
    
    /** Parent message identifier */
    parentId?: string;
    
    /** Creation timestamp */
    createdAt: number;
    
    /** Update timestamp */
    updatedAt: number;
    
    /** Message tags */
    tags?: string[];
    
    /** Message importance */
    importance?: number;
}

/**
 * Metadata fields for logging messages
 */
export interface LogMessageMetadataFields extends BaseMessageMetadataFields {
    /** LLM usage statistics */
    llmUsageStats: LLMUsageStats;
    
    /** Cost details */
    costDetails: CostDetails;
    
    /** Token count */
    tokenCount?: number;
}

/**
 * Combined metadata fields
 */
export interface MessageMetadataFields extends AdditionalKwargs {
    /** Message identifier */
    messageId?: string;
    
    /** Parent message identifier */
    parentMessageId?: string;
    
    /** Conversation identifier */
    conversationId?: string;
    
    /** Message timestamp */
    timestamp?: number;
    
    /** Message identifier (alternative) */
    id?: string;
    
    /** Parent identifier (alternative) */
    parentId?: string;
    
    /** Creation timestamp */
    createdAt?: number;
    
    /** Update timestamp */
    updatedAt?: number;
    
    /** Message tags */
    tags?: string[];
    
    /** Message importance */
    importance?: number;
    
    /** LLM usage statistics */
    llmUsageStats?: LLMUsageStats;
    
    /** Cost details */
    costDetails?: CostDetails;
    
    /** Token count */
    tokenCount?: number;
    
    /** Message role */
    role?: MessageRole;
    
    /** Message content */
    content?: string;
    
    /** Function name */
    name?: string;
}

/**
 * Internal chat message type
 */
export interface InternalChatMessage {
    /** Message role */
    role: MessageRole;
    
    /** Message content */
    content: MessageContent | null;
    
    /** Function name */
    name?: string;
    
    /** Function call details */
    functionCall?: FunctionCall;
    
    /** Message metadata */
    metadata?: MessageMetadataFields;
    
    /** Additional arguments */
    additional_kwargs: AdditionalKwargs;
}

/**
 * LangChain-compatible chat message
 */
export interface ChatMessage {
    /** Message role */
    role: MessageRole;
    
    /** Message content */
    content: MessageContent;
    
    /** Function name */
    name?: string;
    
    /** Function call details */
    functionCall?: FunctionCall;
    
    /** Message metadata */
    metadata?: MessageMetadataFields;
    
    /** Additional arguments */
    additional_kwargs: AdditionalKwargs;
}

/**
 * Message context interface
 */
export interface MessageContext {
    /** Message role */
    role: MessageRole;
    
    /** Message content */
    content: string;
    
    /** Message timestamp */
    timestamp: number;
    
    /** Message metadata */
    metadata?: MessageMetadataFields;
    
    /** Token count */
    tokenCount?: number;
}

/**
 * Type guard utilities for message types
 */
export const MessageTypeUtils = {
    /**
     * Check if value is a BaseMessage
     */
    isBaseMessage: (message: unknown): message is BaseMessage => 
        message instanceof BaseMessage,

    /**
     * Check if value is an internal chat message
     */
    isInternalChatMessage: (message: unknown): message is InternalChatMessage => 
        typeof message === 'object' &&
        message !== null &&
        'role' in message &&
        'content' in message &&
        'additional_kwargs' in message,

    /**
     * Check if value is a chat message
     */
    isChatMessage: (message: unknown): message is ChatMessage => 
        typeof message === 'object' &&
        message !== null &&
        'role' in message &&
        'content' in message &&
        'additional_kwargs' in message,

    /**
     * Check if value is message metadata
     */
    isMessageMetadata: (metadata: unknown): metadata is MessageMetadataFields =>
        typeof metadata === 'object' &&
        metadata !== null &&
        ('messageId' in metadata || 'role' in metadata)
};