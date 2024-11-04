/**
 * @file errors.ts
 * @path src/utils/core/errors.ts
 * @description Error implementation classes
 */

import { logger } from "./logger";
import type {
    ErrorType,
    PrettyErrorType,
    ErrorConfig,
    LLMError,
    ConfigurationError
} from '@/utils/types/common/errors';

/**
 * Creates a formatted error message with context
 */
function createPrettyMessage(error: ErrorConfig): string {
    const parts: string[] = [
        `🚨 ${error.name || 'Error'}: ${error.message}`
    ];

    if (error.location) {
        parts.push(`📍 Location: ${error.location}`);
    }

    if (error.rootError?.message) {
        parts.push(`📋 Root Cause: ${error.rootError.message}`);
        if (error.rootError.stack) {
            parts.push('Stack Trace:');
            parts.push(error.rootError.stack);
        }
    }

    if (error.recommendedAction) {
        parts.push(`💡 Recommended Action: ${error.recommendedAction}`);
    }

    if (error.context && Object.keys(error.context).length > 0) {
        parts.push('📄 Context:');
        parts.push(JSON.stringify(error.context, null, 2));
    }

    return parts.join('\n');
}

/**
 * Enhanced error class with formatting capabilities
 */
export class PrettyError extends Error implements PrettyErrorType {
    type: string;
    rootError: Error | null;
    recommendedAction: string | null;
    context: Record<string, unknown>;
    location: string;
    prettyMessage: string;
    originalError?: Error | null;

    constructor(config: ErrorConfig) {
        super(config.message);
        this.type = config.type || "Error";
        this.name = config.name || "PrettyError";
        this.rootError = config.rootError || null;
        this.originalError = this.rootError;
        this.recommendedAction = config.recommendedAction || null;
        this.context = config.context || {};
        this.location = config.location || "";
        this.prettyMessage = createPrettyMessage(config);
        
        Error.captureStackTrace(this, this.constructor);
        logger.error(this.prettyMessage);
    }
}

/**
 * LLM invocation error implementation
 */
export class LLMInvocationError extends Error implements LLMError {
    code: string;
    provider: string;
    retryable: boolean;
    context: Record<string, unknown>;
    originalError: Error | null;
    recommendedAction: string | null;
    details?: Record<string, unknown>;

    constructor(
        message: string,
        provider: string,
        originalError: Error | null = null,
        recommendedAction: string | null = null,
        context: Record<string, unknown> = {}
    ) {
        super(message);
        this.name = "LLMInvocationError";
        this.code = "LLM_INVOCATION_ERROR";
        this.provider = provider;
        this.retryable = false;
        this.context = context;
        this.originalError = originalError;
        this.recommendedAction = recommendedAction;

        Error.captureStackTrace(this, this.constructor);
        logger.error(this.formattedMessage);
    }

    get formattedMessage(): string {
        return createPrettyMessage({
            message: this.message,
            name: this.name,
            rootError: this.originalError,
            recommendedAction: this.recommendedAction,
            context: this.context
        });
    }
}

/**
 * LLM configuration error implementation
 */
export class LLMConfigurationError extends Error implements ConfigurationError {
    code: string;
    provider: string;
    retryable: boolean;
    details?: Record<string, unknown>;
    parameter?: string;
    invalidValue?: unknown;
    expectedFormat?: string;

    constructor(
        message: string,
        provider: string,
        parameter?: string,
        invalidValue?: unknown,
        expectedFormat?: string
    ) {
        super(message);
        this.name = "LLMConfigurationError";
        this.code = "INVALID_CONFIG";
        this.provider = provider;
        this.retryable = false;
        this.parameter = parameter;
        this.invalidValue = invalidValue;
        this.expectedFormat = expectedFormat;
        this.details = {
            parameter,
            invalidValue,
            expectedFormat
        };

        Error.captureStackTrace(this, this.constructor);
        logger.error(this.formattedMessage);
    }

    get formattedMessage(): string {
        return createPrettyMessage({
            message: this.message,
            name: this.name,
            context: {
                provider: this.provider,
                parameter: this.parameter,
                invalidValue: this.invalidValue,
                expectedFormat: this.expectedFormat
            }
        });
    }
}

/**
 * Error handler utility functions
 */
export function isPrettyError(error: unknown): error is PrettyError {
    return error instanceof PrettyError;
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

export function wrapError(
    error: Error,
    context?: Record<string, unknown>,
    recommendedAction?: string
): PrettyError {
    return new PrettyError({
        message: error.message,
        rootError: error,
        context,
        recommendedAction
    });
}

export function createUserError(
    message: string,
    recommendedAction?: string,
    context?: Record<string, unknown>
): PrettyError {
    return new PrettyError({
        message,
        type: 'UserError',
        recommendedAction,
        context
    });
}