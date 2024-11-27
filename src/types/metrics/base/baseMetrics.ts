/**
 * @file baseMetrics.ts
 * @path KaibanJS/src/types/metrics/base/baseMetrics.ts
 * @description Base metrics type definitions and interfaces for the metrics system
 * 
 * @module @types/metrics/base
 */

import type { IResourceMetrics } from './resourceMetrics';
import type { IPerformanceMetrics } from './performanceMetrics';
import type { IUsageMetrics } from './usageMetrics';

/**
 * Base metrics interface combining all metric types
 */
export interface IBaseMetrics {
    /** Resource utilization metrics */
    resource: IResourceMetrics;
    /** Performance-related metrics */
    performance: IPerformanceMetrics;
    /** Usage statistics and patterns */
    usage: IUsageMetrics;
    /** Timestamp of metrics collection */
    timestamp: number;
}

/**
 * Base metrics validation result
 */
export interface IMetricsValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

/**
 * Base metrics update options
 */
export interface IMetricsUpdateOptions {
    /** Whether to validate metrics before update */
    validate?: boolean;
    /** Whether to merge with existing metrics */
    merge?: boolean;
    /** Custom validation rules */
    validationRules?: Record<string, (value: any) => boolean>;
}

/**
 * Base metrics collection options
 */
export interface IMetricsCollectionOptions {
    /** Collection interval in milliseconds */
    interval?: number;
    /** Whether to include detailed metrics */
    detailed?: boolean;
    /** Specific metrics to collect */
    include?: string[];
    /** Metrics to exclude from collection */
    exclude?: string[];
}
