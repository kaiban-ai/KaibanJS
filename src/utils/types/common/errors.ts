/**
 * @file errors.ts
 * @path src/utils/types/common/errors.ts
 * @description Consolidated error type definitions
 */

export interface ErrorType extends Error {
    context?: Record<string, unknown>;
    originalError?: Error | null;
    recommendedAction?: string | null;
}

export interface PrettyErrorType extends ErrorType {
    type: string;
    rootError: Error | null;
    location?: string;
    prettyMessage: string;
}

export interface ErrorConfig {
    message: string;
    rootError?: Error | null;
    recommendedAction?: string | null;
    context?: Record<string, unknown>;
    location?: string;
    type?: string;
    name?: string;
}

export interface LLMError extends Error {
    code: string;
    provider: string;
    details?: Record<string, unknown>;
    retryable: boolean;
}

export interface ConfigurationError extends LLMError {
    parameter?: string;
    invalidValue?: unknown;
    expectedFormat?: string;
}

export interface RateLimitError extends LLMError {
    resetTime: number;
    window: number;
    limit: number;
    remaining: number;
}

export interface TokenLimitError extends LLMError {
    maxTokens: number;
    actualTokens: number;
    excess: number;
}

export const ErrorTypeGuards = {
    isErrorType: (value: unknown): value is ErrorType => {
        return typeof value === 'object' && value !== null &&
            value instanceof Error &&
            'context' in value;
    },

    isPrettyError: (value: unknown): value is PrettyErrorType => {
        return ErrorTypeGuards.isErrorType(value) &&
            typeof value === 'object' && value !== null &&
            'type' in value &&
            'prettyMessage' in value;
    },

    isLLMError: (value: unknown): value is LLMError => {
        return typeof value === 'object' && value !== null &&
            value instanceof Error &&
            'code' in value &&
            'provider' in value &&
            'retryable' in value;
    }
};
