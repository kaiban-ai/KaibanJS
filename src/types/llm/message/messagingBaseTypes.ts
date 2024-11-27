/**
 * @file messagingBaseTypes.ts
 * @path KaibanJS/src/types/llm/message/messagingBaseTypes.ts
 * @description Core type definitions for messaging system including message roles, metadata, and type guards
 * 
 * @module @types/llm/message
 */

import type { ILLMUsageMetrics } from '../llmMetricTypes';
import type { IStandardCostDetails } from '../../common/commonMetricTypes';
import { BaseMessage, MessageContent } from "@langchain/core/messages";

// Message Role Types
export type MessageRole = 'system' | 'user' | 'assistant' | 'function';

// Function Call Interface
export interface IFunctionCall {
    name: string;
    arguments: string;
}

// Tool Call Interface
export interface IToolCall {
    id: string;
    type: string;
    function: {
        name: string;
        arguments: string;
    };
}

// Additional Arguments for Messages
export interface IAdditionalKwargs {
    function_call?: IFunctionCall;
    tool_calls?: IToolCall[];
    [key: string]: unknown;
}

// Base Message Metadata
export interface IBaseMessageMetadataFields extends IAdditionalKwargs {
    messageId?: string;
    parentMessageId?: string;
    conversationId?: string;
    timestamp?: number;
}

// Extended Metadata for Chat Messages
export interface IChatMessageMetadataFields extends IBaseMessageMetadataFields {
    id: string;
    parentId?: string;
    createdAt: number;
    updatedAt: number;
    tags?: string[];
    importance?: number;
}

// Metadata for Logging Messages
export interface ILogMessageMetadataFields extends IBaseMessageMetadataFields {
    llmUsageStats: ILLMUsageMetrics;
    costDetails: IStandardCostDetails;
    tokenCount?: number;
}

// Combined Message Metadata Fields
export interface IMessageMetadataFields extends IAdditionalKwargs {
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
    llmUsageStats?: ILLMUsageMetrics;
    costDetails?: IStandardCostDetails;
    tokenCount?: number;
    role?: MessageRole;
    content?: string;
    name?: string;
}

// Internal Chat Message Type
export interface IInternalChatMessage {
    role: MessageRole;
    content: MessageContent | null;
    name?: string;
    functionCall?: IFunctionCall;
    metadata?: IMessageMetadataFields;
    additional_kwargs: IAdditionalKwargs;
}

// LangChain-Compatible Chat Message
export interface IChatMessage {
    role: MessageRole;
    content: MessageContent;
    name?: string;
    functionCall?: IFunctionCall;
    metadata?: IMessageMetadataFields;
    additional_kwargs: IAdditionalKwargs;
}

// Message Context Interface
export interface IMessageContext {
    role: MessageRole;
    content: string;
    timestamp: number;
    metadata?: IMessageMetadataFields;
    tokenCount?: number;
}

// Type Guard Utilities
export const MessageTypeUtils = {
    isBaseMessage: (message: unknown): message is BaseMessage =>
        message instanceof BaseMessage,

    isInternalChatMessage: (message: unknown): message is IInternalChatMessage =>
        typeof message === 'object' && message !== null && 'role' in message && 'content' in message && 'additional_kwargs' in message,

    isChatMessage: (message: unknown): message is IChatMessage =>
        typeof message === 'object' && message !== null && 'role' in message && 'content' in message && 'additional_kwargs' in message,

    isMessageMetadata: (metadata: unknown): metadata is IMessageMetadataFields =>
        typeof metadata === 'object' && metadata !== null && ('messageId' in metadata || 'role' in metadata)
};
