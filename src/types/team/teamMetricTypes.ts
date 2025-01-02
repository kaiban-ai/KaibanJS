/**
 * @file teamMetricTypes.ts
 * @path src/types/team/teamMetricTypes.ts
 * @description Team metrics type definitions
 */

import { type IBaseMetrics } from '../metrics/base/baseMetrics';
import { type IResourceMetrics } from '../metrics/base/resourceMetrics';
import { type ITimeMetrics } from '../metrics/base/performanceMetrics';
import { type IErrorMetrics } from '../metrics/base/errorMetrics';
import { type IUsageMetrics } from '../metrics/base/usageMetrics';
import { type IHistoricalMetrics, type ITimeWindow, type ITimeWindowConfig } from './teamTimeWindowTypes';

// ─── Team Resource Metrics ────────────────────────────────────────────────────

export interface ITeamResourceMetrics extends IResourceMetrics {
    readonly agentCount: number;
    readonly taskCount: number;
    readonly workflowCount: number;
}

// ─── Team Performance Metrics ─────────────────────────────────────────────────

export interface ITeamThroughputMetrics {
    readonly requestsPerSecond: number;
    readonly bytesPerSecond: number;
    readonly taskCompletionRate: number;
    readonly workflowSuccessRate: number;
    readonly agentUtilization: number;
}

export interface ITeamPerformanceMetrics {
    readonly responseTime: ITimeMetrics;
    readonly throughput: ITeamThroughputMetrics;
    readonly resourceUtilization: ITeamResourceMetrics;
    readonly timestamp: number;
}

// ─── Team Usage Metrics ───────────────────────────────────────────────────────

export interface ITeamUsageMetrics extends IUsageMetrics {
    readonly activeAgents: number;
    readonly activeTasks: number;
    readonly activeWorkflows: number;
    readonly totalOperations: number;
    readonly resourceUtilization: number;
    readonly peakUsage: number;
}

// ─── Team Metrics ────────────────────────────────────────────────────────────

export interface ITeamMetrics extends IBaseMetrics {
    readonly resources: ITeamResourceMetrics;
    readonly performance: ITeamPerformanceMetrics;
    readonly usage: ITeamUsageMetrics;
    readonly errors: IErrorMetrics;
}

// ─── Historical Team Metrics ────────────────────────────────────────────────────

export interface IHistoricalTeamMetrics extends IHistoricalMetrics<ITeamMetrics> {
    readonly timeWindow: ITimeWindow;
    readonly timeWindowConfig: ITimeWindowConfig;
}

// ─── Type Guards ────────────────────────────────────────────────────────────

const isTimeWindow = (value: unknown): value is ITimeWindow => {
    if (!value || typeof value !== 'object') return false;
    const window = value as Record<string, unknown>;
    return (
        typeof window.retention === 'number' &&
        typeof window.resolution === 'number' &&
        typeof window.maxDataPoints === 'number'
    );
};

const isTimeWindowConfig = (value: unknown): value is ITimeWindowConfig => {
    if (!value || typeof value !== 'object') return false;
    const config = value as Record<string, unknown>;
    return (
        isTimeWindow(config.realtime) &&
        isTimeWindow(config.hourly) &&
        isTimeWindow(config.daily) &&
        isTimeWindow(config.weekly) &&
        isTimeWindow(config.monthly)
    );
};

export const TeamMetricsTypeGuards = {
    isTeamResourceMetrics(value: unknown): value is ITeamResourceMetrics {
        if (!value || typeof value !== 'object') return false;
        const metrics = value as Record<string, unknown>;

        // Check required properties exist
        const requiredProps = [
            'cpuUsage', 'memoryUsage', 'diskIO', 'networkUsage',
            'agentCount', 'taskCount', 'workflowCount', 'timestamp'
        ];
        if (!requiredProps.every(prop => prop in metrics)) return false;

        // Check diskIO structure
        const diskIO = metrics.diskIO as Record<string, unknown> | null;
        if (!diskIO || typeof diskIO !== 'object') return false;
        if (typeof diskIO.read !== 'number' || typeof diskIO.write !== 'number') return false;

        // Check networkUsage structure
        const networkUsage = metrics.networkUsage as Record<string, unknown> | null;
        if (!networkUsage || typeof networkUsage !== 'object') return false;
        if (typeof networkUsage.upload !== 'number' || typeof networkUsage.download !== 'number') return false;

        // Check numeric properties
        return (
            typeof metrics.cpuUsage === 'number' &&
            typeof metrics.memoryUsage === 'number' &&
            typeof metrics.agentCount === 'number' &&
            typeof metrics.taskCount === 'number' &&
            typeof metrics.workflowCount === 'number' &&
            typeof metrics.timestamp === 'number'
        );
    },

    isTeamThroughputMetrics(value: unknown): value is ITeamThroughputMetrics {
        if (!value || typeof value !== 'object') return false;
        const metrics = value as Record<string, unknown>;

        // Check required properties exist
        const requiredProps = [
            'requestsPerSecond',
            'bytesPerSecond',
            'taskCompletionRate',
            'workflowSuccessRate',
            'agentUtilization'
        ];
        if (!requiredProps.every(prop => prop in metrics)) return false;

        // Check numeric properties
        return (
            typeof metrics.requestsPerSecond === 'number' &&
            typeof metrics.bytesPerSecond === 'number' &&
            typeof metrics.taskCompletionRate === 'number' &&
            typeof metrics.workflowSuccessRate === 'number' &&
            typeof metrics.agentUtilization === 'number'
        );
    },

    isTeamPerformanceMetrics(value: unknown): value is ITeamPerformanceMetrics {
        if (!value || typeof value !== 'object') return false;
        const metrics = value as Record<string, unknown>;

        // Check required properties exist
        const requiredProps = [
            'responseTime',
            'throughput',
            'resourceUtilization',
            'timestamp'
        ];
        if (!requiredProps.every(prop => prop in metrics)) return false;

        // Check basic properties
        return (
            typeof metrics.responseTime === 'object' &&
            typeof metrics.throughput === 'object' &&
            typeof metrics.resourceUtilization === 'object' &&
            typeof metrics.timestamp === 'number'
        );
    },

    isTeamUsageMetrics(value: unknown): value is ITeamUsageMetrics {
        if (!value || typeof value !== 'object') return false;
        const metrics = value as Record<string, unknown>;

        // Check required properties exist
        const requiredProps = [
            'totalRequests', 'activeUsers', 'requestsPerSecond',
            'averageResponseSize', 'peakMemoryUsage', 'uptime',
            'rateLimit', 'timestamp', 'activeAgents', 'activeTasks',
            'activeWorkflows', 'totalOperations', 'resourceUtilization',
            'peakUsage'
        ];
        if (!requiredProps.every(prop => prop in metrics)) return false;

        // Check rateLimit structure
        const rateLimit = metrics.rateLimit as Record<string, unknown> | null;
        if (!rateLimit || typeof rateLimit !== 'object') return false;
        if (
            typeof rateLimit.current !== 'number' ||
            typeof rateLimit.limit !== 'number' ||
            typeof rateLimit.remaining !== 'number' ||
            typeof rateLimit.resetTime !== 'number'
        ) return false;

        // Check numeric properties
        return (
            typeof metrics.totalRequests === 'number' &&
            typeof metrics.activeUsers === 'number' &&
            typeof metrics.requestsPerSecond === 'number' &&
            typeof metrics.averageResponseSize === 'number' &&
            typeof metrics.peakMemoryUsage === 'number' &&
            typeof metrics.uptime === 'number' &&
            typeof metrics.timestamp === 'number' &&
            typeof metrics.activeAgents === 'number' &&
            typeof metrics.activeTasks === 'number' &&
            typeof metrics.activeWorkflows === 'number' &&
            typeof metrics.totalOperations === 'number' &&
            typeof metrics.resourceUtilization === 'number' &&
            typeof metrics.peakUsage === 'number'
        );
    },

    isTeamMetrics(value: unknown): value is ITeamMetrics {
        if (!value || typeof value !== 'object') return false;
        const metrics = value as Record<string, unknown>;

        // Check required properties exist
        const requiredProps = ['resources', 'performance', 'usage', 'errors', 'timestamp'];
        if (!requiredProps.every(prop => prop in metrics)) return false;

        // Check timestamp
        if (typeof metrics.timestamp !== 'number') return false;

        // Check complex properties
        return (
            this.isTeamResourceMetrics(metrics.resources) &&
            this.isTeamPerformanceMetrics(metrics.performance) &&
            this.isTeamUsageMetrics(metrics.usage) &&
            typeof metrics.errors === 'object'
        );
    },

    isHistoricalTeamMetrics(value: unknown): value is IHistoricalTeamMetrics {
        if (!value || typeof value !== 'object') return false;
        const metrics = value as Record<string, unknown>;

        // Check required properties exist
        const requiredProps = ['current', 'history', 'aggregates', 'timeWindow', 'timeWindowConfig'];
        if (!requiredProps.every(prop => prop in metrics)) return false;

        // Check current metrics
        if (!this.isTeamMetrics(metrics.current)) return false;

        // Check history array
        const history = metrics.history as Array<unknown>;
        if (!Array.isArray(history)) return false;
        if (!history.every(item => {
            if (!item || typeof item !== 'object') return false;
            const historyItem = item as Record<string, unknown>;
            return typeof historyItem.timestamp === 'number' && this.isTeamMetrics(historyItem);
        })) return false;

        // Check aggregates
        const aggregates = metrics.aggregates as Record<string, unknown>;
        if (!aggregates || typeof aggregates !== 'object') return false;
        if (!this.isTeamMetrics(aggregates.daily)) return false;
        if (!this.isTeamMetrics(aggregates.weekly)) return false;
        if (!this.isTeamMetrics(aggregates.monthly)) return false;

        // Check time window configuration
        if (!isTimeWindow(metrics.timeWindow)) return false;
        if (!isTimeWindowConfig(metrics.timeWindowConfig)) return false;

        return true;
    }
};
