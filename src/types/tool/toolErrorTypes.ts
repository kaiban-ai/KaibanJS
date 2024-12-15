/**
 * @file toolErrorTypes.ts
 * @path KaibanJS/src/types/tool/toolErrorTypes.ts
 * @description Tool-specific error types and utilities
 * 
 * @module types/tool
 */

import { BaseError, ERROR_KINDS, IErrorMetadata } from '../common/commonErrorTypes';
import { VALIDATION_ERROR_enum, VALIDATION_WARNING_enum } from '../common/commonEnums';
import { IToolDependency } from './toolTypes';

type ToolPhase = 'pre' | 'execute' | 'post';

type ToolContextPrimitive = 
    | string 
    | number 
    | boolean 
    | null
    | undefined;

type ToolContextArray = 
    | VALIDATION_ERROR_enum[]
    | VALIDATION_WARNING_enum[]
    | string[]
    | IToolDependency[]
    | Error[];

interface IToolResourceUsage {
    memory?: number;
    cpu?: number;
    duration?: number;
}

interface IToolValidationContext {
    field?: string;
    value?: unknown;
    constraint?: string;
    toolSpecificErrors?: string[];
    toolSpecificWarnings?: string[];
    dependencies?: IToolDependency[];
    validationErrors?: Error[] | string[];
}

type ToolContextValue = 
    | ToolContextPrimitive
    | ToolContextArray
    | Error
    | { [key: string]: ToolContextValue }
    | IToolResourceUsage
    | IToolValidationContext;

interface IBaseToolErrorContext {
    toolName: string;
    executionId?: string;
    phase?: ToolPhase;
    elapsedTime?: number;
    timeout?: number;
    retryable?: boolean;
    retryCount?: number;
    originalError?: Error;
    errors?: VALIDATION_ERROR_enum[];
    warnings?: VALIDATION_WARNING_enum[];
    status?: 'active' | 'inactive' | 'error';
    lastAttempt?: number;
    attemptCount?: number;
    resourceUsage?: IToolResourceUsage;
    validationContext?: IToolValidationContext;
}

export interface IToolErrorContext extends IBaseToolErrorContext {
    [key: string]: ToolContextValue | undefined;
}

export interface IToolValidationErrorContext extends Partial<IBaseToolErrorContext> {
    toolSpecificErrors?: string[];
    toolSpecificWarnings?: string[];
    validationContext?: IToolValidationContext;
    [key: string]: ToolContextValue | undefined;
}

export class ToolError extends BaseError {
    public readonly toolName: string;
    public readonly executionId?: string;
    public readonly phase?: ToolPhase;
    public readonly elapsedTime?: number;
    public readonly timeout?: number;
    public readonly retryable: boolean;
    public readonly errors?: VALIDATION_ERROR_enum[];
    public readonly warnings?: VALIDATION_WARNING_enum[];

    constructor(params: {
        message: string;
        toolName: string;
        type: keyof typeof ERROR_KINDS;
        executionId?: string;
        phase?: ToolPhase;
        elapsedTime?: number;
        timeout?: number;
        retryable?: boolean;
        errors?: VALIDATION_ERROR_enum[];
        warnings?: VALIDATION_WARNING_enum[];
        metadata?: IErrorMetadata;
        context?: IToolErrorContext | IToolValidationErrorContext;
    }) {
        super({
            message: params.message,
            type: ERROR_KINDS[params.type],
            metadata: params.metadata,
            context: params.context as Record<string, unknown>
        });

        this.name = 'ToolError';
        this.toolName = params.toolName;
        this.executionId = params.executionId;
        this.phase = params.phase;
        this.elapsedTime = params.elapsedTime;
        this.timeout = params.timeout;
        this.retryable = params.retryable ?? false;
        this.errors = params.errors;
        this.warnings = params.warnings;
    }
}

export const ErrorTypeGuards = {
    isToolError: (error: unknown): error is ToolError => {
        if (!(error instanceof ToolError)) return false;
        return (
            typeof error.toolName === 'string' &&
            (error.executionId === undefined || typeof error.executionId === 'string') &&
            (error.phase === undefined || ['pre', 'execute', 'post'].includes(error.phase)) &&
            (error.elapsedTime === undefined || typeof error.elapsedTime === 'number') &&
            (error.timeout === undefined || typeof error.timeout === 'number') &&
            typeof error.retryable === 'boolean'
        );
    },

    isError: (value: unknown): value is Error => {
        return value instanceof Error;
    },

    toError: (value: unknown): Error => {
        if (value instanceof Error) return value;
        return new Error(String(value));
    },

    toErrorArray: (value: unknown): Error[] => {
        if (Array.isArray(value)) {
            return value.map(item => ErrorTypeGuards.toError(item));
        }
        return [ErrorTypeGuards.toError(value)];
    }
};
