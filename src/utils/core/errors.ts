/**
 * @file errors.ts
 * @path C:\Users\pwalc\Documents\GroqEmailAssistant\KaibanJS\src\utils\core\errors.ts
 * @description Core error types and interfaces
 */

import { logger } from "./logger";

// ─── Base Error Types ─────────────────────────────────────────────────────────

export type ErrorKind = 
    | 'Error'
    | 'UserError'
    | 'SystemError'
    | 'ValidationError'
    | 'ConfigurationError'
    | 'LLMError';

export interface ErrorType extends Record<string, unknown> {
    name: string;
    message: string;
    stack?: string;
    type?: ErrorKind;
    location?: string;
    rootError?: Error;
    recommendedAction?: string;
    context?: Record<string, unknown>;
    [key: string]: unknown;  // Index signature to satisfy Record<string, unknown>
}

export interface ErrorConfig {
    message: string;
    type?: ErrorKind;
    name?: string;
    location?: string;
    rootError?: Error;
    recommendedAction?: string;
    context?: Record<string, unknown>;
    prettyMessage?: string;  // Added optional prettyMessage
    [key: string]: unknown;  // Allow additional properties
}

export interface PrettyErrorType extends Error {
    type: string;
    rootError: Error | null;
    recommendedAction: string | null;
    context: Record<string, unknown>;
    location: string;
    prettyMessage: string;
    originalError?: Error | null;
    [key: string]: unknown;  // Add index signature to allow additional properties
}

// ─── LLM Error Types ──────────────────────────────────────────────────────────

export interface LLMError extends Error {
    code: string;
    provider: string;
    retryable: boolean;
    context: Record<string, unknown>;
    originalError: Error | null;
    recommendedAction: string | null;
    details?: Record<string, unknown>;
}

export interface ConfigurationError extends Error {
    code: string;
    provider: string;
    retryable: boolean;
    details?: Record<string, unknown>;
    parameter?: string;
    invalidValue?: unknown;
    expectedFormat?: string;
}

// ─── Type Guard Functions ────────────────────────────────────────────────────

export function isPrettyError(error: unknown): error is PrettyErrorType {
    return (
        typeof error === 'object' &&
        error !== null &&
        'type' in error &&
        'prettyMessage' in error
    );
}

export function isLLMError(error: unknown): error is LLMError {
    return (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        'provider' in error &&
        'retryable' in error
    );
}

export function isConfigurationError(error: unknown): error is ConfigurationError {
    return (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        'provider' in error &&
        'parameter' in error
    );
}

export function isErrorType(error: unknown): error is ErrorType {
    return (
        typeof error === 'object' &&
        error !== null &&
        'name' in error &&
        'message' in error
    );
}

// ─── Utility Functions ────────────────────────────────────────────────────────

/**
 * Convert an Error object to ErrorType
 */
export function toErrorType(error: Error | unknown): ErrorType {
    if (error instanceof Error) {
        return {
            name: error.name,
            message: error.message,
            stack: error.stack,
            type: 'Error' as ErrorKind,
            context: {
                originalErrorName: error.name,
                originalErrorMessage: error.message
            },
            [Symbol.toStringTag]: 'Error'
        };
    }
    
    // Handle non-Error objects
    if (typeof error === 'object' && error !== null) {
        return {
            name: 'UnknownError',
            message: String(error),
            type: 'Error' as ErrorKind,
            context: error as Record<string, unknown>,
            [Symbol.toStringTag]: 'Error'
        };
    }
    
    // Handle primitives
    return {
        name: 'UnknownError',
        message: String(error),
        type: 'Error' as ErrorKind,
        [Symbol.toStringTag]: 'Error'
    };
}

/**
 * Create a standardized pretty error with additional context
 */
export function createPrettyError(config: ErrorConfig): PrettyErrorType {
    const { 
        message, 
        context = {}, 
        type = 'Error' as ErrorKind, 
        name, 
        location,
        rootError,
        recommendedAction,
        prettyMessage
    } = config;

    const error = new Error(message) as PrettyErrorType;
    
    // Assign additional properties
    error.name = name || type;
    error.type = type;
    error.location = location || 'Unknown';
    error.context = context;
    error.rootError = rootError || null;
    error.recommendedAction = recommendedAction || null;
    error.prettyMessage = prettyMessage || `[${type}] ${message}`;
    error.originalError = rootError || null;
    
    // Preserve original error's stack if available
    if (rootError instanceof Error) {
        error.stack = rootError.stack;
    }

    return error;
}

/**
 * Pretty Error Implementation
 */
export class PrettyError extends Error implements PrettyErrorType {
    [key: string]: unknown; // Index signature to handle arbitrary string keys

    type: string;
    rootError: Error | null;
    recommendedAction: string | null;
    context: Record<string, unknown>;
    location: string;
    prettyMessage: string;
    originalError?: Error | null;

    constructor(config: ErrorConfig) {
        super(config.message);
        this.type = config.type || 'Error';
        this.name = config.name || 'PrettyError';
        this.rootError = config.rootError || null;
        this.originalError = this.rootError;
        this.recommendedAction = config.recommendedAction || null;
        this.context = config.context || {};
        this.location = config.location || '';

        this.prettyMessage = config.prettyMessage || `[${this.type}] ${this.message}`;

        const metadata = {
            type: this.type,
            location: this.location,
            recommendedAction: this.recommendedAction,
            context: this.context,
            rootError: this.rootError
                ? {
                      message: this.rootError.message,
                      name: this.rootError.name,
                      stack: this.rootError.stack,
                  }
                : null,
        };

        Error.captureStackTrace(this, this.constructor);
        logger.error(this.prettyMessage, metadata);
    }
}
