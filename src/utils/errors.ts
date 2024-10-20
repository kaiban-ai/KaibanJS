/**
 * Custom Error Definitions.
 *
 * This file defines custom error classes for handling specific error scenarios within the KaibanJS library. It includes 
 * errors for API invocation failures and more nuanced errors that provide detailed diagnostic information. Custom errors 
 * enhance error handling by making it more informative and actionable.
 *
 * Usage:
 * Utilize these custom errors to throw and catch exceptions that require specific handling strategies, thereby improving 
 * the robustness and reliability of error management in the application.
 */

/**
 * Represents an error that occurs during LLM API invocation.
 */
export class LLMInvocationError extends Error {
    context: Record<string, any>;
    originalError: Error | null;
    recommendedAction: string | null;

    /**
     * Creates an instance of LLMInvocationError.
     * @param message - The error message.
     * @param originalError - The original error that caused this error, if any.
     * @param recommendedAction - Suggested action to resolve the error.
     * @param context - Additional context information about the error.
     */
    constructor(message: string, originalError: Error | null = null, recommendedAction: string | null = null, context: Record<string, any> = {}) {
        super(message);
        this.name = "LLMInvocationError";
        this.context = context;
        this.originalError = originalError;
        this.recommendedAction = recommendedAction;
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Represents a formatted error with additional context and recommendations.
 */
export class PrettyError extends Error {
    type: string;
    rootError: Error | null;
    recommendedAction: string | null;
    context: Record<string, any>;
    location: string;
    prettyMessage: string;

    /**
     * Creates an instance of PrettyError.
     * @param options - The options for creating the error.
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
        this.recommendedAction = options.recommendedAction || null;
        this.context = options.context || {};
        this.location = options.location || "";
        Error.captureStackTrace(this, this.constructor);

        this.prettyMessage = this.createPrettyMessage();
    }

    /**
     * Create a standardized error message incorporating all relevant information.
     * Conditionally includes parts of the message only if they contain valid data.
     * @returns A formatted and informative error message.
     */
    private createPrettyMessage(): string {
        let msg = `${this.name}: ${this.message}\n`;
        if (this.rootError && this.rootError.message) {
            msg += `Details: ${this.rootError.message}\n\n`;
        }
        if (this.recommendedAction) {
            msg += `Recommended Action: ${this.recommendedAction}\n`;
        }
        
        return msg;
    }
}