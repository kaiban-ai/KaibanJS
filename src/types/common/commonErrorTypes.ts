/**
 * @file commonErrorTypes.ts
 * @description Common error type definitions and utilities
 *
 * @module @types/common
 */

// Basic error types
export type IErrorType = {
    message: string;
    type: IErrorKind;
    context?: Record<string, unknown>;
};

export type IErrorKind =
    | 'ValidationError'
    | 'SystemError'
    | 'TaskError'
    | 'AgentError'
    | 'NetworkError'
    | 'StoreError'
    | 'StateError'
    | 'ResourceError'
    | 'ConfigError'
    | 'AuthError'
    | 'WorkflowError'
    | 'ToolError'
    | 'ConfigurationError'
    | 'LLMError';

export interface IErrorMetadata {
    timestamp: number;
    source: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    [key: string]: unknown;
}

export interface IErrorContext {
    taskId?: string;
    agentId?: string;
    operation?: string;
    state?: Record<string, unknown>;
    recommendedAction?: string;
    originalError?: Error;
    [key: string]: unknown;
}

export interface IErrorOptions {
    metadata?: IErrorMetadata;
    context?: IErrorContext;
    cause?: Error;
}

export interface IBaseErrorHandlerParams {
    error: Error | string;
    context?: IErrorContext;
    task?: unknown;
    agent?: unknown;
    recommendedAction?: string;
}

export interface IErrorHandlerParams extends IBaseErrorHandlerParams {
    // Keeping for backward compatibility
}

export interface ITeamErrorHandlerParams extends IBaseErrorHandlerParams {
    store: unknown;
}

export interface IBaseError extends Error {
    type: IErrorKind;
    metadata?: IErrorMetadata;
    context?: IErrorContext;
    cause?: Error;
    toString(): string;
}

export interface IErrorParams {
    message: string;
    type: IErrorKind;
    context?: IErrorContext;
    cause?: Error;
    options?: IErrorOptions;
    recommendedAction?: string;
}

// Specific error types
export interface IValidationError extends IBaseError {
    type: 'ValidationError';
    validationErrors: string[];
    timestamp?: number;
}

export interface IWorkflowError extends IBaseError {
    type: 'WorkflowError';
    workflowId: string;
    step?: string;
}

export interface IToolError extends IBaseError {
    type: 'ToolError';
    toolId: string;
    operation: string;
    retryable?: boolean;
}

export interface ILLMError extends IBaseError {
    type: 'LLMError';
    provider: string;
    requestId?: string;
}

// Error creation and conversion utilities
export class BaseError extends Error implements IBaseError {
    public readonly type: IErrorKind;
    public metadata?: IErrorMetadata;
    public context?: IErrorContext;
    public cause?: Error;

    constructor(params: IErrorParams) {
        super(params.message);
        this.type = params.type;
        this.metadata = params.options?.metadata;
        this.context = {
            ...params.context,
            ...params.options?.context,
            recommendedAction: params.recommendedAction
        };
        this.cause = params.cause || params.options?.cause;
        this.name = this.constructor.name;
    }

    toString(): string {
        let result = `${this.name}: ${this.message}`;
        if (this.context?.recommendedAction) {
            result += `\nRecommended Action: ${this.context.recommendedAction}`;
        }
        if (this.cause) {
            result += `\nCaused by: ${this.cause.message}`;
        }
        return result;
    }
}

export class ToolError extends BaseError implements IToolError {
    public readonly type: 'ToolError' = 'ToolError';
    public toolId: string;
    public operation: string;
    public retryable: boolean;

    constructor(params: { message: string; toolId: string; operation: string; options?: IErrorOptions }) {
        super({ message: params.message, type: 'ToolError', options: params.options });
        this.toolId = params.toolId;
        this.operation = params.operation;
        this.retryable = params.options?.context?.retryable as boolean ?? false;
    }

    toString(): string {
        return `${super.toString()}\nTool: ${this.toolId}\nOperation: ${this.operation}`;
    }
}

export const ErrorTypeGuards = {
    isBaseError: (error: unknown): error is IBaseError => {
        return error instanceof Error && 'type' in error;
    },
    isToolError: (error: unknown): error is IToolError => {
        return ErrorTypeGuards.isBaseError(error) && error.type === 'ToolError';
    }
};

export function createError(params: IErrorParams): IBaseError {
    return new BaseError(params);
}

export function toBaseError(error: unknown): IBaseError {
    if (ErrorTypeGuards.isBaseError(error)) {
        return error;
    }
    return createError({
        message: error instanceof Error ? error.message : String(error),
        type: 'SystemError'
    });
}

export function toErrorType(error: unknown): IErrorType {
    if (ErrorTypeGuards.isBaseError(error)) {
        return {
            message: error.message,
            type: error.type,
            context: error.context
        };
    }
    return {
        message: error instanceof Error ? error.message : String(error),
        type: 'SystemError'
    };
}
