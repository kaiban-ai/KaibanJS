/**
 * @file workflowMetadataTypes.ts
 * @path KaibanJS/src/types/workflow/workflowMetadataTypes.ts
 * @description Workflow metadata type definitions
 */

import { ILLMUsageMetrics } from '../llm/llmMetricTypes';
import { ICostDetails } from './workflowCostsTypes';

export interface IWorkflowMetadata {
    costDetails: ICostDetails;
    llmUsageMetrics: ILLMUsageMetrics;
    teamName: string;
}

export const isWorkflowMetadata = (workflowMeta: unknown): workflowMeta is IWorkflowMetadata => {
    return (
        typeof workflowMeta === 'object' &&
        workflowMeta !== null &&
        'costDetails' in workflowMeta &&
        'llmUsageMetrics' in workflowMeta &&
        'teamName' in workflowMeta &&
        workflowMeta.costDetails !== undefined &&
        workflowMeta.llmUsageMetrics !== undefined &&
        typeof workflowMeta.teamName === 'string'
    );
};

export const createEmptyWorkflowMetadata = (teamName: string): IWorkflowMetadata => ({
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
        activeUsers: 0, // From IUsageMetrics
        activeInstances: 0, // From ILLMUsageMetrics
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
    teamName
});
