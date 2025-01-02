/**
 * @file enhancedMetricsTypes.ts
 * @path KaibanJS/src/types/metrics/base/enhancedMetricsTypes.ts
 * @description Enhanced metrics types for monitoring and analysis
 */

import { MetricDomain, MetricType } from './metricsManagerTypes';
import { ICoreSystemHealthMetrics, ISystemMetrics } from './systemHealthMetrics';

/**
 * Enhanced system metrics for monitoring, extending core system health metrics
 */
export interface IMonitoredSystemMetrics extends ICoreSystemHealthMetrics {
    readonly metrics: ISystemMetrics;
    readonly monitoringExtensions?: {
        readonly customMetrics?: Record<string, number>;
        readonly alerts?: Array<{
            readonly type: string;
            readonly severity: 'info' | 'warning' | 'error';
            readonly message: string;
            readonly timestamp: number;
        }>;
        readonly lastMonitoringCheck: number;
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
        readonly metadata: Record<string, unknown>;
        readonly systemHealth: IMonitoredSystemMetrics;
        readonly trends?: IMetricTrend;
    }[];
}

/**
 * System health thresholds for monitoring
 */
export interface IMonitoredHealthThresholds {
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
 * Health check result for monitoring
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
        readonly systemHealth: IMonitoredSystemMetrics;
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
    readonly thresholds: IMonitoredHealthThresholds;
}

// ─── Legacy Type Aliases (for backward compatibility) ────────────────────────────

/** @deprecated Use ICoreSystemHealthMetrics instead */
export type ISystemHealthMetrics = ICoreSystemHealthMetrics;

/** @deprecated Use IMonitoredHealthThresholds instead */
export type IHealthThresholds = IMonitoredHealthThresholds;

// ─── Type Guards ────────────────────────────────────────────────────────────

export const EnhancedMetricsTypeGuards = {
    isMonitoredSystemMetrics(value: unknown): value is IMonitoredSystemMetrics {
        if (!value || typeof value !== 'object') return false;
        const metrics = value as Partial<IMonitoredSystemMetrics>;

        // Check core system health metrics properties
        if (!(
            typeof metrics.timestamp === 'number' &&
            metrics.metrics &&
            metrics.status &&
            metrics.capacity &&
            metrics.stability &&
            metrics.thresholds &&
            metrics.degradation
        )) {
            return false;
        }

        // Check system metrics structure
        const systemMetrics = metrics.metrics;
        if (!(
            typeof systemMetrics.timestamp === 'number' &&
            systemMetrics.cpu &&
            typeof systemMetrics.cpu.usage === 'number' &&
            Array.isArray(systemMetrics.cpu.loadAverage) &&
            systemMetrics.memory &&
            typeof systemMetrics.memory.used === 'number' &&
            typeof systemMetrics.memory.total === 'number' &&
            typeof systemMetrics.memory.free === 'number' &&
            systemMetrics.disk &&
            typeof systemMetrics.disk.read === 'number' &&
            typeof systemMetrics.disk.write === 'number' &&
            typeof systemMetrics.disk.free === 'number' &&
            typeof systemMetrics.disk.total === 'number' &&
            systemMetrics.network &&
            typeof systemMetrics.network.upload === 'number' &&
            typeof systemMetrics.network.download === 'number' &&
            systemMetrics.process &&
            typeof systemMetrics.process.uptime === 'number' &&
            systemMetrics.process.memoryUsage &&
            systemMetrics.process.cpuUsage
        )) {
            return false;
        }

        // Check monitoring extensions if present
        if (metrics.monitoringExtensions) {
            if (metrics.monitoringExtensions.alerts) {
                if (!Array.isArray(metrics.monitoringExtensions.alerts)) {
                    return false;
                }
                for (const alert of metrics.monitoringExtensions.alerts) {
                    if (!(
                        typeof alert.type === 'string' &&
                        typeof alert.message === 'string' &&
                        typeof alert.timestamp === 'number' &&
                        ['info', 'warning', 'error'].includes(alert.severity)
                    )) {
                        return false;
                    }
                }
            }
            if (typeof metrics.monitoringExtensions.lastMonitoringCheck !== 'number') {
                return false;
            }
        }

        return true;
    },

    /** @deprecated Use isMonitoredSystemMetrics instead */
    isSystemHealthMetrics: function(value: unknown): value is ISystemHealthMetrics {
        return this.isMonitoredSystemMetrics(value);
    }
};
