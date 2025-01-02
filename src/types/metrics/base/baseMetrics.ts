/**
 * @file baseMetrics.ts
 * @path KaibanJS/src/types/metrics/base/baseMetrics.ts
 * @description Base metrics interfaces used across the metrics system
 * 
 * @module @types/metrics/base
 */

/**
 * Base metrics interface - Foundation for all metric types
 */
export interface IBaseMetrics {
    readonly timestamp: number;
    readonly component: string;
    readonly category: string;
    readonly version: string;
}

/**
 * Metrics collection configuration options
 */
export interface IMetricsCollectionOptions {
    /**
     * Collection interval in milliseconds
     * @default 5000
     */
    interval?: number;

    /**
     * Whether to collect detailed metrics
     * @default false
     */
    detailed?: boolean;

    /**
     * Optional metadata to include with metrics
     */
    metadata?: Record<string, unknown>;
}
