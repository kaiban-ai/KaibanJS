/**
 * @file workflowStateHelpers.ts
 * @path src/types/workflow/workflowStateHelpers.ts
 * @description Helper functions for creating initial workflow state
 *
 * @module @types/workflow
 */

import type { 
    IResourceMetrics, 
    IUsageMetrics, 
    IPerformanceMetrics,
    IStandardCostDetails,
    ITokenCostBreakdown
} from '../common/commonMetricTypes';

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

export const createInitialResourceMetrics = (): IResourceMetrics => ({
    cpuUsage: 0,
    memoryUsage: 0,
    diskIO: {
        read: 0,
        write: 0
    },
    networkUsage: {
        upload: 0,
        download: 0
    },
    timestamp: Date.now()
});

export const createInitialUsageMetrics = (): IUsageMetrics => ({
    totalOperations: 0,
    successRate: 0,
    averageDuration: 0,
    costDetails: createInitialCostDetails(),
    timestamp: Date.now()
});

export const createInitialPerformanceMetrics = (): IPerformanceMetrics => ({
    executionTime: {
        total: 0,
        average: 0,
        min: 0,
        max: 0
    },
    throughput: {
        operationsPerSecond: 0,
        dataProcessedPerSecond: 0
    },
    errorMetrics: {
        totalErrors: 0,
        errorRate: 0
    },
    resourceUtilization: createInitialResourceMetrics(),
    timestamp: Date.now()
});
