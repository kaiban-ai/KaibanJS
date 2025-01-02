/**
 * @file validationTypes.ts
 * @description Core validation types and interfaces
 */

import type { MetricDomain, MetricType } from '../metrics/base/metricsManagerTypes';
import { 
    VALIDATION_ERROR_enum,
    VALIDATION_WARNING_enum 
} from './enumTypes';

// ─── Validation Enums ─────────────────────────────────────────────────────────────

export enum VALIDATION_SEVERITY_enum {
    INFO = 'INFO',
    WARNING = 'WARNING',
    ERROR = 'ERROR',
    CRITICAL = 'CRITICAL'
}

export enum VALIDATION_SCOPE_enum {
    EXECUTION = 'EXECUTION',
    VALIDATION = 'VALIDATION',
    STATE = 'STATE',
    RESOURCE = 'RESOURCE',
    CONFIG = 'CONFIG',
    FIELD = 'FIELD',
    ENTITY = 'ENTITY',
    RELATIONSHIP = 'RELATIONSHIP',
    SYSTEM = 'SYSTEM'
}

// ─── Core Validation Types ──────────────────────────────────────────────────────

export interface IValidationError {
    code: VALIDATION_ERROR_enum;
    message: string;
    severity: VALIDATION_SEVERITY_enum;
    scope: VALIDATION_SCOPE_enum;
    field?: string;
    details?: Record<string, unknown>;
}

export interface IValidationWarning {
    code: VALIDATION_WARNING_enum;
    message: string;
    severity: VALIDATION_SEVERITY_enum;
    scope: VALIDATION_SCOPE_enum;
    field?: string;
    details?: Record<string, unknown>;
}

export interface IValidationContext {
    operation: string;
    component: string;
    domain?: MetricDomain;
    type?: MetricType;
    metadata?: Record<string, unknown>;
}

export interface IValidationMetadata {
    timestamp: number;
    component: string;
    operation: string;
    validatedFields?: string[];
    duration?: number;
    status?: string;
    validatorName?: string;
    agent?: {
        id: string;
        name: string;
        role: string;
        status: string;
    };
    context?: Record<string, unknown>;
}

export interface IValidationMetrics {
    totalValidations: number;
    successfulValidations: number;
    failedValidations: number;
    averageValidationTime: number;
    errorsByType: Record<string, number>;
    warningsByType: Record<string, number>;
    timestamp: number;
}

export interface IValidationSchema<T = unknown> {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
    validate?: (value: T) => boolean;
    metadata?: Record<string, unknown>;
}

export interface IValidationResult {
    isValid: boolean;
    errors: IValidationError[];
    warnings?: IValidationWarning[];
    metadata?: IValidationMetadata;
}

// ─── Validation Rules ─────────────────────────────────────────────────────────

export interface IValidationRule<T = unknown> {
    id: string;
    name: string;
    description?: string;
    severity: VALIDATION_SEVERITY_enum;
    scope: VALIDATION_SCOPE_enum;
    validate: (value: T, context?: IValidationContext) => Promise<IValidationResult>;
    priority: number;
    isEnabled?: boolean;
    metadata?: Record<string, unknown>;
}

export interface IValidationRuleSet<T = unknown> {
    id: string;
    name: string;
    description?: string;
    rules: IValidationRule<T>[];
    metadata?: Record<string, unknown>;
}

// ─── Status Validation Types ────────────────────────────────────────────────────

export interface IStatusValidationContext extends IValidationContext {
    entity: string;
    entityId: string;
    transition?: string;
    phase?: string;
}

export interface IStatusValidationResult extends IValidationResult {
    context?: {
        entity: string;
        transition?: string;
        metadata?: Record<string, unknown>;
    };
    domainMetadata?: {
        phase?: string;
        operation?: string;
        startTime?: number;
        duration?: number;
    };
    transition?: {
        from: string;
        to: string;
    };
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

export function createValidationMetadata(params: {
    component: string;
    operation: string;
    validatedFields?: string[];
    duration?: number;
    status?: string;
    validatorName?: string;
    agent?: IValidationMetadata['agent'];
    context?: Record<string, unknown>;
}): IValidationMetadata {
    return {
        timestamp: Date.now(),
        component: params.component,
        operation: params.operation,
        validatedFields: params.validatedFields,
        duration: params.duration,
        status: params.status,
        validatorName: params.validatorName,
        agent: params.agent,
        context: params.context
    };
}

export function createValidationError(params: {
    code: VALIDATION_ERROR_enum;
    message?: string;
    severity?: VALIDATION_SEVERITY_enum;
    scope?: VALIDATION_SCOPE_enum;
    field?: string;
    details?: Record<string, unknown>;
}): IValidationError {
    return {
        code: params.code,
        message: params.message || params.code,
        severity: params.severity || VALIDATION_SEVERITY_enum.ERROR,
        scope: params.scope || VALIDATION_SCOPE_enum.FIELD,
        field: params.field,
        details: params.details
    };
}

export function createValidationWarning(params: {
    code: VALIDATION_WARNING_enum;
    message?: string;
    severity?: VALIDATION_SEVERITY_enum;
    scope?: VALIDATION_SCOPE_enum;
    field?: string;
    details?: Record<string, unknown>;
}): IValidationWarning {
    return {
        code: params.code,
        message: params.message || params.code,
        severity: params.severity || VALIDATION_SEVERITY_enum.WARNING,
        scope: params.scope || VALIDATION_SCOPE_enum.FIELD,
        field: params.field,
        details: params.details
    };
}

export function createValidationResult(params: {
    isValid: boolean;
    errors?: VALIDATION_ERROR_enum[];
    warnings?: VALIDATION_WARNING_enum[];
    metadata?: IValidationMetadata;
    component?: string;
    operation?: string;
}): IValidationResult {
    const metadata = params.metadata || (params.component ? createValidationMetadata({
        component: params.component,
        operation: params.operation || 'validate'
    }) : undefined);

    return {
        isValid: params.isValid,
        errors: (params.errors || []).map(code => createValidationError({ code })),
        warnings: (params.warnings || []).map(code => createValidationWarning({ code })),
        metadata
    };
}

/**
 * Create a validation result with default metadata
 */
export function createDefaultValidationResult(params: {
    isValid: boolean;
    errors?: VALIDATION_ERROR_enum[];
    warnings?: VALIDATION_WARNING_enum[];
    component: string;
    operation?: string;
}): IValidationResult {
    return createValidationResult({
        ...params,
        operation: params.operation || 'validate'
    });
}

/**
 * Create a validation error result with default metadata
 */
export function createErrorValidationResult(params: {
    error: VALIDATION_ERROR_enum;
    component: string;
    operation?: string;
}): IValidationResult {
    return createValidationResult({
        isValid: false,
        errors: [params.error],
        component: params.component,
        operation: params.operation || 'validate'
    });
}

export function createStatusValidationResult(params: {
    isValid: boolean;
    errors?: IValidationError[];
    warnings?: IValidationWarning[];
    metadata?: IValidationMetadata;
    context?: IStatusValidationResult['context'];
    domainMetadata?: IStatusValidationResult['domainMetadata'];
    transition?: IStatusValidationResult['transition'];
}): IStatusValidationResult {
    return {
        isValid: params.isValid,
        errors: params.errors || [],
        warnings: params.warnings || [],
        metadata: params.metadata,
        context: params.context,
        domainMetadata: params.domainMetadata,
        transition: params.transition
    };
}
