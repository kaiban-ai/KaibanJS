/**
 * @file errors.ts
 * @path KaibanJS/src/utils/core/errors.ts
 * @description Error implementations using LogCreator factory
 */

import { logger } from './logger';
import type {
    ErrorType,
    ErrorConfig,
    PrettyErrorType,
    LLMError,
    ConfigurationError
} from '@/utils/types/common/errors';

// ─── Error Implementations ─────────────────────────────────────────────────────

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
        this.type = config.type || 'Error';
        this.name = config.name || 'PrettyError';
        this.rootError = config.rootError || null;
        this.originalError = this.rootError;
        this.recommendedAction = config.recommendedAction || null;
        this.context = config.context || {};
        this.location = config.location || '';
        
        this.prettyMessage = formatErrorMessage(config);
        
        const metadata = {
            type: this.type,
            location: this.location,
            recommendedAction: this.recommendedAction,
            context: this.context,
            rootError: this.rootError ? {
                message: this.rootError.message,
                name: this.rootError.name,
                stack: this.rootError.stack
            } : null
        };
        
        Error.captureStackTrace(this, this.constructor);
        logger.error(this.prettyMessage, metadata);
    }
}

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

        const metadata = {
            code: this.code,
            provider: this.provider,
            retryable: this.retryable,
            recommendedAction: this.recommendedAction,
            context: this.context,
            originalError: this.originalError ? {
                message: this.originalError.message,
                name: this.originalError.name,
                stack: this.originalError.stack
            } : null
        };

        Error.captureStackTrace(this, this.constructor);
        logger.error(message, metadata);
    }
}

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

        const metadata = {
            code: this.code,
            provider: this.provider,
            parameter: this.parameter,
            invalidValue: this.invalidValue,
            expectedFormat: this.expectedFormat,
            retryable: this.retryable,
            details: this.details
        };

        Error.captureStackTrace(this, this.constructor);
        logger.error(message, metadata);
    }
}

// ─── Helper Functions ──────────────────────────────────────────────────────────

function formatErrorMessage(error: ErrorConfig): string {
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

    return parts.join('\n');
}

// ─── Utility Functions ─────────────────────────────────────────────────────────

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