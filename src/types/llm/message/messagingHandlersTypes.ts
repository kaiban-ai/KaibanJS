/**
 * @file messagingHandlersTypes.ts
 * @path KaibanJS/src/types/llm/message/messagingHandlersTypes.ts
 * @description Type definitions for message handling configurations and interfaces
 * 
 * @module @types/llm/message
 */

import { BaseMessage } from "@langchain/core/messages"; 
import { IMessageMetadataFields } from "./messagingBaseTypes";          

// Base Message Handler Configuration
export interface IMessageHandlerConfig {
    onToken?: (token: string) => void;
    onComplete?: (message: BaseMessage) => void;
    onError?: (error: Error) => void;
    metadata?: IMessageMetadataFields;
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
    allowedRoles?: string[];
    requiredMetadata?: (keyof IMessageMetadataFields)[];
    customValidators?: ((message: BaseMessage) => boolean)[];
}

// Message Build Parameters
export interface IMessageBuildParams {
    role: string;
    content: string;
    metadata?: IMessageMetadataFields;
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
