/**
 * @file taskTrackingTypes.ts
 * @path KaibanJS/src/types/task/taskTrackingTypes.ts
 * @description Task tracking type definitions
 */

import type { ILLMUsageMetrics } from '../llm/llmMetricTypes';
import type { TASK_STATUS_enum } from '../common/commonEnums';
import type { IStandardCostDetails } from '../common/commonMetricTypes';
import type { ITaskType } from './taskBaseTypes';

/**
 * Task tracking metrics interface
 */
export interface ITaskTrackingMetrics {
    /** Task reference */
    task: ITaskType;
    /** Task status */
    status: keyof typeof TASK_STATUS_enum;
    /** Cost-related metrics */
    costs: IStandardCostDetails;
    /** LLM usage metrics */
    llmUsageMetrics: ILLMUsageMetrics;
    /** Progress tracking */
    progress: {
        /** Current progress percentage (0-100) */
        percentage: number;
        /** Time elapsed in milliseconds */
        timeElapsed: number;
        /** Estimated time remaining in milliseconds */
        estimatedTimeRemaining?: number;
        /** Current execution step */
        currentStep?: string;
        /** Reason for blocking if status is BLOCKED */
        blockingReason?: string;
    };
}

/**
 * Create empty task tracking metrics
 */
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
    },
    progress: {
        percentage: 0,
        timeElapsed: 0
    }
});
