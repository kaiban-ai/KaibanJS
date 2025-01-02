/**
 * @file workflowStateHelpers.ts
 * @path src/types/workflow/workflowStateHelpers.ts
 * @description Helper functions for creating initial workflow state
 *
 * @module @types/workflow
 */

import type { IUsageMetrics } from '../metrics/base/usageMetrics';
import type { IPerformanceMetrics } from '../metrics/base/performanceMetrics';
import type { IStandardCostDetails, ITokenCostBreakdown } from '../common/baseTypes';

// ─── Initial State Helpers ────────────────────────────────────────────────────
export const createInitialTokenCostBreakdown = (): ITokenCostBreakdown => ({
    count: 0,
    cost: 0
});

export const createInitialCostDetails = (): IStandardCostDetails => ({
    inputCost: 0,
    outputCost: 0,
    totalCost: 0,
    currency: 'USD',
    breakdown: {
        promptTokens: createInitialTokenCostBreakdown(),
        completionTokens: createInitialTokenCostBreakdown()
    }
});

export const createInitialUsageMetrics = (): IUsageMetrics => ({
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
        resetTime: Date.now()
    },
    timestamp: Date.now(),
    component: '',
    category: '',
    version: ''
});

export const createInitialPerformanceMetrics = (): IPerformanceMetrics => ({
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
});
