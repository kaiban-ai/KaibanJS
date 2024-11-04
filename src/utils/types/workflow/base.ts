/**
 * @file base.ts
 * @path src/types/workflow/base.ts
 * @description Core workflow interfaces and types
 */

import { WORKFLOW_STATUS_enum } from "@/utils/types/common/enums";
import { LLMUsageStats } from "../llm/responses";
import { CostDetails } from "./stats";
import { WorkflowMetadata, isCompleteMetadata, createDefaultMetadata } from "./metadata";
import { WorkflowState, WorkflowEvent } from '../store/workflow';

/**
 * Workflow error interface
 */
export interface WorkflowError {
    message: string;
    type: string;
    context?: Record<string, unknown>;
    timestamp: number;
    taskId?: string;
    agentId?: string;
}

/**
 * Model usage statistics
 */
export interface ModelUsageStats {
    callsCount: number;
    callsErrorCount: number;
    modelName: string;
    provider?: string;
    usageStats: Partial<LLMUsageStats>;
}

/**
 * Workflow statistics interface
 */
export interface WorkflowStats {
    startTime: number;
    endTime: number;
    duration: number;
    llmUsageStats: LLMUsageStats;
    iterationCount: number;
    costDetails: CostDetails;
    taskCount: number;
    agentCount: number;
    teamName: string;
    messageCount: number;
    modelUsage: Record<string, ModelUsageStats>;
    error?: WorkflowError;
}

/**
 * Successful workflow completion
 */
export interface WorkflowSuccess {
    status: Extract<keyof typeof WORKFLOW_STATUS_enum, 'FINISHED'>;
    result: unknown;
    metadata: WorkflowMetadata;
    completionTime: number;
}

/**
 * Blocked workflow state
 */
export interface WorkflowBlocked {
    status: Extract<keyof typeof WORKFLOW_STATUS_enum, 'BLOCKED'>;
    blockedTasks: {
        taskId: string;
        taskTitle: string;
        reason: string;
    }[];
    metadata: WorkflowMetadata;
}

/**
 * Stopped workflow state
 */
export interface WorkflowStopped {
    status: Extract<keyof typeof WORKFLOW_STATUS_enum, 'STOPPED' | 'STOPPING'>;
    reason: string;
    metadata: WorkflowMetadata;
    stoppedAt: number;
}

/**
 * Errored workflow state
 */
export interface WorkflowErrored {
    status: Extract<keyof typeof WORKFLOW_STATUS_enum, 'ERRORED'>;
    error: WorkflowError;
    metadata: WorkflowMetadata;
    erroredAt: number;
}

/**
 * Union type for workflow result
 */
export type WorkflowResult = 
    | WorkflowSuccess 
    | WorkflowBlocked 
    | WorkflowStopped 
    | WorkflowErrored 
    | null;

/**
 * Type guard to check if a result has valid metadata
 */
function isWorkflowWithMetadata(result: WorkflowResult): result is WorkflowSuccess | WorkflowBlocked | WorkflowStopped | WorkflowErrored {
    return result !== null && 'metadata' in result;
}

/**
 * Consolidated type guards for workflows
 */
export const WorkflowTypeGuards = {
    /**
     * Result-related type guards
     */
    isSuccess: (result: WorkflowResult): result is WorkflowSuccess => {
        return result !== null && result.status === 'FINISHED';
    },

    isBlocked: (result: WorkflowResult): result is WorkflowBlocked => {
        return result !== null && result.status === 'BLOCKED';
    },

    isStopped: (result: WorkflowResult): result is WorkflowStopped => {
        return result !== null && (result.status === 'STOPPED' || result.status === 'STOPPING');
    },

    isErrored: (result: WorkflowResult): result is WorkflowErrored => {
        return result !== null && result.status === 'ERRORED';
    },

    hasMetadata: isWorkflowWithMetadata,
    isCompleteMetadata,

    /**
     * Model usage type guard
     */
    isValidModelUsage: (usage: unknown): usage is ModelUsageStats => {
        if (typeof usage !== 'object' || usage === null) return false;
        const modelUsage = usage as Partial<ModelUsageStats>;
        return (
            typeof modelUsage.callsCount === 'number' &&
            typeof modelUsage.callsErrorCount === 'number' &&
            typeof modelUsage.modelName === 'string'
        );
    },

    /**
     * Store-related type guards
     */
    isWorkflowState: (value: unknown): value is WorkflowState => {
        return (
            typeof value === 'object' &&
            value !== null &&
            'runtime' in value &&
            'stats' in value &&
            'progress' in value &&
            'context' in value &&
            'env' in value
        );
    },

    isWorkflowEvent: (value: unknown): value is WorkflowEvent => {
        if (typeof value !== 'object' || value === null) return false;
        const event = value as Partial<WorkflowEvent>;
        return (
            typeof event.type === 'string' &&
            (event.type.includes('workflow.') ||
            event.type.includes('task.') ||
            event.type.includes('agent.')) &&
            typeof event.timestamp === 'number' &&
            typeof event.data === 'object'
        );
    }
} as const;

// Re-export metadata utilities
export { createDefaultMetadata };