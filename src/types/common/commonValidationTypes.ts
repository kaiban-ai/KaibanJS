/**
 * @file commonValidationTypes.ts
 * @path src/types/common/commonValidationTypes.ts
 * @description Centralized validation types and interfaces with improved type safety
 *
 * @module @types/common
 */

import { IErrorType, IBaseError, IErrorMetadata, BaseError } from './commonErrorTypes';
import { IAgentType } from '../agent/agentBaseTypes';
import { ITaskType } from '../task/taskBaseTypes';

// ─── Core Validation Types ───────────────────────────────────────────────────────

/** Generic validation result with improved type safety */
export interface IValidationResult<T = unknown> {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    metadata: {
        timestamp: number;
        duration: number;
        validatorName: string;
    };
    context?: Record<string, unknown>;
    validatedEntity?: T;
    validatedFields?: string[];
}

/** Enhanced validation options */
export interface IValidationOptions {
    strict?: boolean;
    validateDependencies?: boolean;
    customValidators?: Array<(value: unknown) => boolean | Promise<boolean>>;
    timeoutMs?: number;
    stopOnFirstError?: boolean;
    validateAsync?: boolean;
}

/** Strongly typed validation constraint */
export interface IValidationConstraint<T = unknown> {
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    allowedValues?: T[];
    custom?: (value: T) => boolean | Promise<boolean>;
    message?: string;
}

/** Enhanced validation schema with generic support */
export interface IValidationSchema<T> {
    required: Array<keyof T>;
    constraints: {
        [P in keyof T]?: IValidationConstraint<T[P]>;
    };
    customValidation?: (value: T) => boolean | Promise<boolean>;
}

// ─── Domain-Specific Validation Types ─────────────────────────────────────────

/** Generic domain validation result */
export interface IDomainValidationResult<T> extends IValidationResult<T> {
    domainMetadata?: Record<string, unknown>;  // Additional domain-specific metadata
    transition?: {
        from: string;
        to: string;
    };
}

/** Agent validation result */
export type IAgentValidationResult = IDomainValidationResult<IAgentType>;

/** Task validation result */
export type ITaskValidationResult = IDomainValidationResult<ITaskType>;

/** Status validation result */
export type IStatusValidationResult = IDomainValidationResult<string>;

// ─── Validation Rules & Context ───────────────────────────────────────────────

/** Generic validation rule */
export interface IValidationRule<T = unknown> {
    id: string;
    validate: (value: T) => Promise<IValidationResult<T>> | IValidationResult<T>;
    errorMessage?: string;
    priority?: number;
    dependencies?: string[];
}

/** Validation context with improved tracking */
export interface IValidationContext {
    startTime: number;
    endTime?: number;
    validatedFields: Set<string>;
    failedFields: Set<string>;
    validationErrors: Map<string, string[]>;
    metadata?: Record<string, unknown>;
}

/** Enhanced validation error */
export interface IValidationError extends IBaseError {
    type: 'ValidationError';
    validationType: string;
    invalidValue?: unknown;
    expectedFormat?: string;
    fieldName?: string;
    constraint?: string;
}

// ─── Type Guards ────────────────────────────────────────────────────────────

/** Type guard check function type */
type TypeGuardCheck<T> = (value: unknown) => value is T;

/** Create a type guard with multiple checks */
const createTypeGuard = <T>(checks: Array<(value: unknown) => boolean>): TypeGuardCheck<T> => {
    return (value: unknown): value is T => {
        return checks.every(check => check(value));
    };
};

/** Common validation checks */
const validationChecks = {
    isObject: (value: unknown): boolean => 
        typeof value === 'object' && value !== null,
    hasProperty: (prop: string) => 
        (value: unknown): boolean => 
            typeof value === 'object' && 
            value !== null && 
            prop in value,
    isType: (prop: string, type: string) =>
        (value: unknown): boolean =>
            typeof value === 'object' &&
            value !== null &&
            typeof (value as any)[prop] === type,
    isArrayOf: (prop: string, elementCheck: (element: unknown) => boolean) =>
        (value: unknown): boolean =>
            Array.isArray((value as any)[prop]) &&
            (value as any)[prop].every(elementCheck)
};

/** Validation type guards interface */
export interface IValidationTypeGuards {
    isValidationResult: TypeGuardCheck<IValidationResult>;
    isValidationRule: TypeGuardCheck<IValidationRule>;
    isValidationContext: TypeGuardCheck<IValidationContext>;
    isValidationError: TypeGuardCheck<IValidationError>;
}

/** Validation type guards implementation */
export const ValidationTypeGuards: IValidationTypeGuards = {
    isValidationResult: createTypeGuard<IValidationResult>([
        validationChecks.isObject,
        validationChecks.isType('isValid', 'boolean'),
        value => Array.isArray((value as any).errors),
        value => Array.isArray((value as any).warnings),
        value => validationChecks.isObject((value as any).metadata),
        value => typeof (value as any).metadata.timestamp === 'number',
        value => typeof (value as any).metadata.duration === 'number',
        value => typeof (value as any).metadata.validatorName === 'string'
    ]),

    isValidationRule: createTypeGuard<IValidationRule>([
        validationChecks.isObject,
        validationChecks.isType('id', 'string'),
        validationChecks.hasProperty('validate')
    ]),

    isValidationContext: createTypeGuard<IValidationContext>([
        validationChecks.isObject,
        validationChecks.isType('startTime', 'number'),
        value => value instanceof Set || value instanceof Map
    ]),

    isValidationError: createTypeGuard<IValidationError>([
        validationChecks.isObject,
        validationChecks.isType('type', 'string'),
        validationChecks.isType('validationType', 'string')
    ])
};

// ─── Utility Types & Functions ───────────────────────────────────────────────

/** Validation function type */
export type ValidationFunction<T> = (value: T) => Promise<IValidationResult<T>> | IValidationResult<T>;

/** Default validation configuration */
export const DEFAULT_VALIDATION_CONFIG: IValidationOptions = {
    timeoutMs: 5000,
    stopOnFirstError: false,
    validateAsync: true,
    strict: false
};

/** Validation rule factory */
export const createValidationRule = <T>(
    id: string,
    validate: (value: T) => Promise<IValidationResult<T>> | IValidationResult<T>,
    options?: Partial<Omit<IValidationRule<T>, 'id' | 'validate'>>
): IValidationRule<T> => ({
    id,
    validate,
    ...options
});

/**
 * Create a default validation result
 * @param isValid Initial validation state
 * @param validatorName Name of the validator
 * @returns A properly initialized validation result
 */
export const createValidationResult = <T>(
    isValid: boolean = true,
    validatorName: string = 'default'
): IValidationResult<T> => ({
    isValid,
    errors: [],
    warnings: [],
    metadata: {
        timestamp: Date.now(),
        duration: 0,
        validatorName
    },
    validatedFields: []
});

/** Create validation error result */
export const createValidationError = (
    message: string,
    validationType: string,
    details?: Partial<Omit<IValidationError, 'name' | 'message' | 'type' | 'validationType'>>
): IValidationError => {
    const error = new BaseError({
        message,
        type: 'ValidationError',
        options: {
            metadata: {
                timestamp: Date.now(),
                source: 'validation',
                severity: 'medium'
            }
        }
    });

    return {
        ...error,
        validationType,
        ...details
    } as IValidationError;
};
