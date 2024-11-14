/**
 * @file handlers.ts
 * @path KaibanJS/src/utils/types/messaging/handlers.ts
 */

import { BaseMessage } from "@langchain/core/messages"; 
import { MessageMetadataFields } from "./base";          

// Base Message Handler Configuration
export interface MessageHandlerConfig {
    onToken?: (token: string) => void;
    onComplete?: (message: BaseMessage) => void;
    onError?: (error: Error) => void;
    metadata?: MessageMetadataFields;
}

// Message Streaming Configuration
export interface MessageStreamConfig extends MessageHandlerConfig {
    bufferSize?: number;
    flushInterval?: number;
    maxRetries?: number;
    timeoutMs?: number;
}

// Message Validation Configuration
export interface MessageValidationConfig {
    maxLength?: number;
    allowedRoles?: string[];
    requiredMetadata?: (keyof MessageMetadataFields)[];
    customValidators?: ((message: BaseMessage) => boolean)[];
}

// Message Build Parameters
export interface MessageBuildParams {
    role: string;
    content: string;
    metadata?: MessageMetadataFields;
    name?: string;
}

// Message Processing Result
export interface MessageProcessResult {
    success: boolean;
    message?: BaseMessage;
    error?: Error;
    metadata?: Record<string, unknown>;
}

// Message Transformation Options
export interface MessageTransformOptions {
    removeMetadata?: boolean;
    sanitizeContent?: boolean;
    truncateLength?: number;
    customTransforms?: ((message: BaseMessage) => BaseMessage)[];
}
