/**
 * @file workflowTaskTypes.ts
 * @description Workflow-specific task type definitions
 */

import type { ITaskType } from '../task/taskBaseTypes';

/**
 * Workflow task interface
 * Extends base task type with workflow-specific properties
 */
export interface IWorkflowTaskType extends ITaskType {
    // Workflow tracking
    workflowId: string;
    stepIndex: number;
}

/**
 * Type guard for workflow task
 */
export const isWorkflowTask = (task: ITaskType): task is IWorkflowTaskType => {
    const workflowTask = task as Partial<IWorkflowTaskType>;
    return (
        typeof workflowTask.workflowId === 'string' &&
        typeof workflowTask.stepIndex === 'number'
    );
};
