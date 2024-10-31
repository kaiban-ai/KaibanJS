/**
 * @file base.ts
 * @path src/types/workflow/base.ts
 * @description Core workflow interfaces and types
 *
 * @packageDocumentation
 * @module @types/workflow
 */

import { WORKFLOW_STATUS_enum } from "@/utils/core/enums";
import { WorkflowStats } from "../workflow/stats";

/**
 * Workflow error interface
 */
export interface WorkflowError {
    /** Error message */
    message: string;
    
    /** Error type */
    type: string;
    
    /** Error context */
    context?: Record<string, unknown>;
    
    /** Error timestamp */
    timestamp: number;
    
    /** Task ID if applicable */
    taskId?: string;
    
    /** Agent ID if applicable */
    agentId?: string;
}

/**
 * Successful workflow completion
 */
export interface WorkflowSuccess {
    /** Status must be FINISHED */
    status: Extract<keyof typeof WORKFLOW_STATUS_enum, 'FINISHED'>;
    
    /** Result data */
    result: unknown;
    
    /** Workflow statistics */
    metadata: WorkflowStats;
    
    /** Completion timestamp */
    completionTime: number;
}

/**
 * Blocked workflow state
 */
export interface WorkflowBlocked {
    /** Status must be BLOCKED */
    status: Extract<keyof typeof WORKFLOW_STATUS_enum, 'BLOCKED'>;
    
    /** List of blocked tasks */
    blockedTasks: {
        taskId: string;
        taskTitle: string;
        reason: string;
    }[];
    
    /** Workflow statistics */
    metadata: WorkflowStats;
}

/**
 * Stopped workflow state
 */
export interface WorkflowStopped {
    /** Status must be STOPPED or STOPPING */
    status: Extract<keyof typeof WORKFLOW_STATUS_enum, 'STOPPED' | 'STOPPING'>;
    
    /** Reason for stopping */
    reason: string;
    
    /** Workflow statistics */
    metadata: WorkflowStats;
    
    /** Stop timestamp */
    stoppedAt: number;
}

/**
 * Errored workflow state
 */
export interface WorkflowErrored {
    /** Status must be ERRORED */
    status: Extract<keyof typeof WORKFLOW_STATUS_enum, 'ERRORED'>;
    
    /** Error details */
    error: WorkflowError;
    
    /** Workflow statistics */
    metadata: WorkflowStats;
    
    /** Error timestamp */
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
 * Workflow metadata interface
 */
export interface WorkflowMetadata {
    /** Final result */
    result: string;
    
    /** Duration in seconds */
    duration: number;
    
    /** LLM usage statistics */
    llmUsageStats: any; // Reference LLMUsageStats from llm types
    
    /** Number of iterations */
    iterationCount: number;
    
    /** Cost details */
    costDetails: any; // Reference CostDetails from workflow/stats
    
    /** Team name */
    teamName: string;
    
    /** Task count */
    taskCount: number;
    
    /** Agent count */
    agentCount: number;
}

/**
 * Type guards for workflow results
 */
export const WorkflowTypeGuards = {
    isWorkflowSuccess: (result: WorkflowResult): result is WorkflowSuccess => {
        return result !== null && result.status === 'FINISHED';
    },

    isWorkflowBlocked: (result: WorkflowResult): result is WorkflowBlocked => {
        return result !== null && result.status === 'BLOCKED';
    },

    isWorkflowStopped: (result: WorkflowResult): result is WorkflowStopped => {
        return result !== null && (result.status === 'STOPPED' || result.status === 'STOPPING');
    },

    isWorkflowErrored: (result: WorkflowResult): result is WorkflowErrored => {
        return result !== null && result.status === 'ERRORED';
    }
};