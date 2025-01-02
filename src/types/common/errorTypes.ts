/**
 * @file errorTypes.ts
 * @description Error type definitions
 */

import type { IValidationResult } from './validationTypes';
import type { IErrorMetrics } from '../metrics/base/errorMetrics';

export enum ERROR_KINDS {
    ValidationError = 'ValidationError',
    StateError = 'StateError',
    SystemError = 'SystemError',
    NetworkError = 'NetworkError',
    ResourceError = 'ResourceError',
    ConfigurationError = 'ConfigurationError',
    ExecutionError = 'ExecutionError',
    InitializationError = 'InitializationError',
    UnknownError = 'UnknownError',
    AgentError = 'AgentError',
    TaskError = 'TaskError',
    TimeoutError = 'TimeoutError',
    NotFoundError = 'NotFoundError'
}

export type IErrorKind = keyof typeof ERROR_KINDS;

export enum ERROR_SEVERITY_enum {
    DEBUG = 'DEBUG',
    INFO = 'INFO',
    WARNING = 'WARNING',
    ERROR = 'ERROR',
    CRITICAL = 'CRITICAL'
}

export type IErrorSeverity = keyof typeof ERROR_SEVERITY_enum;

export interface IErrorContext {
    readonly component?: string;
    readonly operation?: string;
    readonly severity?: IErrorSeverity;
    readonly validation?: IValidationResult;
    readonly metrics?: IErrorMetrics;
    readonly error?: Error;
    readonly recoverable?: boolean;
    readonly retryCount?: number;
    readonly failureReason?: string;
    readonly recommendedAction?: string;
    readonly details?: Record<string, unknown>;
    readonly timestamp?: number;
    readonly [key: string]: unknown;
}

export interface IBaseError {
    readonly message: string;
    readonly name: string;
    readonly type: IErrorKind;
    readonly severity?: IErrorSeverity;
    readonly cause?: Error;
    readonly context?: IErrorContext;
    readonly metadata?: Record<string, unknown>;
}

export type IErrorType = {
    readonly message: string;
    readonly type: IErrorKind;
    readonly severity?: IErrorSeverity;
    readonly context?: Record<string, unknown>;
};

export class BaseError extends Error implements IBaseError {
    public readonly type: IErrorKind;
    public readonly severity?: IErrorSeverity;
    public readonly context?: IErrorContext;
    public readonly cause?: Error;
    public readonly metadata?: Record<string, unknown>;

    constructor(error: IBaseError) {
        super(error.message);
        this.name = 'BaseError';
        this.type = error.type;
        this.severity = error.severity;
        this.context = error.context;
        this.cause = error.cause;
        this.metadata = error.metadata;
    }
}

export const createError = (error: Omit<IBaseError, 'name'>): BaseError => {
    return new BaseError({
        ...error,
        name: 'BaseError'
    });
};

export interface IErrorMetadata {
    readonly component: string;
    readonly operation: string;
    readonly details?: Record<string, unknown>;
    readonly timestamp?: number;
}

export const createErrorMetadata = (metadata: IErrorMetadata): Record<string, unknown> => ({
    ...metadata,
    timestamp: metadata.timestamp || Date.now()
});
