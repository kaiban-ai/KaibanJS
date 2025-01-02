/**
* @file taskTrackingTypes.ts
* @path src/types/task/taskTrackingTypes.ts
* @description Task tracking and metrics type definitions
*
* @module @types/task
*/

import type { ILLMUsageMetrics } from '../llm/llmMetricTypes';
import type { TASK_STATUS_enum } from '../common/enumTypes';
import type { IStandardCostDetails } from '../common/baseTypes';
import type { ITaskType } from './taskBaseTypes';

// ─── Task Tracking Types ────────────────────────────────────────────────────────

export interface ITaskTrackingMetrics {
    task: ITaskType;
    status: keyof typeof TASK_STATUS_enum;
    costs: IStandardCostDetails;
    llmUsageMetrics: ILLMUsageMetrics;
    progress: {
        percentage: number;
        timeElapsed: number;
        estimatedTimeRemaining?: number;
        currentStep?: string;
        blockingReason?: string;
    };
}

// ─── Factory Functions ─────────────────────────────────────────────────────────

export const createEmptyTaskTrackingMetrics = (task: ITaskType): ITaskTrackingMetrics => ({
    task,
    status: 'PENDING',
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
    },
    progress: {
        percentage: 0,
        timeElapsed: 0
    }
});
