/**
 * @file llmValidationTypes.ts
 * @description Validation type definitions for LLM configurations
 */

import { VALIDATION_ERROR_enum, VALIDATION_WARNING_enum } from '../common/enumTypes';
import type { IBaseHandlerMetadata } from '../common/baseTypes';
import type { LLMProviderConfig } from './llmProviderTypes';

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
    customValidators?: Array<(config: LLMProviderConfig) => boolean>;
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
        metadata: {
            ...metadata,
            timestamp: Date.now(),
            component: 'LLMValidator',
            operation: 'validate',
            performance: {
                executionTime: { total: 0, average: 0, min: 0, max: 0 },
                latency: { total: 0, average: 0, min: 0, max: 0 },
                responseTime: { total: 0, average: 0, min: 0, max: 0 },
                throughput: { operationsPerSecond: 0, dataProcessedPerSecond: 0 },
                queueLength: 0,
                errorRate: 0,
                successRate: 1,
                errorMetrics: { totalErrors: 0, errorRate: 0 },
                resourceUtilization: {
                    cpuUsage: 0,
                    memoryUsage: process.memoryUsage().heapUsed,
                    diskIO: { read: 0, write: 0 },
                    networkUsage: { upload: 0, download: 0 },
                    timestamp: Date.now()
                },
                timestamp: Date.now()
            },
            context: {
                source: 'LLMValidator',
                target: 'validation',
                correlationId: Date.now().toString(),
                causationId: Date.now().toString()
            },
            validation: {
                isValid: true,
                errors: [],
                warnings: []
            },
            provider: metadata?.provider || 'unknown',
            model: metadata?.model || 'unknown',
            validatedFields: metadata?.validatedFields || [],
            configHash: metadata?.configHash || '',
            validationDuration: metadata?.validationDuration || 0
        } as ILLMValidationMetadata
    };
}
