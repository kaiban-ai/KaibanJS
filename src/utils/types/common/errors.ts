/**
 * @file errors.ts
 * @path KaibanJS/src/utils/types/common/errors.ts
 * @description Core error types and interfaces for centralized error handling
 *
 * @module @types/common
 */

import { logger } from '../../../utils/core/logger';

// ─── Error Types ────────────────────────────────────────────────────────────────

export type ErrorKind = 
    | 'SystemError'
    | 'ValidationError'
    | 'ConfigurationError'
    | 'LLMError'
    | 'AgentError'
    | 'TaskError'
    | 'WorkflowError'
    | 'StoreError';

export interface ErrorMetadata {
    timestamp: number;
    location?: string;
    component?: string;
    method?: string;
    stackTrace?: string;
    [key: string]: unknown;
}

export interface BaseError {
    name: string;
    message: string;
    type: ErrorKind;
    context?: Record<string, unknown>;
    metadata?: ErrorMetadata;
}

// Export ErrorType as an alias for BaseError since it's the canonical error type
export type ErrorType = BaseError;

export interface ErrorOptions {
    message: string;
    type: ErrorKind;
    context?: Record<string, unknown>;
    metadata?: ErrorMetadata;
    rootError?: Error;
    recommendedAction?: string;
    location?: string;
}

// ─── Domain-Specific Error Types ───────────────────────────────────────────────

export interface LLMError extends BaseError {
    type: 'LLMError';
    provider: string;
    retryable: boolean;
    model?: string;
    requestId?: string;
}

export interface ValidationError extends BaseError {
    type: 'ValidationError';
    validationType: string;
    invalidValue?: unknown;
    expectedFormat?: string;
}

export interface WorkflowError extends BaseError {
    type: 'WorkflowError';
    workflowId: string;
    phase: string;
    recoverable: boolean;
}

// ─── Error Implementation ──────────────────────────────────────────────────────

export class KaibanError extends Error implements BaseError {
    readonly type: ErrorKind;
    readonly context?: Record<string, unknown>;
    readonly metadata: ErrorMetadata;
    readonly rootError?: Error;
    readonly recommendedAction?: string;

    constructor(options: ErrorOptions) {
        super(options.message);
        this.name = 'KaibanError';
        this.type = options.type;
        this.context = options.context;
        this.metadata = {
            timestamp: Date.now(),
            location: options.location,
            ...options.metadata
        };
        this.rootError = options.rootError;
        this.recommendedAction = options.recommendedAction;

        // Preserve stack trace
        if (options.rootError?.stack) {
            this.stack = options.rootError.stack;
        } else {
            Error.captureStackTrace(this, KaibanError);
        }

        // Log error with metadata
        this.logError();
    }

    private logError(): void {
        logger.error(`[${this.type}] ${this.message}`, {
            name: this.name,
            type: this.type,
            context: this.context,
            metadata: this.metadata,
            recommendedAction: this.recommendedAction,
            rootError: this.rootError ? {
                message: this.rootError.message,
                name: this.rootError.name,
                stack: this.rootError.stack
            } : undefined
        });
    }

    public toJSON(): Record<string, unknown> {
        return {
            name: this.name,
            type: this.type,
            message: this.message,
            context: this.context,
            metadata: this.metadata,
            recommendedAction: this.recommendedAction,
            stack: this.stack
        };
    }
}

// ─── Type Guards ────────────────────────────────────────────────────────────────

export const ErrorTypeGuards = {
    isKaibanError: (error: unknown): error is KaibanError => {
        return error instanceof KaibanError;
    },

    isLLMError: (error: unknown): error is LLMError => {
        return (
            ErrorTypeGuards.isBaseError(error) &&
            error.type === 'LLMError' &&
            'provider' in error &&
            'retryable' in error
        );
    },

    isValidationError: (error: unknown): error is ValidationError => {
        return (
            ErrorTypeGuards.isBaseError(error) &&
            error.type === 'ValidationError' &&
            'validationType' in error
        );
    },

    isWorkflowError: (error: unknown): error is WorkflowError => {
        return (
            ErrorTypeGuards.isBaseError(error) &&
            error.type === 'WorkflowError' &&
            'workflowId' in error &&
            'phase' in error
        );
    },

    isBaseError: (error: unknown): error is BaseError => {
        return (
            typeof error === 'object' &&
            error !== null &&
            'name' in error &&
            'message' in error &&
            'type' in error
        );
    }
};

// ─── Utility Functions ────────────────────────────────────────────────────────

export function toKaibanError(error: unknown): KaibanError {
    if (error instanceof KaibanError) {
        return error;
    }

    if (error instanceof Error) {
        return new KaibanError({
            message: error.message,
            type: 'SystemError',
            rootError: error,
            context: {
                originalErrorName: error.name,
                originalErrorMessage: error.message
            }
        });
    }

    return new KaibanError({
        message: String(error),
        type: 'SystemError',
        context: typeof error === 'object' ? error as Record<string, unknown> : undefined
    });
}

/**
 * Convert any error type to a BaseError (ErrorType)
 */
export function toErrorType(error: unknown): ErrorType {
    const kaibanError = toKaibanError(error);
    return {
        name: kaibanError.name,
        message: kaibanError.message,
        type: kaibanError.type,
        context: kaibanError.context,
        metadata: kaibanError.metadata
    };
}

export function createError(options: ErrorOptions): KaibanError {
    return new KaibanError(options);
}
