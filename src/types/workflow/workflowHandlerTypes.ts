/**
 * @file workflowHandlerTypes.ts
 * @path KaibanJS/src/types/workflow/workflowHandlerTypes.ts
 * @description Workflow handler type definitions
 */

import type { ILLMUsageMetrics } from '../llm/llmMetricTypes';
import type { IPerformanceMetrics } from '../metrics/base/performanceMetrics';
import type { ICostDetails } from './workflowCostsTypes';

export interface IWorkflowHandlerMetrics {
    readonly performance: IPerformanceMetrics;
    readonly costDetails: ICostDetails;
    readonly llmUsageMetrics: ILLMUsageMetrics;
}

export const createEmptyHandlerMetrics = (): IWorkflowHandlerMetrics => ({
    performance: {
        responseTime: {
            average: 0,
            min: 0,
            max: 0
        },
        throughput: {
            requestsPerSecond: 0,
            bytesPerSecond: 0
        },
        timestamp: Date.now(),
        component: '',
        category: '',
        version: ''
    },
    costDetails: {
        inputCost: 0,
        outputCost: 0,
        totalCost: 0,
        currency: 'USD',
        breakdown: {
            promptTokens: { count: 0, cost: 0 },
            completionTokens: { count: 0, cost: 0 }
        }
    },
    llmUsageMetrics: {
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
        timestamp: Date.now(),
        component: '',
        category: '',
        version: ''
    }
});
