/**
 * @file commonErrorTypes.ts
 * @path KaibanJS/src/types/common/commonErrorTypes.ts
 * @description Core error types and interfaces for centralized error handling
 *
 * @module types/common
 */

import { logger } from '../../utils/core';
import { MetadataFactory } from '../../utils/factories/metadataFactory';
import type { ITeamStoreMethods } from '../team/teamStoreTypes';
import type { IBaseHandlerParams } from './commonHandlerTypes';
import type { IErrorMetadata } from './commonMetadataTypes';
import type { IReactChampionAgent } from '../agent/agentBaseTypes';
import type { ITaskType } from '../task/taskBaseTypes';

// Re-export IErrorMetadata for convenience
export type { IErrorMetadata };

// ─── Error Handler Types ──────────────────────────────────────────────────────

export interface IErrorHandlerParams extends IBaseHandlerParams {
    error: unknown;
    context: Record<string, unknown>;
    task?: ITaskType;
    agent?: IReactChampionAgent;
    store?: ITeamStoreMethods;
    metadata: IErrorMetadata;
}

/** Team-specific error handler params requiring store and all context */
export interface ITeamErrorHandlerParams extends Omit<IErrorHandlerParams, 'store' | 'task' | 'agent'> {
    store: ITeamStoreMethods;
    task: ITaskType;
    agent: IReactChampionAgent;
}

// ─── Error Types ────────────────────────────────────────────────────────────────

export type IErrorKind = 
    | 'SystemError'
    | 'ValidationError'
    | 'ConfigurationError'
    | 'LLMError'
    | 'AgentError'
    | 'TaskError'
    | 'WorkflowError'
    | 'StoreError';

export interface IBaseError {
    name: string;
    message: string;
    type: IErrorKind;
    stepId?: string;  // Added for workflow step tracking
    context?: Record<string, unknown>;
}

// Export IErrorType as an alias for IBaseError since it's the canonical error type
export type IErrorType = IBaseError;

export interface IErrorOptions {
    message: string;
    type: IErrorKind;
    stepId?: string;  // Added for workflow step tracking
    context?: Record<string, unknown>;
    recommendedAction?: string;
    location?: string;
}

// ─── Domain-Specific Error Types ───────────────────────────────────────────────

export interface ILLMError extends IBaseError {
    type: 'LLMError';
    provider: string;
    retryable: boolean;
    model?: string;
    requestId?: string;
}

export interface IValidationError extends IBaseError {
    type: 'ValidationError';
    validationType: string;
    invalidValue?: unknown;
    expectedFormat?: string;
}

export interface IWorkflowError extends IBaseError {
    type: 'WorkflowError';
    workflowId: string;
    phase: string;
    recoverable: boolean;
}

// ─── Error Implementation ──────────────────────────────────────────────────────

export class KaibanError extends Error implements IBaseError {
    readonly type: IErrorKind;
    readonly stepId?: string;
    readonly context?: Record<string, unknown>;
    readonly recommendedAction?: string;

    constructor(options: IErrorOptions) {
        super(options.message);
        this.name = 'KaibanError';
        this.type = options.type;
        this.stepId = options.stepId;
        this.context = options.context;
        this.recommendedAction = options.recommendedAction;

        // Preserve stack trace
        Error.captureStackTrace(this, KaibanError);

        // Log error with metadata
        this.logError();
    }

    private logError(): void {
        const metadata = MetadataFactory.createErrorMetadata(this);
        logger.error(`[${this.type}] ${this.message}`, {
            name: this.name,
            type: this.type,
            stepId: this.stepId,
            context: this.context,
            recommendedAction: this.recommendedAction,
            metadata
        });
    }

    public toJSON(): Record<string, unknown> {
        return {
            name: this.name,
            type: this.type,
            message: this.message,
            stepId: this.stepId,
            context: this.context,
            recommendedAction: this.recommendedAction,
            stack: this.stack
        };
    }
}

// ─── Type Guards ────────────────────────────────────────────────────────────────

export const IErrorTypeGuards = {
    isKaibanError: (error: unknown): error is KaibanError => {
        return error instanceof KaibanError;
    },

    isLLMError: (error: unknown): error is ILLMError => {
        return (
            IErrorTypeGuards.isBaseError(error) &&
            error.type === 'LLMError' &&
            'provider' in error &&
            'retryable' in error
        );
    },

    isValidationError: (error: unknown): error is IValidationError => {
        return (
            IErrorTypeGuards.isBaseError(error) &&
            error.type === 'ValidationError' &&
            'validationType' in error
        );
    },

    isWorkflowError: (error: unknown): error is IWorkflowError => {
        return (
            IErrorTypeGuards.isBaseError(error) &&
            error.type === 'WorkflowError' &&
            'workflowId' in error &&
            'phase' in error
        );
    },

    isBaseError: (error: unknown): error is IBaseError => {
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
            context: {
                originalErrorName: error.name,
                originalErrorMessage: error.message
            },
            recommendedAction: 'Review system error and retry'
        });
    }

    return new KaibanError({
        message: String(error),
        type: 'SystemError',
        context: typeof error === 'object' ? error as Record<string, unknown> : undefined,
        recommendedAction: 'Review unknown error and retry'
    });
}

/**
 * Convert any error type to a BaseError (ErrorType)
 */
export function toErrorType(error: unknown): IErrorType {
    const kaibanError = toKaibanError(error);
    return {
        name: kaibanError.name,
        message: kaibanError.message,
        type: kaibanError.type,
        stepId: kaibanError.stepId,
        context: kaibanError.context
    };
}

export function createError(options: IErrorOptions): KaibanError {
    return new KaibanError(options);
}
