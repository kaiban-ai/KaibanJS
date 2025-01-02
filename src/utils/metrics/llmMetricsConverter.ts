/**
 * @file llmMetricsConverter.ts
 * @path src/utils/metrics/llmMetricsConverter.ts
 * @description Utility functions for converting base metrics to LLM-specific metrics
 */

import type { IResourceMetrics } from '../../types/metrics/base/resourceMetrics';
import type { IPerformanceMetrics } from '../../types/metrics/base/performanceMetrics';
import type { 
    ILLMMetrics,
    ILLMResourceMetrics,
    ILLMPerformanceMetrics,
    ILLMUsageMetrics,
    ILLMErrorMetrics
} from '../../types/llm/llmMetricTypes';
import { ERROR_KINDS } from '../../types/common/errorTypes';
import { ERROR_SEVERITY_enum } from '../../types/common/enumTypes';

const createDefaultErrorDistribution = () => 
    Object.values(ERROR_KINDS).reduce(
        (acc, kind) => ({ ...acc, [kind]: 0 }),
        {} as Record<keyof typeof ERROR_KINDS, number>
    );

const createDefaultSeverityDistribution = () =>
    Object.values(ERROR_SEVERITY_enum).reduce(
        (acc, severity) => ({ ...acc, [severity]: 0 }),
        {} as Record<keyof typeof ERROR_SEVERITY_enum, number>
    );

const createDefaultErrorMetrics = (): ILLMErrorMetrics => ({
    count: 0,
    rate: 0,
    lastError: 0,
    byType: createDefaultErrorDistribution(),
    bySeverity: createDefaultSeverityDistribution(),
    avgLatencyIncrease: 0,
    avgMemoryUsage: 0,
    avgCpuUsage: 0,
    hourlyErrors: Array(24).fill(0)
});

export const convertToLLMResourceMetrics = (base: IResourceMetrics): ILLMResourceMetrics => ({
    ...base,
    gpuMemoryUsage: 0, // Default to 0 if not available
    modelMemoryAllocation: {
        weights: 0,
        cache: 0,
        workspace: 0
    }
});

export const convertToLLMPerformanceMetrics = (base: IPerformanceMetrics): ILLMPerformanceMetrics => ({
    ...base,
    tokensPerSecond: 0,
    coherenceScore: 1,
    temperatureImpact: 0,
    errorMetrics: createDefaultErrorMetrics()
});

export const createDefaultLLMUsageMetrics = (): ILLMUsageMetrics => ({
    tokenDistribution: {
        prompt: 0,
        completion: 0,
        total: 0
    },
    modelDistribution: {
        gpt4: 0,
        gpt35: 0,
        other: 0
    },
    activeInstances: 0,
    totalRequests: 0,
    activeUsers: 0,
    requestsPerSecond: 0,
    averageResponseSize: 0,
    peakMemoryUsage: 0,
    uptime: 0,
    rateLimit: {
        current: 0,
        limit: 0,
        remaining: 0,
        resetTime: Date.now() + 3600000 // 1 hour from now
    },
    timestamp: Date.now(),
    component: '',
    category: '',
    version: ''
});

export const convertToLLMMetrics = (
    resourceMetrics: IResourceMetrics,
    performanceMetrics: IPerformanceMetrics
): ILLMMetrics => ({
    resources: convertToLLMResourceMetrics(resourceMetrics),
    performance: convertToLLMPerformanceMetrics(performanceMetrics),
    usage: createDefaultLLMUsageMetrics(),
    timestamp: Date.now()
});
