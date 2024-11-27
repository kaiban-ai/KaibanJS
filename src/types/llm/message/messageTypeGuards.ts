/**
 * @file messageTypeGuards.ts
 * @path KaibanJS/src/types/llm/message/messageTypeGuards.ts
 * @description Type guards for message-related types in LLM domain
 * 
 * @module @types/llm/message
 */

import { BaseMessage, SystemMessage, HumanMessage, AIMessage, FunctionMessage } from "@langchain/core/messages";
import type {
    MessageRole,
    IFunctionCall,
    IToolCall,
    IAdditionalKwargs,
    IMessageMetadata,
    IMessageContent,
    IMessageContext,
    IInternalChatMessage,
    IChatMessage,
    IMessageConfig,
    IMessageRules,
    IMessageResult
} from './messageTypes';
import type {
    IMessageResourceMetrics,
    IMessagePerformanceMetrics,
    IMessageUsageMetrics
} from './messageMetricTypes';

// ─── Core Message Type Guards ────────────────────────────────────────────────────

export const MessageTypeGuards = {
    isMessageRole: (value: unknown): value is MessageRole =>
        typeof value === 'string' && ['system', 'user', 'assistant', 'function'].includes(value),

    isFunctionCall: (value: unknown): value is IFunctionCall =>
        typeof value === 'object' && value !== null &&
        typeof (value as IFunctionCall).name === 'string' &&
        typeof (value as IFunctionCall).arguments === 'string',

    isToolCall: (value: unknown): value is IToolCall =>
        typeof value === 'object' && value !== null &&
        typeof (value as IToolCall).id === 'string' &&
        typeof (value as IToolCall).type === 'string' &&
        typeof (value as IToolCall).function === 'object' &&
        typeof (value as IToolCall).function.name === 'string' &&
        typeof (value as IToolCall).function.arguments === 'string',

    isAdditionalKwargs: (value: unknown): value is IAdditionalKwargs =>
        typeof value === 'object' && value !== null,

    isMessageMetadata: (value: unknown): value is IMessageMetadata => {
        if (typeof value !== 'object' || value === null) return false;
        const metadata = value as Partial<IMessageMetadata>;

        return (
            typeof metadata.id === 'string' &&
            typeof metadata.timestamp === 'number' &&
            typeof metadata.status === 'string' &&
            typeof metadata.retryCount === 'number' &&
            typeof metadata.priority === 'number' &&
            typeof metadata.ttl === 'number'
        );
    },

    isMessageContent: (value: unknown): value is IMessageContent => {
        if (typeof value !== 'object' || value === null) return false;
        const content = value as Partial<IMessageContent>;

        return (
            typeof content.text === 'string' &&
            (content.format === undefined || ['text', 'markdown', 'html'].includes(content.format)) &&
            (content.encoding === undefined || typeof content.encoding === 'string') &&
            (content.metadata === undefined || typeof content.metadata === 'object')
        );
    },

    isMessageContext: (value: unknown): value is IMessageContext => {
        if (typeof value !== 'object' || value === null) return false;
        const context = value as Partial<IMessageContext>;

        return (
            typeof context.role === 'string' &&
            typeof context.content === 'string' &&
            typeof context.timestamp === 'number'
        );
    },

    isInternalChatMessage: (value: unknown): value is IInternalChatMessage => {
        if (typeof value !== 'object' || value === null) return false;
        const message = value as Partial<IInternalChatMessage>;

        return (
            MessageTypeGuards.isMessageRole(message.role) &&
            (message.content === null || typeof message.content === 'string') &&
            typeof message.additional_kwargs === 'object'
        );
    },

    isChatMessage: (value: unknown): value is IChatMessage => {
        if (typeof value !== 'object' || value === null) return false;
        const message = value as Partial<IChatMessage>;

        return (
            MessageTypeGuards.isMessageRole(message.role) &&
            typeof message.content === 'string' &&
            typeof message.additional_kwargs === 'object'
        );
    }
};

// ─── LangChain Message Type Guards ────────────────────────────────────────────────

export const LangChainMessageTypeGuards = {
    isBaseMessage: (message: unknown): message is BaseMessage =>
        message instanceof BaseMessage,

    isSystemMessage: (message: unknown): message is SystemMessage =>
        message instanceof SystemMessage,

    isHumanMessage: (message: unknown): message is HumanMessage =>
        message instanceof HumanMessage,

    isAIMessage: (message: unknown): message is AIMessage =>
        message instanceof AIMessage,

    isFunctionMessage: (message: unknown): message is FunctionMessage =>
        message instanceof FunctionMessage
};

// ─── Metric Type Guards ─────────────────────────────────────────────────────────

export const MessageMetricTypeGuards = {
    isMessageResourceMetrics: (value: unknown): value is IMessageResourceMetrics => {
        if (typeof value !== 'object' || value === null) return false;
        const metrics = value as Partial<IMessageResourceMetrics>;

        return (
            typeof metrics.queueMetrics === 'object' &&
            metrics.queueMetrics !== null &&
            typeof metrics.bufferMetrics === 'object' &&
            metrics.bufferMetrics !== null &&
            typeof metrics.channelMetrics === 'object' &&
            metrics.channelMetrics !== null &&
            typeof metrics.networkMetrics === 'object' &&
            metrics.networkMetrics !== null
        );
    },

    isMessagePerformanceMetrics: (value: unknown): value is IMessagePerformanceMetrics => {
        if (typeof value !== 'object' || value === null) return false;
        const metrics = value as Partial<IMessagePerformanceMetrics>;

        return (
            typeof metrics.deliveryMetrics === 'object' &&
            metrics.deliveryMetrics !== null &&
            typeof metrics.processingMetrics === 'object' &&
            metrics.processingMetrics !== null &&
            typeof metrics.queueMetrics === 'object' &&
            metrics.queueMetrics !== null &&
            typeof metrics.recoveryMetrics === 'object' &&
            metrics.recoveryMetrics !== null
        );
    },

    isMessageUsageMetrics: (value: unknown): value is IMessageUsageMetrics => {
        if (typeof value !== 'object' || value === null) return false;
        const metrics = value as Partial<IMessageUsageMetrics>;

        return (
            typeof metrics.utilizationMetrics === 'object' &&
            metrics.utilizationMetrics !== null &&
            typeof metrics.volumeMetrics === 'object' &&
            metrics.volumeMetrics !== null &&
            typeof metrics.capacityMetrics === 'object' &&
            metrics.capacityMetrics !== null &&
            typeof metrics.rateLimit === 'object' &&
            metrics.rateLimit !== null
        );
    }
};

// ─── Result Type Guards ─────────────────────────────────────────────────────────

export const MessageResultTypeGuards = {
    isMessageResult: <T = unknown>(value: unknown): value is IMessageResult<T> => {
        if (typeof value !== 'object' || value === null) return false;
        const result = value as Partial<IMessageResult<T>>;

        return (
            typeof result.success === 'boolean' &&
            (result.data === undefined || true) && // Any type is allowed for data
            (result.error === undefined || result.error instanceof Error) &&
            (result.metadata === undefined || MessageTypeGuards.isMessageMetadata(result.metadata)) &&
            (result.context === undefined || MessageTypeGuards.isMessageContext(result.context))
        );
    }
};
