/**
 * @file workflowManagerTypes.ts
 * @description Type definitions for WorkflowManager
 */

import { IHandlerResult } from '../common/baseTypes';
import { IAgentType } from '../agent/agentBaseTypes';
import { ITaskType } from '../task/taskBaseTypes';
import { IWorkflowState } from './workflowStateTypes';

export interface IWorkflowManager {
    getState(workflowId: string): IWorkflowState | undefined;
    startWorkflow(workflowId: string): Promise<IHandlerResult<void>>;
    pauseWorkflow(workflowId: string): Promise<IHandlerResult<void>>;
    resumeWorkflow(workflowId: string): Promise<IHandlerResult<void>>;
    stopWorkflow(workflowId: string): Promise<IHandlerResult<void>>;
    assignAgent(workflowId: string, stepId: string, agent: IAgentType): Promise<IHandlerResult<void>>;
    addTask(workflowId: string, task: ITaskType): Promise<IHandlerResult<void>>;
}
