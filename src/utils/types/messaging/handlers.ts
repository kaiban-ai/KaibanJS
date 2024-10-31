/**
 * @file handlers.ts
 * @path src/types/messaging/handlers.ts
 * @description Message handler interfaces and types
 *
 * @packageDocumentation
 * @module @types/messaging
 */

import { BaseMessage } from "@langchain/core/messages";
import { MessageMetadataFields } from "./base";

/**
 * Base configuration for message handlers
 */
export interface MessageHandlerConfig {
    onToken?: (token: string) => void;
    onComplete?: (message: BaseMessage) => void;
    onError?: (error: Error) => void;
    metadata?: MessageMetadataFields;
}

/**
 * Configuration for message streaming
 */
export interface MessageStreamConfig extends MessageHandlerConfig {
    bufferSize?: number;
    flushInterval?: number;
    maxRetries?: number;
    timeoutMs?: number;
}

/**
 * Message validation configuration
 */
export interface MessageValidationConfig {
    maxLength?: number;
    allowedRoles?: string[];
    requiredMetadata?: (keyof MessageMetadataFields)[];
    customValidators?: ((message: BaseMessage) => boolean)[];
}

/**
 * Message build parameters
 */
export interface MessageBuildParams {
    role: string;
    content: string;
    metadata?: MessageMetadataFields;
    name?: string;
}

/**
 * Message processing result
 */
export interface MessageProcessResult {
    success: boolean;
    message?: BaseMessage;
    error?: Error;
    metadata?: Record<string, unknown>;
}

/**
 * Message stream handler
 */
export interface MessageStreamHandler {
    onToken: (token: string) => void;
    onComplete: (message: BaseMessage) => void;
    onError: (error: Error) => void;
    getBuffer: () => string[];
    clearBuffer: () => void;
}

/**
 * Message validation result
 */
export interface MessageValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    metadata?: Record<string, unknown>;
}

/**
 * Message transformation options
 */
export interface MessageTransformOptions {
    removeMetadata?: boolean;
    sanitizeContent?: boolean;
    truncateLength?: number;
    customTransforms?: ((message: BaseMessage) => BaseMessage)[];
}