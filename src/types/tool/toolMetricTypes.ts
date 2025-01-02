/**
 * @file toolMetricTypes.ts
 * @path KaibanJS/src/types/tool/toolMetricTypes.ts
 * @description Tool metric type definitions and validation
 */

import type { ITimeMetrics, IThroughputMetrics } from '../metrics/base/performanceMetrics';
import type { IResourceMetrics } from '../metrics/base/resourceMetrics';
import type { IUsageMetrics } from '../metrics/base/usageMetrics';
import { createValidationResult } from '../common/validationTypes';
import type { IValidationResult } from '../common/validationTypes';

/**
 * Tool resource metrics interface
 */
export interface IToolResourceMetrics extends IResourceMetrics {
    /** Memory usage by tool */
    readonly toolMemoryUsage: number;
    /** CPU usage by tool */
    readonly toolCpuUsage: number;
    /** Network usage by tool */
    readonly toolNetworkUsage: {
        readonly sent: number;
        readonly received: number;
    };
    /** Storage usage by tool */
    readonly toolStorageUsage: {
        readonly read: number;
        readonly write: number;
    };
}

/**
 * Tool performance metrics interface
 */
export interface IToolPerformanceMetrics {
    /** Execution time metrics */
    readonly executionTime: ITimeMetrics;
    /** Throughput metrics */
    readonly throughput: IThroughputMetrics;
    /** Success rate percentage */
    readonly successRate: number;
    /** Error rate percentage */
    readonly errorRate: number;
    /** Average response time */
    readonly avgResponseTime: number;
    /** Tool-specific latency */
    readonly toolLatency: number;
}

/**
 * Tool usage metrics interface
 */
export interface IToolUsageMetrics extends IUsageMetrics {
    /** Total number of tool executions */
    readonly totalExecutions: number;
    /** Number of successful executions */
    readonly successfulExecutions: number;
    /** Number of failed executions */
    readonly failedExecutions: number;
    /** Average execution duration */
    readonly avgExecutionDuration: number;
    /** Tool-specific usage stats */
    readonly toolSpecificStats?: Record<string, unknown>;
}

// ─── Type Guards ────────────────────────────────────────────────────────────

/**
 * Type guard for tool resource metrics
 */
export const isToolResourceMetrics = (value: unknown): value is IToolResourceMetrics => {
    if (typeof value !== 'object' || value === null) return false;
    const metrics = value as Partial<IToolResourceMetrics>;

    return (
        typeof metrics.toolMemoryUsage === 'number' &&
        typeof metrics.toolCpuUsage === 'number' &&
        typeof metrics.toolNetworkUsage === 'object' &&
        metrics.toolNetworkUsage !== null &&
        typeof metrics.toolNetworkUsage.sent === 'number' &&
        typeof metrics.toolNetworkUsage.received === 'number' &&
        typeof metrics.toolStorageUsage === 'object' &&
        metrics.toolStorageUsage !== null &&
        typeof metrics.toolStorageUsage.read === 'number' &&
        typeof metrics.toolStorageUsage.write === 'number'
    );
};

/**
 * Type guard for tool performance metrics
 */
export const isToolPerformanceMetrics = (value: unknown): value is IToolPerformanceMetrics => {
    if (typeof value !== 'object' || value === null) return false;
    const metrics = value as Partial<IToolPerformanceMetrics>;

    return (
        typeof metrics.executionTime === 'object' &&
        metrics.executionTime !== null &&
        typeof metrics.throughput === 'object' &&
        metrics.throughput !== null &&
        typeof metrics.successRate === 'number' &&
        typeof metrics.errorRate === 'number' &&
        typeof metrics.avgResponseTime === 'number' &&
        typeof metrics.toolLatency === 'number'
    );
};

/**
 * Type guard for tool usage metrics
 */
export const isToolUsageMetrics = (value: unknown): value is IToolUsageMetrics => {
    if (typeof value !== 'object' || value === null) return false;
    const metrics = value as Partial<IToolUsageMetrics>;

    return (
        typeof metrics.totalExecutions === 'number' &&
        typeof metrics.successfulExecutions === 'number' &&
        typeof metrics.failedExecutions === 'number' &&
        typeof metrics.avgExecutionDuration === 'number' &&
        (metrics.toolSpecificStats === undefined || typeof metrics.toolSpecificStats === 'object')
    );
};

// ─── Validation Functions ────────────────────────────────────────────────────

/**
 * Validate tool resource metrics
 */
export const validateToolResourceMetrics = (metrics: unknown): IValidationResult => {
    if (!isToolResourceMetrics(metrics)) {
        return createValidationResult({
            isValid: false,
            errors: ['Invalid tool resource metrics structure'],
            metadata: { validatorName: 'ToolResourceMetricsValidator' }
        });
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    if (metrics.toolMemoryUsage < 0) {
        errors.push('Tool memory usage cannot be negative');
    }

    if (metrics.toolCpuUsage < 0 || metrics.toolCpuUsage > 100) {
        errors.push('Tool CPU usage must be between 0 and 100');
    }

    if (metrics.toolNetworkUsage.sent < 0) {
        errors.push('Network sent bytes cannot be negative');
    }

    if (metrics.toolNetworkUsage.received < 0) {
        errors.push('Network received bytes cannot be negative');
    }

    if (metrics.toolStorageUsage.read < 0) {
        errors.push('Storage read bytes cannot be negative');
    }

    if (metrics.toolStorageUsage.write < 0) {
        errors.push('Storage write bytes cannot be negative');
    }

    return createValidationResult({
        isValid: errors.length === 0,
        errors,
        warnings,
        metadata: { validatorName: 'ToolResourceMetricsValidator' }
    });
};

/**
 * Validate tool performance metrics
 */
export const validateToolPerformanceMetrics = (metrics: unknown): IValidationResult => {
    if (!isToolPerformanceMetrics(metrics)) {
        return createValidationResult({
            isValid: false,
            errors: ['Invalid tool performance metrics structure'],
            metadata: { validatorName: 'ToolPerformanceMetricsValidator' }
        });
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    if (metrics.successRate < 0 || metrics.successRate > 100) {
        errors.push('Success rate must be between 0 and 100');
    }

    if (metrics.errorRate < 0 || metrics.errorRate > 100) {
        errors.push('Error rate must be between 0 and 100');
    }

    if (metrics.avgResponseTime < 0) {
        errors.push('Average response time cannot be negative');
    }

    if (metrics.toolLatency < 0) {
        errors.push('Tool latency cannot be negative');
    }

    return createValidationResult({
        isValid: errors.length === 0,
        errors,
        warnings,
        metadata: { validatorName: 'ToolPerformanceMetricsValidator' }
    });
};

/**
 * Validate tool usage metrics
 */
export const validateToolUsageMetrics = (metrics: unknown): IValidationResult => {
    if (!isToolUsageMetrics(metrics)) {
        return createValidationResult({
            isValid: false,
            errors: ['Invalid tool usage metrics structure'],
            metadata: { validatorName: 'ToolUsageMetricsValidator' }
        });
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    if (metrics.totalExecutions < 0) {
        errors.push('Total executions cannot be negative');
    }

    if (metrics.successfulExecutions < 0) {
        errors.push('Successful executions cannot be negative');
    }

    if (metrics.failedExecutions < 0) {
        errors.push('Failed executions cannot be negative');
    }

    if (metrics.avgExecutionDuration < 0) {
        errors.push('Average execution duration cannot be negative');
    }

    if (metrics.successfulExecutions + metrics.failedExecutions > metrics.totalExecutions) {
        errors.push('Sum of successful and failed executions cannot exceed total executions');
    }

    return createValidationResult({
        isValid: errors.length === 0,
        errors,
        warnings,
        metadata: { validatorName: 'ToolUsageMetricsValidator' }
    });
};
