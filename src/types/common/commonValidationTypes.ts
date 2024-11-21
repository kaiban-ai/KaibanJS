/**
 * @file commonValidation.ts
 * @path src/utils/types/common/validation.ts
 * @description Centralized validation types and interfaces for the entire application
 *
 * @module @types/common
 */

import { IErrorType } from './commonErrorTypes';
import { IAgentType } from '../agent/agentBaseTypes';
import { ITaskType } from '../task/taskBaseTypes';

// ─── Base Validation Types ───────────────────────────────────────────────────────

/**
 * Base validation result interface
 */
export interface IValidationResult {
    isValid: boolean;
    errors: string[];
    context?: Record<string, unknown>;
}

/**
 * Common validation options
 */
export interface IValidationOptions {
    strict?: boolean;
    validateDependencies?: boolean;
    customValidators?: ((value: unknown) => boolean)[];
    timeoutMs?: number;
}

// ─── Domain-Specific Validation Types ─────────────────────────────────────────

/**
 * Agent validation result
 */
export interface IAgentValidationResult extends IValidationResult {
    agent?: IAgentType;
    validatedFields?: string[];
}

/**
 * Task validation result
 */
export interface ITaskValidationResult extends IValidationResult {
    task?: ITaskType;
    validatedFields?: string[];
}

/**
 * Status validation result
 */
export interface IStatusValidationResult extends IValidationResult {
    transition?: {
        from: string;
        to: string;
    };
    metadata?: Record<string, unknown>;
}

// ─── Validation Rules & Schemas ───────────────────────────────────────────────

/**
 * Base validation rule interface
 */
export interface IValidationRule<T = unknown> {
    id: string;
    validate: (value: T) => Promise<IValidationResult> | IValidationResult;
    errorMessage?: string;
    priority?: number;
}

/**
 * Validation schema configuration
 */
export interface IValidationSchema {
    required: string[];
    constraints?: {
        [field: string]: {
            minLength?: number;
            maxLength?: number;
            pattern?: RegExp;
            allowedValues?: unknown[];
            custom?: (value: unknown) => boolean;
        };
    };
    customValidation?: (value: unknown) => boolean;
}

// ─── Validation Context & Error Types ──────────────────────────────────────────

/**
 * Validation context for tracking validation state
 */
export interface IValidationContext {
    startTime: number;
    endTime?: number;
    validatedFields: Set<string>;
    failedFields: Set<string>;
    validationErrors: Map<string, string[]>;
}

/**
 * Validation error type
 */
export interface IValidationError extends IErrorType {
    type: 'ValidationError';
    validationType: string;
    invalidValue?: unknown;
    expectedFormat?: string;
}

// ─── Type Guards ────────────────────────────────────────────────────────────

export const ValidationTypeGuards = {
    isValidationResult: (value: unknown): value is IValidationResult => {
        if (typeof value !== 'object' || value === null) return false;
        const result = value as Partial<IValidationResult>;
        return (
            typeof result.isValid === 'boolean' &&
            Array.isArray(result.errors)
        );
    },

    isValidationRule: <T>(value: unknown): value is IValidationRule<T> => {
        if (typeof value !== 'object' || value === null) return false;
        const rule = value as Partial<IValidationRule<T>>;
        return (
            typeof rule.id === 'string' &&
            typeof rule.validate === 'function'
        );
    },
};

// ─── Utility Types ───────────────────────────────────────────────────────────

/**
 * Helper type for validation functions
 */
export type IValidationFunction<T> = (value: T) => Promise<IValidationResult> | IValidationResult;

/**
 * Validation handler configuration
 */
export interface IValidationHandlerConfig {
    timeout?: number;
    stopOnFirstError?: boolean;
    validateAsync?: boolean;
    customValidators?: IValidationFunction<unknown>[];
}

/**
 * Default validation handler configuration
 */
export const DEFAULT_VALIDATION_CONFIG: IValidationHandlerConfig = {
    timeout: 5000,
    stopOnFirstError: false,
    validateAsync: true
};
