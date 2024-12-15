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
    ILLMUsageMetrics
} from '../../types/llm/llmMetricTypes';
import { ERROR_KINDS } from '../../types/common/errorTypes';
import { ERROR_SEVERITY_enum } from '../../types/common/enumTypes';
import { RecoveryStrategyType } from '../../types/common/recoveryTypes';

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

const createDefaultRecoveryStrategyDistribution = () =>
    Object.values(RecoveryStrategyType).reduce(
        (acc, strategy) => ({ ...acc, [strategy]: 0 }),
        {} as Record<keyof typeof RecoveryStrategyType, number>
    );

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
    errorMetrics: {
        totalErrors: base.errorMetrics.totalErrors,
        errorRate: base.errorMetrics.errorRate,
        errorDistribution: createDefaultErrorDistribution(),
        severityDistribution: createDefaultSeverityDistribution(),
        patterns: [],
        impact: {
            severity: ERROR_SEVERITY_enum.INFO,
            businessImpact: 0,
            userExperienceImpact: 0,
            systemStabilityImpact: 0,
            resourceImpact: {
                cpu: 0,
                memory: 0,
                io: 0
            }
        },
        recovery: {
            meanTimeToRecover: 0,
            recoverySuccessRate: 1,
            strategyDistribution: createDefaultRecoveryStrategyDistribution(),
            failedRecoveries: 0
        },
        prevention: {
            preventedCount: 0,
            preventionRate: 1,
            earlyWarnings: 0
        },
        trends: {
            dailyRates: [],
            weeklyRates: [],
            monthlyRates: []
        }
    }
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
    timestamp: Date.now()
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
