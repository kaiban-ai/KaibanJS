/**
 * @file errors.ts
 * @path src/utils/types/common/errors.ts
 * @description Consolidated error type definitions
 */

/**
 * Base error type with enhanced context
 */
export interface ErrorType extends Error {
    /** Additional context about the error */
    context?: Record<string, unknown>;
    
    /** Original error that caused this error */
    originalError?: Error | null;
    
    /** Suggested action to resolve the error */
    recommendedAction?: string | null;
}

/**
 * Enhanced error type with formatting capabilities
 */
export interface PrettyErrorType extends ErrorType {
    /** Error category or classification */
    type: string;
    
    /** Root cause error */
    rootError: Error | null;
    
    /** Error location in code */
    location?: string;
    
    /** Formatted error message */
    prettyMessage: string;
}

/**
 * Error configuration interface for creating pretty errors
 */
export interface ErrorConfig {
    /** Error message */
    message: string;
    
    /** Original error if any */
    rootError?: Error | null;
    
    /** Recommended action */
    recommendedAction?: string | null;
    
    /** Error context */
    context?: Record<string, unknown>;
    
    /** Error location */
    location?: string;
    
    /** Error type */
    type?: string;
    
    /** Error name */
    name?: string;
}

/**
 * LLM-specific error interface
 */
export interface LLMError extends Error {
    /** Error code */
    code: string;
    
    /** LLM provider name */
    provider: string;
    
    /** Additional error details */
    details?: Record<string, unknown>;
    
    /** Whether error can be retried */
    retryable: boolean;
}

/**
 * Configuration error interface
 */
export interface ConfigurationError extends LLMError {
    /** Configuration parameter that caused the error */
    parameter?: string;
    
    /** Invalid value */
    invalidValue?: unknown;
    
    /** Expected value type or format */
    expectedFormat?: string;
}

/**
 * Rate limit error interface
 */
export interface RateLimitError extends LLMError {
    /** When rate limit resets */
    resetTime: number;
    
    /** Current rate limit window */
    window: number;
    
    /** Maximum requests allowed */
    limit: number;
    
    /** Remaining requests */
    remaining: number;
}

/**
 * Token limit error interface
 */
export interface TokenLimitError extends LLMError {
    /** Maximum allowed tokens */
    maxTokens: number;
    
    /** Actual token count */
    actualTokens: number;
    
    /** Token overage */
    excess: number;
}

/**
 * Type guard utilities for error types
 */
export const ErrorTypeGuards = {
    /**
     * Check if a value is an ErrorType
     */
    isErrorType: (value: unknown): value is ErrorType => {
        return value instanceof Error &&
            'context' in value;
    },

    /**
     * Check if a value is a PrettyErrorType
     */
    isPrettyError: (value: unknown): value is PrettyErrorType => {
        return ErrorTypeGuards.isErrorType(value) &&
            'type' in value &&
            'prettyMessage' in value;
    },

    /**
     * Check if a value is an LLMError
     */
    isLLMError: (value: unknown): value is LLMError => {
        return value instanceof Error &&
            'code' in value &&
            'provider' in value &&
            'retryable' in value;
    }
};