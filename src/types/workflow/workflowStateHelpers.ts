/**
 * @file workflowStateHelpers.ts
 * @path src/types/workflow/workflowStateHelpers.ts
 * @description Helper functions for creating initial workflow state
 *
 * @module @types/workflow
 */

import type { IMetricEvent, IBaseMetrics } from '../metrics/base/metricTypes';
import { METRIC_DOMAIN_enum, METRIC_TYPE_enum } from '../metrics/base/metricEnums';
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

export interface IWorkflowMetricGroup {
    latency: IMetricEvent;
    throughput: IMetricEvent;
    cpu: IMetricEvent;
    memory: IMetricEvent;
    usage: IMetricEvent;
}

export const createInitialWorkflowMetrics = (workflowId: string): IWorkflowMetricGroup => {
    const timestamp = Date.now();

    return {
        latency: {
            timestamp,
            domain: METRIC_DOMAIN_enum.WORKFLOW,
            type: METRIC_TYPE_enum.LATENCY,
            value: 0,
            metadata: {
                workflowId,
                component: 'workflow',
                operation: 'execution'
            }
        },
        throughput: {
            timestamp,
            domain: METRIC_DOMAIN_enum.WORKFLOW,
            type: METRIC_TYPE_enum.THROUGHPUT,
            value: 0,
            metadata: {
                workflowId,
                component: 'workflow',
                operation: 'processing'
            }
        },
        cpu: {
            timestamp,
            domain: METRIC_DOMAIN_enum.WORKFLOW,
            type: METRIC_TYPE_enum.CPU,
            value: 0,
            metadata: {
                workflowId,
                component: 'workflow',
                operation: 'resource'
            }
        },
        memory: {
            timestamp,
            domain: METRIC_DOMAIN_enum.WORKFLOW,
            type: METRIC_TYPE_enum.MEMORY,
            value: 0,
            metadata: {
                workflowId,
                component: 'workflow',
                operation: 'resource'
            }
        },
        usage: {
            timestamp,
            domain: METRIC_DOMAIN_enum.WORKFLOW,
            type: METRIC_TYPE_enum.USAGE,
            value: 0,
            metadata: {
                workflowId,
                component: 'workflow',
                operation: 'execution',
                requests: 0,
                activeUsers: 0,
                requestsPerSecond: 0
            }
        }
    };
};

export const createInitialBaseMetrics = (workflowId: string): IBaseMetrics => ({
    startTime: Date.now(),
    success: true,
    duration: 0,
    metadata: {
        component: 'workflow',
        workflowId
    }
});
