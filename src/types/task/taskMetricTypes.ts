/**
 * @file taskMetricTypes.ts
 * @path KaibanJS/src/types/task/taskMetricTypes.ts
 * @description Task-specific metric type definitions
 */

import type { IRateLimitMetrics } from '../metrics/base/usageMetrics';
import type { ITimeMetrics, IThroughputMetrics, IErrorMetrics } from '../metrics/base/performanceMetrics';
import { createValidationResult } from '@utils/validation/validationUtils';
import type { IValidationResult } from '../common/commonValidationTypes';

/**
 * Task-specific resource metrics
 */
export interface ITaskResourceMetrics {
    /** CPU usage percentage */
    readonly cpuUsage: number;
    /** Memory usage in bytes */
    readonly memoryUsage: number;
    /** Disk I/O statistics */
    readonly diskIO: {
        readonly read: number;
        readonly write: number;
    };
    /** Network usage statistics */
    readonly networkUsage: {
        readonly upload: number;
        readonly download: number;
    };
    /** Timestamp of metrics collection */
    readonly timestamp: number;
}

/**
 * Task-specific performance metrics
 */
export interface ITaskPerformanceMetrics {
    /** Time spent in execution phases */
    readonly executionTime: ITimeMetrics;
    /** Network latency metrics */
    readonly latency: ITimeMetrics;
    /** Throughput metrics */
    readonly throughput: IThroughputMetrics;
    /** Response time metrics */
    readonly responseTime: ITimeMetrics;
    /** Current queue length */
    readonly queueLength: number;
    /** Error rate percentage */
    readonly errorRate: number;
    /** Success rate percentage */
    readonly successRate: number;
    /** Error-related metrics */
    readonly errorMetrics: IErrorMetrics;
    /** Resource utilization metrics */
    readonly resourceUtilization: ITaskResourceMetrics;
    /** Timestamp of metrics collection */
    readonly timestamp: number;
}

/**
 * Task-specific usage metrics
 */
export interface ITaskUsageMetrics {
    /** Total number of requests made */
    readonly totalRequests: number;
    /** Number of active users */
    readonly activeUsers: number;
    /** Requests processed per second */
    readonly requestsPerSecond: number;
    /** Average size of responses */
    readonly averageResponseSize: number;
    /** Peak memory usage in bytes */
    readonly peakMemoryUsage: number;
    /** System uptime in seconds */
    readonly uptime: number;
    /** Rate limit information */
    readonly rateLimit: IRateLimitMetrics;
    /** Timestamp of metrics collection */
    readonly timestamp: number;
}

export const TaskMetricsTypeGuards = {
    isTaskResourceMetrics: (value: unknown): value is ITaskResourceMetrics => {
        if (typeof value !== 'object' || value === null) return false;
        const metrics = value as Partial<ITaskResourceMetrics>;

        return (
            typeof metrics.cpuUsage === 'number' &&
            typeof metrics.memoryUsage === 'number' &&
            typeof metrics.diskIO === 'object' &&
            metrics.diskIO !== null &&
            typeof metrics.diskIO.read === 'number' &&
            typeof metrics.diskIO.write === 'number' &&
            typeof metrics.networkUsage === 'object' &&
            metrics.networkUsage !== null &&
            typeof metrics.networkUsage.upload === 'number' &&
            typeof metrics.networkUsage.download === 'number' &&
            typeof metrics.timestamp === 'number'
        );
    },

    isTaskPerformanceMetrics: (value: unknown): value is ITaskPerformanceMetrics => {
        if (typeof value !== 'object' || value === null) return false;
        const metrics = value as Partial<ITaskPerformanceMetrics>;

        return (
            typeof metrics.executionTime === 'object' &&
            metrics.executionTime !== null &&
            typeof metrics.latency === 'object' &&
            metrics.latency !== null &&
            typeof metrics.throughput === 'object' &&
            metrics.throughput !== null &&
            typeof metrics.responseTime === 'object' &&
            metrics.responseTime !== null &&
            typeof metrics.queueLength === 'number' &&
            typeof metrics.errorRate === 'number' &&
            typeof metrics.successRate === 'number' &&
            typeof metrics.errorMetrics === 'object' &&
            metrics.errorMetrics !== null &&
            typeof metrics.resourceUtilization === 'object' &&
            metrics.resourceUtilization !== null &&
            typeof metrics.timestamp === 'number'
        );
    },

    isTaskUsageMetrics: (value: unknown): value is ITaskUsageMetrics => {
        if (typeof value !== 'object' || value === null) return false;
        const metrics = value as Partial<ITaskUsageMetrics>;

        return (
            typeof metrics.totalRequests === 'number' &&
            typeof metrics.activeUsers === 'number' &&
            typeof metrics.requestsPerSecond === 'number' &&
            typeof metrics.averageResponseSize === 'number' &&
            typeof metrics.peakMemoryUsage === 'number' &&
            typeof metrics.uptime === 'number' &&
            typeof metrics.rateLimit === 'object' &&
            metrics.rateLimit !== null &&
            typeof metrics.timestamp === 'number'
        );
    }
};

export const TaskMetricsValidation = {
    validateTaskResourceMetrics(metrics: unknown): IValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!TaskMetricsTypeGuards.isTaskResourceMetrics(metrics)) {
            errors.push('Invalid task resource metrics structure');
            return createValidationResult(false, errors);
        }

        if (metrics.cpuUsage < 0 || metrics.cpuUsage > 100) {
            errors.push('CPU usage must be between 0 and 100');
        }

        if (metrics.memoryUsage < 0) {
            errors.push('Memory usage cannot be negative');
        }

        if (metrics.diskIO.read < 0) {
            errors.push('Disk read cannot be negative');
        }

        if (metrics.diskIO.write < 0) {
            errors.push('Disk write cannot be negative');
        }

        if (metrics.networkUsage.upload < 0) {
            errors.push('Network upload cannot be negative');
        }

        if (metrics.networkUsage.download < 0) {
            errors.push('Network download cannot be negative');
        }

        if (metrics.timestamp > Date.now()) {
            warnings.push('Timestamp is in the future');
        }

        return createValidationResult(errors.length === 0, errors, warnings);
    },

    validateTaskPerformanceMetrics(metrics: unknown): IValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!TaskMetricsTypeGuards.isTaskPerformanceMetrics(metrics)) {
            errors.push('Invalid task performance metrics structure');
            return createValidationResult(false, errors);
        }

        if (metrics.queueLength < 0) {
            errors.push('Queue length cannot be negative');
        }

        if (metrics.errorRate < 0 || metrics.errorRate > 100) {
            errors.push('Error rate must be between 0 and 100');
        }

        if (metrics.successRate < 0 || metrics.successRate > 100) {
            errors.push('Success rate must be between 0 and 100');
        }

        if (metrics.timestamp > Date.now()) {
            warnings.push('Timestamp is in the future');
        }

        return createValidationResult(errors.length === 0, errors, warnings);
    },

    validateTaskUsageMetrics(metrics: unknown): IValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!TaskMetricsTypeGuards.isTaskUsageMetrics(metrics)) {
            errors.push('Invalid task usage metrics structure');
            return createValidationResult(false, errors);
        }

        if (metrics.totalRequests < 0) {
            errors.push('Total requests cannot be negative');
        }

        if (metrics.activeUsers < 0) {
            errors.push('Active users cannot be negative');
        }

        if (metrics.requestsPerSecond < 0) {
            errors.push('Requests per second cannot be negative');
        }

        if (metrics.averageResponseSize < 0) {
            errors.push('Average response size cannot be negative');
        }

        if (metrics.peakMemoryUsage < 0) {
            errors.push('Peak memory usage cannot be negative');
        }

        if (metrics.uptime < 0) {
            errors.push('Uptime cannot be negative');
        }

        if (metrics.timestamp > Date.now()) {
            warnings.push('Timestamp is in the future');
        }

        return createValidationResult(errors.length === 0, errors, warnings);
    }
};
