/**
 * @file messagingHandlersTypes.ts
 * @path KaibanJS/src/types/llm/message/messagingHandlersTypes.ts
 * @description Type definitions for message handling configurations and interfaces
 * 
 * @module @types/llm/message
 */

import { 
    BaseMessage,
    AIMessage,
    HumanMessage,
    SystemMessage,
    FunctionMessage 
} from "@langchain/core/messages"; 
import { IBaseMessageMetadata, IBaseMessageMetadataFields } from "./messagingBaseTypes";          

// Base Message Handler Configuration
export interface IMessageHandlerConfig {
    onToken?: (token: string) => void;
    onComplete?: (message: BaseMessage) => void;
    onError?: (error: Error) => void;
    metadata?: IBaseMessageMetadataFields;
}

// Message Streaming Configuration
export interface IMessageStreamConfig extends IMessageHandlerConfig {
    bufferSize?: number;
    flushInterval?: number;
    maxRetries?: number;
    timeoutMs?: number;
}

// Message Validation Configuration
export interface IMessageValidationConfig {
    maxLength?: number;
    allowedRoles?: Array<'human' | 'ai' | 'system' | 'function'>;
    requiredMetadata?: (keyof IBaseMessageMetadataFields)[];
    customValidators?: ((message: BaseMessage) => boolean)[];
}

// Message Build Parameters
export interface IMessageBuildParams {
    role: 'human' | 'ai' | 'system' | 'function';
    content: string;
    metadata?: IBaseMessageMetadataFields;
    name?: string;
}

// Message Processing Result
export interface IMessageProcessResult {
    success: boolean;
    message?: BaseMessage;
    error?: Error;
    metadata?: Record<string, unknown>;
}

// Message Transformation Options
export interface IMessageTransformOptions {
    removeMetadata?: boolean;
    sanitizeContent?: boolean;
    truncateLength?: number;
    customTransforms?: ((message: BaseMessage) => BaseMessage)[];
}

// Message Result Types
export interface IMessageResult<T = unknown> {
    success: boolean;
    data?: T;
    error?: Error;
    metadata?: IBaseMessageMetadata;
}

// Type Guards
export const MessageHandlerTypeGuards = {
    isAIMessage: (message: BaseMessage): message is AIMessage =>
        message instanceof AIMessage,

    isHumanMessage: (message: BaseMessage): message is HumanMessage =>
        message instanceof HumanMessage,

    isSystemMessage: (message: BaseMessage): message is SystemMessage =>
        message instanceof SystemMessage,

    isFunctionMessage: (message: BaseMessage): message is FunctionMessage =>
        message instanceof FunctionMessage,

    isValidMessageRole: (role: string): role is 'human' | 'ai' | 'system' | 'function' =>
        ['human', 'ai', 'system', 'function'].includes(role),

    isMessageResult: <T = unknown>(value: unknown): value is IMessageResult<T> => {
        if (typeof value !== 'object' || value === null) return false;
        const result = value as Partial<IMessageResult<T>>;

        return (
            typeof result.success === 'boolean' &&
            (result.data === undefined || true) && // Any type is allowed for data
            (result.error === undefined || result.error instanceof Error) &&
            (result.metadata === undefined || typeof result.metadata === 'object')
        );
    }
};
