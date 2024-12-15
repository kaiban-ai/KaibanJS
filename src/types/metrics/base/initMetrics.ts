/**
 * @file initMetrics.ts
 * @path src/types/metrics/base/initMetrics.ts
 * @description Initialization metrics type definitions
 *
 * @module @types/metrics/base
 */

import type { IBaseMetrics } from './baseMetrics';
import type { IResourceMetrics } from './resourceMetrics';
import type { IPerformanceMetrics } from './performanceMetrics';
import type { IUsageMetrics } from './usageMetrics';

// ─── Initialization Metrics Types ────────────────────────────────────────────────

export interface IInitStep {
    name: string;
    startTime: number;
    endTime: number;
    duration: number;
    success: boolean;
    error?: Error;
    metadata?: Record<string, unknown>;
}

export interface IInitResourceUsage {
    cpuUsage: number;
    memoryUsage: number;
    timestamp: number;
}

export interface IInitMetrics extends IBaseMetrics {
    startTime: number;
    endTime: number;
    duration: number;
    steps: IInitStep[];
    resourceUsage: IInitResourceUsage;
    resources: IResourceMetrics;
    performance: IPerformanceMetrics;
    usage: IUsageMetrics;
    timestamp: number;
}

// ─── Type Guards ────────────────────────────────────────────────────────────────

export const isInitStep = (value: unknown): value is IInitStep => {
    if (typeof value !== 'object' || value === null) return false;
    const step = value as Partial<IInitStep>;
    return (
        typeof step.name === 'string' &&
        typeof step.startTime === 'number' &&
        typeof step.endTime === 'number' &&
        typeof step.duration === 'number' &&
        typeof step.success === 'boolean'
    );
};

export const isInitResourceUsage = (value: unknown): value is IInitResourceUsage => {
    if (typeof value !== 'object' || value === null) return false;
    const usage = value as Partial<IInitResourceUsage>;
    return (
        typeof usage.cpuUsage === 'number' &&
        typeof usage.memoryUsage === 'number' &&
        typeof usage.timestamp === 'number'
    );
};

export const isInitMetrics = (value: unknown): value is IInitMetrics => {
    if (typeof value !== 'object' || value === null) return false;
    const metrics = value as Partial<IInitMetrics>;
    return (
        typeof metrics.startTime === 'number' &&
        typeof metrics.endTime === 'number' &&
        typeof metrics.duration === 'number' &&
        Array.isArray(metrics.steps) &&
        metrics.steps.every(isInitStep) &&
        isInitResourceUsage(metrics.resourceUsage) &&
        typeof metrics.resources === 'object' &&
        typeof metrics.performance === 'object' &&
        typeof metrics.usage === 'object' &&
        typeof metrics.timestamp === 'number'
    );
};
