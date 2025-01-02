/**
 * @file taskMetricsManager.ts
 * @path src/managers/domain/task/taskMetricsManager.ts
 * @description Task metrics management implementation
 */

import { CoreManager } from '../../core/coreManager';
import { createError } from '../../../types/common/errorTypes';
import { MetricDomain, MetricType } from '../../../types/metrics/base/metricsManagerTypes';
import { ERROR_KINDS } from '../../../types/common/errorTypes';
import { ERROR_SEVERITY_enum, MANAGER_CATEGORY_enum } from '../../../types/common/enumTypes';
import { RecoveryStrategyType } from '../../../types/common/recoveryTypes';

import type { ITaskMetrics } from '../../../types/task/taskHandlerTypes';
import type { 
    ITaskResourceMetrics,
    ITaskPerformanceMetrics,
    ITaskUsageMetrics 
} from '../../../types/task/taskMetricTypes';
import type { ICostDetails } from '../../../types/workflow/workflowCostsTypes';
import type { ILLMUsageMetrics } from '../../../types/llm/llmMetricTypes';

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_COST_METRICS: ICostDetails = {
    inputCost: 0,
    outputCost: 0,
    totalCost: 0,
    currency: 'USD',
    breakdown: {
        promptTokens: { count: 0, cost: 0 },
        completionTokens: { count: 0, cost: 0 }
    }
};

const DEFAULT_LLM_METRICS: ILLMUsageMetrics = {
    totalRequests: 0,
    activeInstances: 0,
    activeUsers: 0,
    requestsPerSecond: 0,
    averageResponseSize: 0,
    peakMemoryUsage: 0,
    uptime: 0,
    rateLimit: {
        current: 0,
        limit: 0,
        remaining: 0,
        resetTime: 0
    },
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
    timestamp: Date.now()
};

// ─── Manager Implementation ───────────────────────────────────────────────────

export class TaskMetricsManager extends CoreManager {
    public readonly category = MANAGER_CATEGORY_enum.METRICS;
    private readonly metrics: Map<string, ITaskMetrics>;

    constructor() {
        super();
        this.metrics = new Map();
    }

    public initializeMetrics(taskId: string): void {
        const initialMetrics: ITaskMetrics = {
            startTime: 0,
            endTime: 0,
            duration: 0,
            iterationCount: 0,
            resources: this.getInitialResourceMetrics(),
            performance: this.getInitialPerformanceMetrics(),
            costs: DEFAULT_COST_METRICS,
            llmUsageMetrics: DEFAULT_LLM_METRICS,
            usage: this.getInitialUsageMetrics()
        };

        this.metrics.set(taskId, initialMetrics);
    }

    public getMetrics(taskId: string): ITaskMetrics | undefined {
        return this.metrics.get(taskId);
    }

    public async updateMetrics(taskId: string, updates: Partial<ITaskMetrics>): Promise<ITaskMetrics> {
        const currentMetrics = this.metrics.get(taskId);
        if (!currentMetrics) {
            throw createError({
                message: `No metrics found for task ${taskId}`,
                type: 'SystemError'
            });
        }

        const updatedMetrics = {
            ...currentMetrics,
            ...updates,
            resources: {
                ...currentMetrics.resources,
                ...updates.resources
            },
            performance: {
                ...currentMetrics.performance,
                ...updates.performance
            },
            costs: {
                ...currentMetrics.costs,
                ...updates.costs
            },
            llmUsageMetrics: {
                ...currentMetrics.llmUsageMetrics,
                ...updates.llmUsageMetrics
            },
            usage: {
                ...currentMetrics.usage,
                ...updates.usage
            }
        };

        this.metrics.set(taskId, updatedMetrics);

        await this.getMetricsManager().trackMetric({
            domain: MetricDomain.TASK,
            type: MetricType.PERFORMANCE,
            value: updatedMetrics.duration,
            timestamp: Date.now(),
            metadata: {
                taskId,
                metrics: updatedMetrics
            }
        });

        return updatedMetrics;
    }

    private getInitialResourceMetrics(): ITaskResourceMetrics {
        return {
            cpuUsage: 0,
            memoryUsage: process.memoryUsage().heapUsed,
            diskIO: { read: 0, write: 0 },
            networkUsage: { upload: 0, download: 0 },
            timestamp: Date.now()
        };
    }

    private getInitialPerformanceMetrics(): ITaskPerformanceMetrics {
        const timeMetrics = {
            total: 0,
            average: 0,
            min: 0,
            max: 0
        };

        return {
            executionTime: timeMetrics,
            latency: { ...timeMetrics },
            throughput: {
                operationsPerSecond: 0,
                dataProcessedPerSecond: 0
            },
            responseTime: timeMetrics,
            queueLength: 0,
            errorRate: 0,
            successRate: 1,
            errorMetrics: {
                totalErrors: 0,
                errorRate: 0,
                errorDistribution: Object.values(ERROR_KINDS).reduce(
                    (acc, key) => ({ ...acc, [key]: 0 }),
                    {} as Record<string, number>
                ),
                severityDistribution: Object.values(ERROR_SEVERITY_enum).reduce(
                    (acc, key) => ({ ...acc, [key]: 0 }),
                    {} as Record<string, number>
                ),
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
                    recoverySuccessRate: 0,
                    strategyDistribution: Object.values(RecoveryStrategyType).reduce(
                        (acc, key) => ({ ...acc, [key]: 0 }),
                        {} as Record<string, number>
                    ),
                    failedRecoveries: 0
                },
                prevention: {
                    preventedCount: 0,
                    preventionRate: 0,
                    earlyWarnings: 0
                },
                trends: {
                    dailyRates: [],
                    weeklyRates: [],
                    monthlyRates: []
                }
            },
            resourceUtilization: this.getInitialResourceMetrics(),
            timestamp: Date.now()
        };
    }

    private getInitialUsageMetrics(): ITaskUsageMetrics {
        return {
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
                resetTime: 0
            },
            timestamp: Date.now()
        };
    }

    public cleanup(): void {
        this.metrics.clear();
    }
}
