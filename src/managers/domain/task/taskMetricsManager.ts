/**
 * @file taskMetricsManager.ts
 * @path src/managers/domain/task/taskMetricsManager.ts
 * @description Task metrics management implementation
 */

import { CoreManager } from '../../core/coreManager';
import { createError } from '../../../types/common/commonErrorTypes';
import { MetricDomain, MetricType } from '../../../types/metrics/base/metricsManagerTypes';

import type { ITaskMetrics } from '../../../types/task/taskHandlerTypes';
import type { 
    ITaskResourceMetrics,
    ITaskPerformanceMetrics,
    ITaskUsageMetrics 
} from '../../../types/task/taskMetricTypes';
import type { IStandardCostDetails } from '../../../types/common/commonMetricTypes';
import type { ILLMUsageMetrics } from '../../../types/llm/llmMetricTypes';

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_COST_METRICS: IStandardCostDetails = {
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
    requestsPerSecond: 0,
    averageResponseLength: 0,
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
                errorRate: 0
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
