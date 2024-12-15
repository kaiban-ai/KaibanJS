/**
 * @file validationTypes.ts
 * @path src/types/common/validationTypes.ts
 * @description Consolidated validation type definitions including validation metadata and metrics
 */

import { VALIDATION_ERROR_enum, VALIDATION_WARNING_enum } from './enumTypes';
import type { IStatusEntity, IStatusType } from './statusTypes';
import type { IBaseHandlerMetadata } from './baseTypes';

// ================ Base Validation Types ================

export type ValidationErrorType = VALIDATION_ERROR_enum | string;
export type ValidationWarningType = VALIDATION_WARNING_enum | string;

export interface IBaseValidation {
    readonly isValid: boolean;
    readonly errors: ReadonlyArray<ValidationErrorType>;
    readonly warnings: ReadonlyArray<ValidationWarningType>;
}

export interface IValidationResult extends IBaseValidation {
    readonly metadata?: Record<string, unknown>;
}

// ================ Validation Process Types ================

export interface IValidationStep {
    name: string;
    duration: number;
    success: boolean;
}

export interface IValidationMetrics {
    /** Start time of validation */
    readonly startTime: number;
    /** End time of validation */
    readonly endTime: number;
    /** Duration of validation in milliseconds */
    readonly duration: number;
    /** List of validated fields */
    readonly validatedFields: string[];
    /** List of validation errors */
    readonly errors: VALIDATION_ERROR_enum[];
    /** List of validation warnings */
    readonly warnings: VALIDATION_WARNING_enum[];
    /** Validation metadata */
    readonly metadata: IBaseHandlerMetadata;
    /** Validation steps */
    readonly validationSteps: IValidationStep[];
    /** Total error count */
    readonly errorCount: number;
    /** Total warning count */
    readonly warningCount: number;
}

export interface IValidationSchema<T = unknown> {
    type: string;
    required?: boolean;
    validator?: (value: T) => boolean;
    children?: Record<string, IValidationSchema<T>>;
}

// ================ Status Validation Types ================

export interface IStatusValidationResult extends IValidationResult {
    context?: {
        entity: IStatusEntity;
        transition: string;
        metadata?: any;
        performance?: any;
        resources?: any;
    };
    domainMetadata?: {
        phase: string;
        operation: string;
        startTime: number;
        duration: number;
    };
    transition?: {
        from: IStatusType;
        to: IStatusType;
    };
}

// ================ Validation Context Types ================

export interface IValidationContext {
    readonly validatedFields: string[];
    readonly validationSteps: IValidationStep[];
    readonly startTime: number;
    readonly duration: number;
    readonly component: string;
    readonly operation: string;
    readonly metadata?: Record<string, unknown>;
}

// ================ Validation Handler Types ================

export interface IValidationHandlerMetadata {
    readonly timestamp: number;
    readonly component: string;
    readonly operation: string;
    readonly validatedFields: string[];
    readonly validationSteps: IValidationStep[];
    readonly duration: number;
    readonly context: IValidationContext;
    readonly result: IValidationResult;
}

// ================ Type Guards ================

export const isValidationMetrics = (value: unknown): value is IValidationMetrics => {
    if (typeof value !== 'object' || value === null) return false;
    const metrics = value as Partial<IValidationMetrics>;

    return (
        typeof metrics.startTime === 'number' &&
        typeof metrics.endTime === 'number' &&
        typeof metrics.duration === 'number' &&
        Array.isArray(metrics.validatedFields) &&
        metrics.validatedFields.every(field => typeof field === 'string') &&
        Array.isArray(metrics.errors) &&
        metrics.errors.every(error => typeof error === 'string') &&
        Array.isArray(metrics.warnings) &&
        metrics.warnings.every(warning => typeof warning === 'string') &&
        typeof metrics.metadata === 'object' &&
        metrics.metadata !== null &&
        Array.isArray(metrics.validationSteps) &&
        typeof metrics.errorCount === 'number' &&
        typeof metrics.warningCount === 'number'
    );
};

// ================ Utility Functions ================

export const createValidationResult = (params: {
    isValid: boolean;
    errors?: ValidationErrorType[];
    warnings?: ValidationWarningType[];
    metadata?: Record<string, unknown>;
}): IValidationResult => ({
    isValid: params.isValid,
    errors: Object.freeze(params.errors || []) as ReadonlyArray<ValidationErrorType>,
    warnings: Object.freeze(params.warnings || []) as ReadonlyArray<ValidationWarningType>,
    metadata: params.metadata
});

export const createStatusValidationResult = (params: {
    isValid: boolean;
    errors?: ValidationErrorType[];
    warnings?: ValidationWarningType[];
    metadata?: Record<string, unknown>;
    context?: IStatusValidationResult['context'];
    domainMetadata?: IStatusValidationResult['domainMetadata'];
    transition?: IStatusValidationResult['transition'];
}): IStatusValidationResult => ({
    ...createValidationResult(params),
    context: params.context,
    domainMetadata: params.domainMetadata,
    transition: params.transition
});

export const createValidationMetadata = (params: {
    component: string;
    validatedFields: string[];
    operation?: string;
    details?: Record<string, unknown>;
}): Record<string, unknown> => ({
    component: params.component,
    validatedFields: params.validatedFields,
    operation: params.operation,
    timestamp: Date.now(),
    ...params.details
});

export const formatValidationMessage = (
    type: ValidationErrorType | ValidationWarningType,
    message: string,
    details?: Record<string, unknown>
): string => {
    return `${type}: ${message}${details ? ` (${JSON.stringify(details)})` : ''}`;
};

export const toValidationError = (error: Error | string | unknown): ValidationErrorType => {
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === 'string') {
        return error;
    }
    if (typeof error === 'object' && error !== null && 'message' in error) {
        return (error as { message: string }).message;
    }
    return 'Unknown validation error';
};

export const toValidationWarning = (warning: string | unknown): ValidationWarningType => {
    if (typeof warning === 'string') {
        return warning;
    }
    if (typeof warning === 'object' && warning !== null && 'message' in warning) {
        return (warning as { message: string }).message;
    }
    return 'Unknown validation warning';
};
