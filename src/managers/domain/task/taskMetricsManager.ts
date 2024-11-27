/**
 * @file taskMetricsManager.ts
 * @path src/managers/domain/task/taskMetricsManager.ts
 * @description Task metrics management implementation
 *
 * @module @managers/domain/task
 */

import { CoreManager } from '../../core/coreManager';
import { createError } from '../../../types/common/commonErrorTypes';
import { MetricDomain, MetricType } from '../../../types/metrics/base/metricsManagerTypes';

import type { ITaskMetrics } from '../../../types/task/taskBaseTypes';
import type { 
    ITaskResourceMetrics,
    ITaskPerformanceMetrics,
    ITaskUsageMetrics 
} from '../../../types/task/taskMetricTypes';
import type { IStandardCostDetails } from '../../../types/common/commonMetricTypes';

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
            llmUsage: {
                inputTokens: 0,
                outputTokens: 0,
                callsCount: 0,
                callsErrorCount: 0,
                parsingErrors: 0,
                totalLatency: 0,
                averageLatency: 0,
                lastUsed: Date.now(),
                memoryUtilization: {
                    peakMemoryUsage: 0,
                    averageMemoryUsage: 0,
                    cleanupEvents: 0
                },
                costBreakdown: {
                    input: 0,
                    output: 0,
                    total: 0,
                    currency: 'USD'
                }
            }
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
            llmUsage: {
                ...currentMetrics.llmUsage,
                ...updates.llmUsage
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

    public cleanup(): void {
        this.metrics.clear();
    }
}
