/**
 * @file metadata.ts
 * @path src/types/workflow/metadata.ts
 * @description Workflow metadata type definitions
 */

import { LLMUsageStats } from '../llm/responses';
import { CostDetails } from './stats';

/**
 * Required workflow metadata interface
 */
export interface RequiredWorkflowMetadata {
    duration: number;
    taskCount: number;
    agentCount: number;
    costDetails: CostDetails;
    llmUsageStats: LLMUsageStats;
}

/**
 * Optional workflow metadata interface
 */
export interface OptionalWorkflowMetadata {
    result?: string;
    startTime?: number;
    endTime?: number;
    messageCount?: number;
    iterationCount?: number;
}

/**
 * Complete workflow metadata interface
 */
export interface WorkflowMetadata extends RequiredWorkflowMetadata, OptionalWorkflowMetadata {
    // Add any additional fields here
}

/**
 * Type guard to check if metadata is complete
 */
export function isCompleteMetadata(metadata: Partial<WorkflowMetadata>): metadata is WorkflowMetadata {
    return (
        typeof metadata.duration === 'number' &&
        typeof metadata.taskCount === 'number' &&
        typeof metadata.agentCount === 'number' &&
        metadata.costDetails !== undefined &&
        metadata.llmUsageStats !== undefined
    );
}

/**
 * Create default metadata with required fields
 */
export function createDefaultMetadata(): WorkflowMetadata {
    return {
        duration: 0,
        taskCount: 0,
        agentCount: 0,
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
        llmUsageStats: {
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
}