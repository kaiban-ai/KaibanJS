/**
 * @file performanceMetrics.ts
 * @description Essential performance metrics for basic monitoring
 */

import { IBaseMetrics } from './baseMetrics';
import { createValidationResult } from '../../common/validationTypes';

/**
 * Basic time metrics
 */
export interface ITimeMetrics {
    readonly average: number;
    readonly min: number;
    readonly max: number;
    readonly total?: number;
}

/**
 * Basic throughput metrics
 */
export interface IThroughputMetrics {
    readonly requestsPerSecond: number;
    readonly bytesPerSecond: number;
    readonly operationsPerSecond?: number;
    readonly dataProcessedPerSecond?: number;
}

/**
 * Essential performance metrics
 */
export interface IPerformanceMetrics extends IBaseMetrics {
    readonly responseTime: ITimeMetrics;
    readonly throughput: IThroughputMetrics;
}

// Type Guards
export const PerformanceMetricsTypeGuards = {
    isTimeMetrics(value: unknown): value is ITimeMetrics {
        if (!value || typeof value !== 'object') return false;
        const metrics = value as Partial<ITimeMetrics>;
        return (
            typeof metrics.average === 'number' &&
            typeof metrics.min === 'number' &&
            typeof metrics.max === 'number' &&
            (metrics.total === undefined || typeof metrics.total === 'number')
        );
    },

    isThroughputMetrics(value: unknown): value is IThroughputMetrics {
        if (!value || typeof value !== 'object') return false;
        const metrics = value as Partial<IThroughputMetrics>;
        return (
            typeof metrics.requestsPerSecond === 'number' &&
            typeof metrics.bytesPerSecond === 'number' &&
            (metrics.operationsPerSecond === undefined || typeof metrics.operationsPerSecond === 'number') &&
            (metrics.dataProcessedPerSecond === undefined || typeof metrics.dataProcessedPerSecond === 'number')
        );
    },

    isPerformanceMetrics(value: unknown): value is IPerformanceMetrics {
        if (!value || typeof value !== 'object') return false;
        const metrics = value as Partial<IPerformanceMetrics>;
        return (
            typeof metrics.timestamp === 'number' &&
            typeof metrics.component === 'string' &&
            typeof metrics.category === 'string' &&
            typeof metrics.version === 'string' &&
            this.isTimeMetrics(metrics.responseTime) &&
            this.isThroughputMetrics(metrics.throughput)
        );
    }
};

// Validation
export const PerformanceMetricsValidation = {
    validateTimeMetrics(metrics: unknown) {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!PerformanceMetricsTypeGuards.isTimeMetrics(metrics)) {
            return createValidationResult({
                isValid: false,
                errors: ['Invalid time metrics structure']
            });
        }

        if (metrics.min > metrics.max) {
            errors.push('Minimum value cannot be greater than maximum value');
        }

        if (metrics.average < metrics.min || metrics.average > metrics.max) {
            errors.push('Average value must be between minimum and maximum values');
        }

        if (metrics.total !== undefined && metrics.total < 0) {
            errors.push('Total time cannot be negative');
        }

        return createValidationResult({
            isValid: errors.length === 0,
            errors,
            warnings
        });
    },

    validateThroughputMetrics(metrics: unknown) {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!PerformanceMetricsTypeGuards.isThroughputMetrics(metrics)) {
            return createValidationResult({
                isValid: false,
                errors: ['Invalid throughput metrics structure']
            });
        }

        if (metrics.requestsPerSecond < 0) {
            errors.push('Requests per second cannot be negative');
        }

        if (metrics.bytesPerSecond < 0) {
            errors.push('Bytes per second cannot be negative');
        }

        if (metrics.operationsPerSecond !== undefined && metrics.operationsPerSecond < 0) {
            errors.push('Operations per second cannot be negative');
        }

        if (metrics.dataProcessedPerSecond !== undefined && metrics.dataProcessedPerSecond < 0) {
            errors.push('Data processed per second cannot be negative');
        }

        return createValidationResult({
            isValid: errors.length === 0,
            errors,
            warnings
        });
    },

    validatePerformanceMetrics(metrics: unknown) {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!PerformanceMetricsTypeGuards.isPerformanceMetrics(metrics)) {
            return createValidationResult({
                isValid: false,
                errors: ['Invalid performance metrics structure']
            });
        }

        const timeValidation = this.validateTimeMetrics(metrics.responseTime);
        const throughputValidation = this.validateThroughputMetrics(metrics.throughput);

        errors.push(...timeValidation.errors);
        errors.push(...throughputValidation.errors);
        warnings.push(...timeValidation.warnings);
        warnings.push(...throughputValidation.warnings);

        if (metrics.timestamp > Date.now()) {
            warnings.push('Timestamp is in the future');
        }

        return createValidationResult({
            isValid: errors.length === 0,
            errors,
            warnings
        });
    }
};
