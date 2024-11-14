/**
 * @file errors.ts
 * @path KaibanJS/src/utils/types/common/errors.ts
 * @description Core error types and interfaces
 */

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
}

export interface PrettyErrorType extends Error {
    type: string;
    rootError: Error | null;
    recommendedAction: string | null;
    context: Record<string, unknown>;
    location: string;
    prettyMessage: string;
    originalError?: Error | null;
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
