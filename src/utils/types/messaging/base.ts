/**
 * @file base.ts
 * @path src/utils/types/messaging/base.ts
 */

import type { LLMUsageStats } from "../llm";
import { CostDetails } from "../workflow";
import { BaseMessage, MessageContent } from "@langchain/core/messages";

// Message Role Types
export type MessageRole = 'system' | 'user' | 'assistant' | 'function';

// Function Call Interface
export interface FunctionCall {
    name: string;
    arguments: string;
}

// Tool Call Interface
export interface ToolCall {
    id: string;
    type: string;
    function: {
        name: string;
        arguments: string;
    };
}

// Additional Arguments for Messages
export interface AdditionalKwargs {
    function_call?: FunctionCall;
    tool_calls?: ToolCall[];
    [key: string]: unknown;
}

// Base Message Metadata
export interface BaseMessageMetadataFields extends AdditionalKwargs {
    messageId?: string;
    parentMessageId?: string;
    conversationId?: string;
    timestamp?: number;
}

// Extended Metadata for Chat Messages
export interface ChatMessageMetadataFields extends BaseMessageMetadataFields {
    id: string;
    parentId?: string;
    createdAt: number;
    updatedAt: number;
    tags?: string[];
    importance?: number;
}

// Metadata for Logging Messages
export interface LogMessageMetadataFields extends BaseMessageMetadataFields {
    llmUsageStats: LLMUsageStats;
    costDetails: CostDetails;
    tokenCount?: number;
}

// Combined Message Metadata Fields
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

// Internal Chat Message Type
export interface InternalChatMessage {
    role: MessageRole;
    content: MessageContent | null;
    name?: string;
    functionCall?: FunctionCall;
    metadata?: MessageMetadataFields;
    additional_kwargs: AdditionalKwargs;
}

// LangChain-Compatible Chat Message
export interface ChatMessage {
    role: MessageRole;
    content: MessageContent;
    name?: string;
    functionCall?: FunctionCall;
    metadata?: MessageMetadataFields;
    additional_kwargs: AdditionalKwargs;
}

// Message Context Interface
export interface MessageContext {
    role: MessageRole;
    content: string;
    timestamp: number;
    metadata?: MessageMetadataFields;
    tokenCount?: number;
}

// Type Guard Utilities
export const MessageTypeUtils = {
    isBaseMessage: (message: unknown): message is BaseMessage =>
        message instanceof BaseMessage,

    isInternalChatMessage: (message: unknown): message is InternalChatMessage =>
        typeof message === 'object' && message !== null && 'role' in message && 'content' in message && 'additional_kwargs' in message,

    isChatMessage: (message: unknown): message is ChatMessage =>
        typeof message === 'object' && message !== null && 'role' in message && 'content' in message && 'additional_kwargs' in message,

    isMessageMetadata: (metadata: unknown): metadata is MessageMetadataFields =>
        typeof metadata === 'object' && metadata !== null && ('messageId' in metadata || 'role' in metadata)
};
