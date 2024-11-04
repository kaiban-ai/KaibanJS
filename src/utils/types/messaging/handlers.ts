/**
 * @file handlers.ts
 * @path src/utils/types/messaging/handlers.ts
 * @description Type definitions for message handling operations
 */

import type { BaseMessage } from "@langchain/core/messages";
import type { MessageMetadataFields } from "./base";

/**
 * Base configuration for message handlers
 */
export interface MessageHandlerConfig {
    /** Token handler */
    onToken?: (token: string) => void;
    
    /** Completion handler */
    onComplete?: (message: BaseMessage) => void;
    
    /** Error handler */
    onError?: (error: Error) => void;
    
    /** Message metadata */
    metadata?: MessageMetadataFields;
}

/**
 * Configuration for message streaming
 */
export interface MessageStreamConfig extends MessageHandlerConfig {
    /** Buffer size */
    bufferSize?: number;
    
    /** Flush interval */
    flushInterval?: number;
    
    /** Maximum retries */
    maxRetries?: number;
    
    /** Timeout in milliseconds */
    timeoutMs?: number;
}

/**
 * Configuration for message validation
 */
export interface MessageValidationConfig {
    /** Maximum message length */
    maxLength?: number;
    
    /** Allowed roles */
    allowedRoles?: string[];
    
    /** Required metadata fields */
    requiredMetadata?: (keyof MessageMetadataFields)[];
    
    /** Custom validator functions */
    customValidators?: ((message: BaseMessage) => boolean)[];
}

/**
 * Message build parameters
 */
export interface MessageBuildParams {
    /** Message role */
    role: string;
    
    /** Message content */
    content: string;
    
    /** Message metadata */
    metadata?: MessageMetadataFields;
    
    /** Function name */
    name?: string;
}

/**
 * Message processing result
 */
export interface MessageProcessResult {
    /** Success indicator */
    success: boolean;
    
    /** Processed message */
    message?: BaseMessage;
    
    /** Processing error */
    error?: Error;
    
    /** Processing metadata */
    metadata?: Record<string, unknown>;
}

/**
 * Message transformation options
 */
export interface MessageTransformOptions {
    /** Remove metadata flag */
    removeMetadata?: boolean;
    
    /** Sanitize content flag */
    sanitizeContent?: boolean;
    
    /** Maximum content length */
    truncateLength?: number;
    
    /** Custom transform functions */
    customTransforms?: ((message: BaseMessage) => BaseMessage)[];
}