/**
 * @file validation.ts
 * @path src/utils/types/common/validation.ts
 * @description Centralized validation types and interfaces for the entire application
 *
 * @module @types/common
 */

import { ErrorType } from './errors';
import { AgentType } from '../agent/base';
import { TaskType } from '../task/base';

// ─── Base Validation Types ───────────────────────────────────────────────────────

/**
 * Base validation result interface
 */
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    context?: Record<string, unknown>;
}

/**
 * Common validation options
 */
export interface ValidationOptions {
    strict?: boolean;
    validateDependencies?: boolean;
    customValidators?: ((value: unknown) => boolean)[];
    timeoutMs?: number;
}

// ─── Domain-Specific Validation Types ─────────────────────────────────────────

/**
 * Agent validation result
 */
export interface AgentValidationResult extends ValidationResult {
    agent?: AgentType;
    validatedFields?: string[];
}

/**
 * Task validation result
 */
export interface TaskValidationResult extends ValidationResult {
    task?: TaskType;
    validatedFields?: string[];
}

/**
 * Status validation result
 */
export interface StatusValidationResult extends ValidationResult {
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
export interface ValidationRule<T = unknown> {
    id: string;
    validate: (value: T) => Promise<ValidationResult> | ValidationResult;
    errorMessage?: string;
    priority?: number;
}

/**
 * Validation schema configuration
 */
export interface ValidationSchema {
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
export interface ValidationContext {
    startTime: number;
    endTime?: number;
    validatedFields: Set<string>;
    failedFields: Set<string>;
    validationErrors: Map<string, string[]>;
}

/**
 * Validation error type
 */
export interface ValidationError extends ErrorType {
    type: 'ValidationError';
    validationType: string;
    invalidValue?: unknown;
    expectedFormat?: string;
}

// ─── Type Guards ────────────────────────────────────────────────────────────

export const ValidationTypeGuards = {
    isValidationResult: (value: unknown): value is ValidationResult => {
        if (typeof value !== 'object' || value === null) return false;
        const result = value as Partial<ValidationResult>;
        return (
            typeof result.isValid === 'boolean' &&
            Array.isArray(result.errors)
        );
    },

    isValidationRule: <T>(value: unknown): value is ValidationRule<T> => {
        if (typeof value !== 'object' || value === null) return false;
        const rule = value as Partial<ValidationRule<T>>;
        return (
            typeof rule.id === 'string' &&
            typeof rule.validate === 'function'
        );
    },

    isValidationError: (error: unknown): error is ValidationError => {
        if (typeof error !== 'object' || error === null) return false;
        const validationError = error as Partial<ValidationError>;
        return (
            validationError.type === 'ValidationError' &&
            typeof validationError.validationType === 'string'
        );
    }
};

// ─── Utility Types ───────────────────────────────────────────────────────────

/**
 * Helper type for validation functions
 */
export type ValidationFunction<T> = (value: T) => Promise<ValidationResult> | ValidationResult;

/**
 * Validation handler configuration
 */
export interface ValidationHandlerConfig {
    timeout?: number;
    stopOnFirstError?: boolean;
    validateAsync?: boolean;
    customValidators?: ValidationFunction<unknown>[];
}

/**
 * Default validation handler configuration
 */
export const DEFAULT_VALIDATION_CONFIG: ValidationHandlerConfig = {
    timeout: 5000,
    stopOnFirstError: false,
    validateAsync: true
};