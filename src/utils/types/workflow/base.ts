/**
 * @file base.ts
 * @path KaibanJS/src/utils/types/workflow/base.ts
 * @description Workflow base types and interfaces
 */

import { WORKFLOW_STATUS_enum } from '../common';
import { ErrorType } from '../common';
import { WorkflowStats } from './stats';
import { CostDetails } from './costs';

// Workflow error state
export interface WorkflowError {
    message: string;
    type: string;
    context?: Record<string, unknown>;
    timestamp: number;
    taskId?: string;
}

// Workflow success state
export interface WorkflowSuccess {
    status: 'FINISHED';
    result: string;
    metadata: WorkflowStats;
    completionTime: number;
}

// Workflow blocked state
export interface WorkflowBlocked {
    status: 'BLOCKED';
    blockedTasks: Array<{
        taskId: string;
        taskTitle: string;
        reason: string;
    }>;
    metadata: WorkflowStats;
}

// Workflow errored state
export interface WorkflowErrored {
    status: 'ERRORED';
    error: WorkflowError;
    metadata: WorkflowStats;
    erroredAt: number;
}

// Workflow stopped state
export interface WorkflowStopped {
    status: 'STOPPED';
    reason: string;
    metadata: WorkflowStats;
    stoppedAt: number;
}

// Combined workflow result type
export type WorkflowResult = 
    | WorkflowSuccess
    | WorkflowBlocked
    | WorkflowErrored
    | WorkflowStopped
    | null;

// Workflow start result - Canonical location
export interface WorkflowStartResult {
    status: keyof typeof WORKFLOW_STATUS_enum;
    result: WorkflowResult;
    stats: WorkflowStats;
}

// Type guard utilities for workflow types
export const WorkflowTypeGuards = {
    isWorkflowError: (value: unknown): value is WorkflowError => {
        return (
            typeof value === 'object' &&
            value !== null &&
            'message' in value &&
            'type' in value &&
            'timestamp' in value
        );
    },
    
    isWorkflowResult: (value: unknown): value is WorkflowResult => {
        return (
            value === null ||
            (typeof value === 'object' &&
            value !== null &&
            'status' in value)
        );
    },
    
    isWorkflowStartResult: (value: unknown): value is WorkflowStartResult => {
        return (
            typeof value === 'object' &&
            value !== null &&
            'status' in value &&
            'result' in value &&
            'stats' in value
        );
    }
};