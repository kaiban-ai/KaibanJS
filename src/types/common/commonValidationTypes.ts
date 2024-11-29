/**
 * @file commonValidationTypes.ts
 * @path src/types/common/commonValidationTypes.ts
 * @description Common validation type definitions
 *
 * @module @types/common
 */

import type { IErrorType, IErrorMetadata } from './commonErrorTypes';

// ─── Base Validation Types ────────────────────────────────────────────────────

export type ValidationErrorType = string | IValidationError;
export type ValidationWarningType = string | IValidationWarning;

export interface IValidationError {
    code: string;
    message: string;
    path?: string[];
    value?: unknown;
}

export interface IValidationWarning {
    code: string;
    message: string;
    path?: string[];
    value?: unknown;
}

export interface IValidationMetadata extends IErrorMetadata {
    validatedFields: string[];
    validationDuration?: number;
    duration?: number; // Alias for validationDuration for backward compatibility
    configHash?: string;
    validatorName?: string; // For backward compatibility
    component: string;
}

export interface IValidationOptions {
    strict?: boolean;
    allowUnknown?: boolean;
    abortEarly?: boolean;
    context?: Record<string, unknown>;
}

// ─── Validation Results ────────────────────────────────────────────────────────

export interface IBaseValidationResult {
    isValid: boolean;
    errors: ValidationErrorType[];
    warnings: ValidationWarningType[];
    metadata: IValidationMetadata;
}

export interface IValidationResult<T = unknown> extends IBaseValidationResult {
    data?: T;
}

// ─── Status Validation ────────────────────────────────────────────────────────

export interface IStatusValidationResult extends IBaseValidationResult {
    currentStatus: string;
    targetStatus: string;
    allowedTransitions: string[];
}

// ─── Event Validation ─────────────────────────────────────────────────────────

export interface IEventValidationMetadata extends IValidationMetadata {
    eventType: string;
    entityId: string;
}

export interface IEventValidationResult extends IBaseValidationResult {
    metadata: IEventValidationMetadata;
    eventType: string;
    entityId: string;
}

// ─── Validation Schema ────────────────────────────────────────────────────────

export interface IValidationConstraint {
    type: string;
    required: boolean;
    min?: number;
    max?: number;
    pattern?: RegExp;
    enum?: unknown[];
    custom?: (value: unknown) => boolean;
}

export interface IValidationSchema<T = unknown> {
    required: string[];
    constraints: Record<string, IValidationConstraint>;
    customValidation?: (value: T) => boolean;
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

export const createValidationError = (params: {
    message: string;
    code: string;
    path?: string[];
    value?: unknown;
}): ValidationErrorType => ({
    code: params.code,
    message: params.message,
    path: params.path,
    value: params.value
});

export const createValidationWarning = (params: {
    message: string;
    code: string;
    path?: string[];
    value?: unknown;
}): ValidationWarningType => ({
    code: params.code,
    message: params.message,
    path: params.path,
    value: params.value
});

export const createValidationMetadata = (params: {
    component: string;
    operation?: string;
    validatedFields: string[];
    validationDuration?: number;
    configHash?: string;
    validatorName?: string;
    details?: Record<string, unknown>;
}): IValidationMetadata => ({
    timestamp: Date.now(),
    component: params.component,
    operation: params.operation,
    validatedFields: params.validatedFields || [],
    validationDuration: params.validationDuration,
    duration: params.validationDuration, // For backward compatibility
    configHash: params.configHash,
    validatorName: params.validatorName,
    details: params.details
});

export const createLegacyValidationMetadata = (params: {
    timestamp?: number;
    duration?: number;
    validatorName?: string;
    component?: string;
}): IValidationMetadata => ({
    timestamp: params.timestamp || Date.now(),
    component: params.component || 'legacy',
    validatedFields: [],
    validationDuration: params.duration,
    duration: params.duration,
    validatorName: params.validatorName
});

export const createEventValidationMetadata = (params: {
    component: string;
    operation?: string;
    validatedFields: string[];
    validationDuration?: number;
    configHash?: string;
    validatorName?: string;
    eventType: string;
    entityId: string;
    details?: Record<string, unknown>;
}): IEventValidationMetadata => ({
    ...createValidationMetadata(params),
    eventType: params.eventType,
    entityId: params.entityId
});

export const createValidationResult = <T>(params: {
    isValid: boolean;
    errors: ValidationErrorType[];
    warnings: ValidationWarningType[];
    metadata: IValidationMetadata;
    data?: T;
}): IValidationResult<T> => ({
    isValid: params.isValid,
    errors: params.errors.map(e => typeof e === 'string' ? createValidationError({ code: 'ERROR', message: e }) : e),
    warnings: params.warnings.map(w => typeof w === 'string' ? createValidationWarning({ code: 'WARNING', message: w }) : w),
    metadata: params.metadata,
    data: params.data
});

export const createStatusValidationResult = (params: {
    isValid: boolean;
    errors: ValidationErrorType[];
    warnings: ValidationWarningType[];
    metadata: IValidationMetadata;
    currentStatus: string;
    targetStatus: string;
    allowedTransitions: string[];
}): IStatusValidationResult => ({
    isValid: params.isValid,
    errors: params.errors.map(e => typeof e === 'string' ? createValidationError({ code: 'ERROR', message: e }) : e),
    warnings: params.warnings.map(w => typeof w === 'string' ? createValidationWarning({ code: 'WARNING', message: w }) : w),
    metadata: params.metadata,
    currentStatus: params.currentStatus,
    targetStatus: params.targetStatus,
    allowedTransitions: params.allowedTransitions
});

export const createEventValidationResult = (params: {
    isValid: boolean;
    errors: ValidationErrorType[];
    warnings: ValidationWarningType[];
    metadata: IEventValidationMetadata;
    eventType: string;
    entityId: string;
}): IEventValidationResult => ({
    isValid: params.isValid,
    errors: params.errors.map(e => typeof e === 'string' ? createValidationError({ code: 'ERROR', message: e }) : e),
    warnings: params.warnings.map(w => typeof w === 'string' ? createValidationWarning({ code: 'WARNING', message: w }) : w),
    metadata: params.metadata,
    eventType: params.eventType,
    entityId: params.entityId
});

// ─── Type Guards ────────────────────────────────────────────────────────────

export const isValidationError = (error: unknown): error is IValidationError => {
    if (typeof error === 'string') return true;
    if (typeof error !== 'object' || error === null) return false;
    const err = error as Partial<IValidationError>;
    return (
        typeof err.code === 'string' &&
        typeof err.message === 'string' &&
        (err.path === undefined || Array.isArray(err.path))
    );
};

export const isValidationWarning = (warning: unknown): warning is IValidationWarning => {
    if (typeof warning === 'string') return true;
    if (typeof warning !== 'object' || warning === null) return false;
    const warn = warning as Partial<IValidationWarning>;
    return (
        typeof warn.code === 'string' &&
        typeof warn.message === 'string' &&
        (warn.path === undefined || Array.isArray(warn.path))
    );
};

export const isValidationResult = <T>(result: unknown): result is IValidationResult<T> => {
    if (typeof result !== 'object' || result === null) return false;
    const res = result as Partial<IValidationResult<T>>;
    return (
        typeof res.isValid === 'boolean' &&
        Array.isArray(res.errors) &&
        Array.isArray(res.warnings) &&
        typeof res.metadata === 'object' &&
        res.metadata !== null &&
        typeof res.metadata.component === 'string' &&
        Array.isArray(res.metadata.validatedFields)
    );
};

export const isStatusValidationResult = (result: unknown): result is IStatusValidationResult => {
    if (!isValidationResult(result)) return false;
    const res = result as Partial<IStatusValidationResult>;
    return (
        typeof res.currentStatus === 'string' &&
        typeof res.targetStatus === 'string' &&
        Array.isArray(res.allowedTransitions)
    );
};

export const isEventValidationResult = (result: unknown): result is IEventValidationResult => {
    if (!isValidationResult(result)) return false;
    const res = result as Partial<IEventValidationResult>;
    return (
        typeof res.eventType === 'string' &&
        typeof res.entityId === 'string' &&
        typeof res.metadata === 'object' &&
        res.metadata !== null &&
        typeof (res.metadata as IEventValidationMetadata).eventType === 'string' &&
        typeof (res.metadata as IEventValidationMetadata).entityId === 'string'
    );
};

// ─── Type Conversion ─────────────────────────────────────────────────────────

export const toValidationError = (error: string | IValidationError): ValidationErrorType => {
    if (typeof error === 'string') {
        return {
            code: 'ERROR',
            message: error
        };
    }
    return error;
};

export const toValidationWarning = (warning: string | IValidationWarning): ValidationWarningType => {
    if (typeof warning === 'string') {
        return {
            code: 'WARNING',
            message: warning
        };
    }
    return warning;
};
