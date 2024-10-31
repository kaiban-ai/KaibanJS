/**
 * Path: C:\Users\pwalc\Documents\GroqEmailAssistant\KaibanJS\src\utils\core\errors.ts
 * 
 * Custom Error Definitions.
 *
 * This file defines custom error classes and interfaces for handling specific error scenarios 
 * within the KaibanJS library. It includes errors for API invocation failures and more nuanced 
 * errors that provide detailed diagnostic information.
 *
 * @packageDocumentation
 */

/**
 * Base error type with extended functionality
 */
export interface ErrorType extends Error {
    /** Additional context information */
    context?: Record<string, any>;
    /** Original error that caused this error */
    originalError?: Error | null;
    /** Suggested action to resolve the error */
    recommendedAction?: string | null;
}

/**
 * Enhanced error type with formatting and context
 */
export interface PrettyErrorType extends ErrorType {
    /** Error category or classification */
    type: string;
    /** Original error that caused this error */
    rootError: Error | null;
    /** Where the error occurred */
    location?: string;
    /** Formatted error message */
    prettyMessage: string;
}

/**
 * Represents an error that occurs during LLM API invocation.
 */
export class LLMInvocationError extends Error implements ErrorType {
    context: Record<string, any>;
    originalError: Error | null;
    recommendedAction: string | null;

    /**
     * Creates an instance of LLMInvocationError.
     * @param message - The error message
     * @param originalError - The original error that caused this error, if any
     * @param recommendedAction - Suggested action to resolve the error
     * @param context - Additional context information about the error
     */
    constructor(
        message: string, 
        originalError: Error | null = null, 
        recommendedAction: string | null = null, 
        context: Record<string, any> = {}
    ) {
        super(message);
        this.name = "LLMInvocationError";
        this.context = context;
        this.originalError = originalError;
        this.recommendedAction = recommendedAction;
        Error.captureStackTrace(this, this.constructor);
    }

    /**
     * Get formatted error message
     */
    get formattedMessage(): string {
        const parts: string[] = [
            `🚨 ${this.name}: ${this.message}`
        ];

        if (this.originalError?.message) {
            parts.push(`📋 Original Error: ${this.originalError.message}`);
        }

        if (this.recommendedAction) {
            parts.push(`💡 Recommended Action: ${this.recommendedAction}`);
        }

        if (Object.keys(this.context).length > 0) {
            parts.push('📄 Context:');
            parts.push(JSON.stringify(this.context, null, 2));
        }

        return parts.join('\n');
    }
}

/**
 * Represents a formatted error with additional context and recommendations.
 */
export class PrettyError extends Error implements PrettyErrorType {
    type: string;
    rootError: Error | null;
    recommendedAction: string | null;
    context: Record<string, any>;
    location: string;
    prettyMessage: string;
    originalError?: Error | null;

    /**
     * Creates an instance of PrettyError.
     * @param options - Configuration options for the error
     */
    constructor(options: {
        message: string;
        rootError?: Error | null;
        recommendedAction?: string | null;
        context?: Record<string, any>;
        location?: string;
        type?: string;
        name?: string;
    }) {
        super(options.message);
        this.type = options.type || "Error";
        this.name = options.name || "PrettyError";
        this.rootError = options.rootError || null;
        this.originalError = this.rootError; // For ErrorType compatibility
        this.recommendedAction = options.recommendedAction || null;
        this.context = options.context || {};
        this.location = options.location || "";
        Error.captureStackTrace(this, this.constructor);

        this.prettyMessage = this.createPrettyMessage();
    }

    /**
     * Creates a standardized error message incorporating all relevant information.
     * @returns Formatted error message with context and recommendations
     */
    private createPrettyMessage(): string {
        const parts: string[] = [
            `🚨 ${this.name}: ${this.message}`
        ];

        if (this.location) {
            parts.push(`📍 Location: ${this.location}`);
        }

        if (this.rootError?.message) {
            parts.push(`📋 Root Cause: ${this.rootError.message}`);
            if (this.rootError.stack) {
                parts.push('Stack Trace:');
                parts.push(this.rootError.stack);
            }
        }

        if (this.recommendedAction) {
            parts.push(`💡 Recommended Action: ${this.recommendedAction}`);
        }

        if (Object.keys(this.context).length > 0) {
            parts.push('📄 Context:');
            parts.push(JSON.stringify(this.context, null, 2));
        }

        return parts.join('\n');
    }
}

/**
 * Type guard to check if an error is a PrettyError
 */
export function isPrettyError(error: unknown): error is PrettyError {
    return error instanceof PrettyError;
}

/**
 * Type guard to check if an error is an LLMInvocationError
 */
export function isLLMInvocationError(error: unknown): error is LLMInvocationError {
    return error instanceof LLMInvocationError;
}