/**
 * @file commonErrorTypes.ts
 * @path src/types/common/commonErrorTypes.ts
 * @description Common error type definitions
 *
 * @module @types/common
 */

export const ERROR_KINDS = {
    ValidationError: 'ValidationError',
    ExecutionError: 'ExecutionError',
    InitializationError: 'InitializationError',
    StateError: 'StateError',
    CognitiveError: 'CognitiveError',
    NetworkError: 'NetworkError',
    ResourceError: 'ResourceError',
    ConfigurationError: 'ConfigurationError',
    AuthenticationError: 'AuthenticationError',
    PermissionError: 'PermissionError',
    NotFoundError: 'NotFoundError',
    TimeoutError: 'TimeoutError',
    RateLimitError: 'RateLimitError',
    SystemError: 'SystemError',
    TaskError: 'TaskError',
    AgentError: 'AgentError',
    UnknownError: 'UnknownError'
} as const;

export type IErrorKind = typeof ERROR_KINDS[keyof typeof ERROR_KINDS];

export interface IErrorMetadata {
    timestamp: number;
    component: string;
    operation?: string;
    details?: Record<string, unknown>;
}

export interface IBaseError {
    name: string;
    message: string;
    type: IErrorKind;
    metadata?: IErrorMetadata;
    context?: Record<string, unknown>;
    cause?: Error;
}

export interface IErrorType extends IBaseError {
    metadata?: IErrorMetadata;
    context?: Record<string, unknown>;
}

export interface IErrorContext {
    component: string;
    operation?: string;
    details?: Record<string, unknown>;
    timestamp?: number;
}

export interface IBaseErrorHandlerParams {
    error: Error | IErrorType;
    context?: IErrorContext;
    type?: IErrorKind;
}

export class BaseError extends Error implements IBaseError {
    public readonly type: IErrorKind;
    public readonly metadata?: IErrorMetadata;
    public readonly context?: Record<string, unknown>;
    public readonly cause?: Error;

    constructor(params: {
        message: string;
        type: IErrorKind;
        metadata?: IErrorMetadata;
        context?: Record<string, unknown>;
        cause?: Error;
    }) {
        super(params.message);
        this.name = 'BaseError';
        this.type = params.type;
        this.metadata = params.metadata;
        this.context = params.context;
        this.cause = params.cause;
    }
}

export const createError = (params: {
    message: string;
    type: IErrorKind;
    metadata?: IErrorMetadata;
    context?: Record<string, unknown>;
    cause?: Error;
}): IErrorType => ({
    name: params.type,
    message: params.message,
    type: params.type,
    metadata: params.metadata,
    context: params.context,
    cause: params.cause
});

export const isErrorType = (error: unknown): error is IErrorType => {
    if (typeof error !== 'object' || error === null) return false;
    const err = error as Partial<IErrorType>;
    return (
        typeof err.message === 'string' &&
        typeof err.type === 'string' &&
        Object.values(ERROR_KINDS).includes(err.type as IErrorKind)
    );
};

export const isBaseError = (error: unknown): error is IBaseError => {
    if (typeof error !== 'object' || error === null) return false;
    const err = error as Partial<IBaseError>;
    return (
        typeof err.name === 'string' &&
        typeof err.message === 'string' &&
        typeof err.type === 'string' &&
        Object.values(ERROR_KINDS).includes(err.type as IErrorKind)
    );
};

export const toErrorType = (error: Error | unknown, type: IErrorKind = ERROR_KINDS.UnknownError): IErrorType => {
    if (isErrorType(error)) return error;
    if (error instanceof Error) {
        return {
            name: error.name,
            message: error.message,
            type,
            cause: error
        };
    }
    return {
        name: type,
        message: String(error),
        type
    };
};

export const createErrorMetadata = (params: {
    component: string;
    operation?: string;
    details?: Record<string, unknown>;
}): IErrorMetadata => ({
    timestamp: Date.now(),
    component: params.component,
    operation: params.operation,
    details: params.details
});

export const createErrorContext = (params: {
    component: string;
    operation?: string;
    details?: Record<string, unknown>;
}): Record<string, unknown> => ({
    component: params.component,
    operation: params.operation,
    ...(params.details || {})
});
