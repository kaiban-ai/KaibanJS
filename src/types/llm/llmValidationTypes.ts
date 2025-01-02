/**
 * @file llmValidationTypes.ts
 * @description Validation type definitions for LLM configurations
 */

import { VALIDATION_ERROR_enum, VALIDATION_WARNING_enum } from '../common/enumTypes';
import type { IBaseHandlerMetadata, IBaseContextRequired } from '../common/baseTypes';
import type { ILLMProviderConfig } from './llmProviderTypes';
import type { IPerformanceMetrics } from '../metrics/base/performanceMetrics';
import type { IValidationResult } from '../common/validationTypes';

export interface ILLMValidationField {
    type: string;
    min?: number;
    max?: number;
}

/**
 * LLM validation metadata interface
 */
export interface ILLMValidationMetadata extends IBaseHandlerMetadata {
    provider: string;
    model: string;
    validatedFields: ReadonlyArray<string>;
    configHash: string;
    validationDuration: number;
}

/**
 * LLM validation result interface
 */
export interface ILLMValidationResult<T = unknown> {
    isValid: boolean;
    errors: VALIDATION_ERROR_enum[];
    warnings: VALIDATION_WARNING_enum[];
    data?: T;
    metadata: ILLMValidationMetadata;
}

/**
 * LLM validation options interface
 */
export interface ILLMValidationOptions {
    strict?: boolean;
    timeout?: number;
    retryCount?: number;
    customValidators?: Array<(config: ILLMProviderConfig) => boolean>;
}

/**
 * LLM validation context interface
 */
export interface ILLMValidationContext {
    provider: string;
    model: string;
    operation: string;
    timestamp: number;
    validationDuration?: number;
}

/**
 * Create a validation result with the given parameters
 */
export function createLLMValidationResult<T>(
    isValid: boolean,
    errors: VALIDATION_ERROR_enum[] = [],
    warnings: VALIDATION_WARNING_enum[] = [],
    data?: T,
    metadata?: Partial<ILLMValidationMetadata>
): ILLMValidationResult<T> {
    return {
        isValid,
        errors,
        warnings,
        data,
        metadata: ({
            ...metadata,
            timestamp: Date.now(),
            component: 'LLMValidator',
            operation: 'validate',
            performance: {
                timestamp: Date.now(),
                component: 'LLMValidator',
                category: 'validation',
                version: '1.0',
                responseTime: {
                    average: 0,
                    min: 0,
                    max: 0,
                    total: 0
                },
                throughput: {
                    requestsPerSecond: 0,
                    bytesPerSecond: 0,
                    operationsPerSecond: 0,
                    dataProcessedPerSecond: 0
                }
            } satisfies IPerformanceMetrics,
            context: {
                source: 'LLMValidator',
                target: 'validation',
                correlationId: Date.now().toString(),
                causationId: Date.now().toString()
            } satisfies IBaseContextRequired,
            validation: {
                isValid: true,
                errors: [],
                warnings: []
            } satisfies IValidationResult,
            provider: metadata?.provider || 'unknown',
            model: metadata?.model || 'unknown',
            validatedFields: metadata?.validatedFields || [],
            configHash: metadata?.configHash || '',
            validationDuration: metadata?.validationDuration || 0
        }) satisfies ILLMValidationMetadata
    };
}
