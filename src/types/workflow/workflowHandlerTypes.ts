/**
 * @file workflowHandlerTypes.ts
 * @path KaibanJS/src/types/workflow/workflowHandlerTypes.ts
 * @description Workflow handler type definitions
 */

import type { IMetricEvent } from '../metrics/base/metricTypes';
import { METRIC_DOMAIN_enum, METRIC_TYPE_enum } from '../metrics/base/metricEnums';
import type { ICostDetails } from './workflowCostsTypes';
import type { IWorkflowMetricGroup } from './workflowStateHelpers';

export interface IWorkflowHandlerMetrics {
    readonly metrics: IWorkflowMetricGroup;
    readonly costDetails: ICostDetails;
    readonly llmMetrics: {
        readonly tokenUsage: IMetricEvent;
        readonly modelUsage: IMetricEvent;
    };
}

export const createEmptyHandlerMetrics = (workflowId: string): IWorkflowHandlerMetrics => {
    const timestamp = Date.now();

    return {
        metrics: {
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
        llmMetrics: {
            tokenUsage: {
                timestamp,
                domain: METRIC_DOMAIN_enum.LLM,
                type: METRIC_TYPE_enum.USAGE,
                value: 0,
                metadata: {
                    workflowId,
                    component: 'llm',
                    operation: 'tokens',
                    prompt: 0,
                    completion: 0,
                    total: 0
                }
            },
            modelUsage: {
                timestamp,
                domain: METRIC_DOMAIN_enum.LLM,
                type: METRIC_TYPE_enum.USAGE,
                value: 0,
                metadata: {
                    workflowId,
                    component: 'llm',
                    operation: 'models',
                    gpt4: 0,
                    gpt35: 0,
                    other: 0
                }
            }
        }
    };
};
