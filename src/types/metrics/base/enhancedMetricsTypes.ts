/**
 * @file enhancedMetricsTypes.ts
 * @path KaibanJS/src/types/metrics/base/enhancedMetricsTypes.ts
 * @description Enhanced metrics types for improved tracking and analysis
 */

import { MetricDomain, MetricType } from './metricsManagerTypes';

/**
 * System health metrics
 */
export interface ISystemHealthMetrics {
    readonly timestamp: number;
    readonly cpu: {
        readonly usage: number;
        readonly temperature?: number;
        readonly loadAverage: number[];
    };
    readonly memory: {
        readonly used: number;
        readonly total: number;
        readonly free: number;
    };
    readonly disk: {
        readonly read: number;
        readonly write: number;
        readonly free: number;
        readonly total: number;
    };
    readonly network: {
        readonly upload: number;
        readonly download: number;
    };
    readonly processMetrics: {
        readonly uptime: number;
        readonly memoryUsage: NodeJS.MemoryUsage;
        readonly cpuUsage: NodeJS.CpuUsage;
    };
}

/**
 * Metric trend analysis
 */
export interface IMetricTrend {
    readonly changeRate: number;
    readonly volatility: number;
    readonly trend: 'increasing' | 'decreasing' | 'stable';
    readonly confidence: number;
    readonly mean: number;
    readonly standardDeviation: number;
    readonly sampleSize: number;
    readonly timeSpan: number;
}

/**
 * Enhanced metric event with history
 */
export interface IMetricHistory {
    readonly runId: string;
    readonly events: {
        readonly timestamp: number;
        readonly domain: MetricDomain;
        readonly type: MetricType;
        readonly value: number | string;
        readonly metadata: Record<string, any>;
        readonly systemHealth: ISystemHealthMetrics;
        readonly trends?: IMetricTrend;
    }[];
}

/**
 * System health thresholds
 */
export interface IHealthThresholds {
    readonly cpu: {
        readonly usage: number;
        readonly temperature?: number;
    };
    readonly memory: {
        readonly usage: number;
    };
    readonly disk: {
        readonly usage: number;
    };
}

/**
 * Health check result
 */
export interface IHealthCheckResult {
    readonly timestamp: number;
    readonly status: 'healthy' | 'warning' | 'critical';
    readonly checks: {
        readonly name: string;
        readonly status: 'pass' | 'warn' | 'fail';
        readonly message?: string;
        readonly value: number;
        readonly threshold: number;
    }[];
    readonly metadata: {
        readonly systemHealth: ISystemHealthMetrics;
        readonly trends: IMetricTrend;
    };
}

/**
 * Enhanced metrics storage options
 */
export interface IEnhancedStorageOptions {
    readonly retentionPeriod: number;
    readonly historyRetention: number;
    readonly aggregationPeriods: {
        readonly hourly: number;
        readonly daily: number;
        readonly weekly: number;
    };
    readonly healthCheckInterval: number;
    readonly thresholds: IHealthThresholds;
}
