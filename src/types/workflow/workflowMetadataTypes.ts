/**
 * @file workflowMetadataTypes.ts
 * @path KaibanJS/src/types/workflow/workflowMetadataTypes.ts
 * @description Workflow metadata type definitions
 * 
 * @module types/workflow
*/

import { IBaseHandlerMetadata } from '../common/commonMetadataTypes';
import { ILLMUsageStats } from '../llm/llmResponseTypes';
import { ICostDetails } from './workflowCostsTypes';

/**
 * Workflow metadata interface - Canonical definition
 */
export interface IWorkflowMetadata extends IBaseHandlerMetadata {
    workflow: {
        performance: {
            startTime: number;
            endTime: number;
            duration: number;
            memoryUsage: number;
        };
        debugInfo: {
            lastCheckpoint: string;
            warnings: string[];
        };
        priority: number;
        retryCount: number;
        taskCount: number;
        agentCount: number;
        costDetails: ICostDetails;
        llmUsageStats: ILLMUsageStats;
        teamName: string;
        messageCount?: number;
        iterationCount?: number;
    };
}

// ─── Type Guards ────────────────────────────────────────────────────────────────

/**
 * Type guard to check if metadata is complete
 */
export function isWorkflowMetadata(metadata: unknown): metadata is IWorkflowMetadata {
    if (!metadata || typeof metadata !== 'object') return false;
    
    const workflowMeta = (metadata as IWorkflowMetadata).workflow;
    if (!workflowMeta) return false;

    return (
        typeof workflowMeta.performance === 'object' &&
        typeof workflowMeta.debugInfo === 'object' &&
        typeof workflowMeta.priority === 'number' &&
        typeof workflowMeta.retryCount === 'number' &&
        typeof workflowMeta.taskCount === 'number' &&
        typeof workflowMeta.agentCount === 'number' &&
        typeof workflowMeta.teamName === 'string' &&
        workflowMeta.costDetails !== undefined &&
        workflowMeta.llmUsageStats !== undefined
    );
}

// ─── Factory Functions ─────────────────────────────────────────────────────────

/**
 * Create default workflow metadata
 */
export function createDefaultWorkflowMetadata(
    component: string,
    operation: string,
    teamName: string
): IWorkflowMetadata {
    return {
        timestamp: Date.now(),
        component,
        operation,
        performance: {
            startTime: Date.now(),
            endTime: 0,
            duration: 0,
            memoryUsage: process.memoryUsage().heapUsed
        },
        workflow: {
            performance: {
                startTime: Date.now(),
                endTime: 0,
                duration: 0,
                memoryUsage: process.memoryUsage().heapUsed
            },
            debugInfo: {
                lastCheckpoint: operation,
                warnings: []
            },
            priority: 1,
            retryCount: 0,
            taskCount: 0,
            agentCount: 0,
            teamName,
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
        }
    };
}
