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
    resources: IResourceMetrics;        // Resource utilization metrics
    performance: IPerformanceMetrics;   // Performance-related metrics
    usage: IUsageMetrics;              // Usage statistics and patterns
    timestamp: number;                  // Timestamp of metrics collection
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
    validate?: boolean;                 // Whether to validate metrics before update
    merge?: boolean;                    // Whether to merge with existing metrics
    validationRules?: Record<string, (value: any) => boolean>;  // Custom validation rules
}

/**
 * Base metrics collection options
 */
export interface IMetricsCollectionOptions {
    interval?: number;                  // Collection interval in milliseconds
    detailed?: boolean;                 // Whether to include detailed metrics
    include?: string[];                 // Specific metrics to collect
    exclude?: string[];                 // Metrics to exclude from collection
}
