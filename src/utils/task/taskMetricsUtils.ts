/**
 * @file taskMetricsUtils.ts
 * @description Utility functions for task metrics
 */

import type { ITaskMetrics } from '../../types/task/taskHandlerTypes';
import type { ILLMUsageMetrics } from '../../types/llm/llmMetricTypes';

export const createEmptyTaskMetrics = (): ITaskMetrics => {
    const emptyLLMMetrics: ILLMUsageMetrics = {
        component: 'TaskMetrics',
        category: 'llm',
        version: '1.0.0',
        totalRequests: 0,
        activeUsers: 0,
        activeInstances: 0,
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

    return {
        costs: {
            inputCost: 0,
            outputCost: 0,
            totalCost: 0,
            currency: 'USD',
            breakdown: {
                promptTokens: { count: 0, cost: 0 },
                completionTokens: { count: 0, cost: 0 }
            }
        },
        llmUsageMetrics: emptyLLMMetrics,
        resources: {
            cpuUsage: 0,
            memoryUsage: 0,
            diskIO: { read: 0, write: 0 },
            networkUsage: { upload: 0, download: 0 },
            timestamp: Date.now()
        },
        performance: {
            executionTime: {
                average: 0,
                min: 0,
                max: 0
            },
            latency: {
                average: 0,
                min: 0,
                max: 0
            },
            throughput: {
                requestsPerSecond: 0,
                bytesPerSecond: 0
            },
            responseTime: {
                average: 0,
                min: 0,
                max: 0
            },
            queueLength: 0,
            errorRate: 0,
            successRate: 1,
            resourceUtilization: {
                timestamp: Date.now(),
                cpuUsage: 0,
                memoryUsage: 0,
                diskIO: {
                    read: 0,
                    write: 0
                },
                networkUsage: {
                    upload: 0,
                    download: 0
                }
            },
            timestamp: Date.now()
        },
        usage: {
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
        },
        startTime: Date.now(),
        endTime: Date.now(),
        duration: 0,
        iterationCount: 0
    };
};
