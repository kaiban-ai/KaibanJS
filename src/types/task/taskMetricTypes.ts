/**
* @file taskMetricTypes.ts
* @path src/types/task/taskMetricTypes.ts
* @description Task-specific metric type definitions
*
* @module @types/task
*/

import type { IRateLimitMetrics } from '../metrics/base/usageMetrics';
import type { ITimeMetrics, IThroughputMetrics } from '../metrics/base/performanceMetrics';

// ─── Task Resource Metrics ────────────────────────────────────────────────────

export interface ITaskResourceMetrics {
    readonly cpuUsage: number;
    readonly memoryUsage: number;
    readonly diskIO: {
        readonly read: number;
        readonly write: number;
    };
    readonly networkUsage: {
        readonly upload: number;
        readonly download: number;
    };
    readonly timestamp: number;
}

// ─── Task Performance Metrics ─────────────────────────────────────────────────

export interface ITaskPerformanceMetrics {
    readonly executionTime: ITimeMetrics;
    readonly latency: ITimeMetrics;
    readonly throughput: IThroughputMetrics;
    readonly responseTime: ITimeMetrics;
    readonly queueLength: number;
    readonly errorRate: number;
    readonly successRate: number;
    readonly resourceUtilization: ITaskResourceMetrics;
    readonly timestamp: number;
}

// ─── Task Usage Metrics ───────────────────────────────────────────────────────

export interface ITaskUsageMetrics {
    readonly totalRequests: number;
    readonly activeUsers: number;
    readonly requestsPerSecond: number;
    readonly averageResponseSize: number;
    readonly peakMemoryUsage: number;
    readonly uptime: number;
    readonly rateLimit: IRateLimitMetrics;
    readonly timestamp: number;
}

// ─── Type Guards ────────────────────────────────────────────────────────────

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
