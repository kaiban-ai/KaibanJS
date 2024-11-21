/**
 * @file workflowBaseTypes.ts
 * @path KaibanJS/src/types/workflow/workflowBaseTypes.ts
 * @description Workflow base types and interfaces for managing workflow states and results
 *
 * @module types/workflow
 */

import { WORKFLOW_STATUS_enum } from '../common/commonEnums';
import { IErrorType } from '../common/commonErrorTypes';
import { IWorkflowStats } from './workflowStatsTypes';
import { ICostDetails } from './workflowCostsTypes';

// ─── Workflow Error Types ─────────────────────────────────────────────────────

/**
 * Workflow error state
 */
export interface IWorkflowError {
    message: string;
    type: string;
    context?: Record<string, unknown>;
    timestamp: number;
    taskId?: string;
}

/**
 * Workflow success state
 */
export interface IWorkflowSuccess {
    status: typeof WORKFLOW_STATUS_enum.FINISHED;
    result: string;
    metadata: IWorkflowStats;
    completionTime: number;
}

/**
 * Workflow blocked state
 */
export interface IWorkflowBlocked {
    status: 'BLOCKED';
    blockedTasks: Array<{
        taskId: string;
        taskTitle: string;
        reason: string;
    }>;
    metadata: IWorkflowStats;
}

/**
 * Workflow errored state
 */
export interface IWorkflowErrored {
    status: 'ERRORED';
    error: IWorkflowError;
    metadata: IWorkflowStats;
    erroredAt: number;
}

/**
 * Workflow stopped state
 */
export interface IWorkflowStopped {
    status: 'STOPPED';
    reason: string;
    metadata: IWorkflowStats;
    stoppedAt: number;
}

/**
 * Combined workflow result type
 */
export type IWorkflowResult = 
    | IWorkflowSuccess
    | IWorkflowBlocked
    | IWorkflowErrored
    | IWorkflowStopped
    | null;

/**
 * Workflow start result
 */
export interface IWorkflowStartResult {
    status: keyof typeof WORKFLOW_STATUS_enum;
    result: IWorkflowResult;
    stats: IWorkflowStats;
}

// ─── Type Guards ────────────────────────────────────────────────────────────

export const IWorkflowTypeGuards = {
    isWorkflowError: (value: unknown): value is IWorkflowError => {
        return (
            typeof value === 'object' &&
            value !== null &&
            'message' in value &&
            'type' in value &&
            'timestamp' in value
        );
    },
    
    isWorkflowResult: (value: unknown): value is IWorkflowResult => {
        return (
            value === null ||
            (typeof value === 'object' &&
            value !== null &&
            'status' in value)
        );
    },
    
    isWorkflowStartResult: (value: unknown): value is IWorkflowStartResult => {
        return (
            typeof value === 'object' &&
            value !== null &&
            'status' in value &&
            'result' in value &&
            'stats' in value
        );
    }
};
