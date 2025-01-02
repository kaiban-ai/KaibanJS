/**
 * @file workflowEventTypes.ts
 * @description Workflow event type definitions
 */

import { IAgentType } from '../agent/agentBaseTypes';
import { ITaskType } from '../task/taskBaseTypes';
import { TASK_STATUS_enum } from '../common/enumTypes';
import { IBaseEvent, IBaseHandlerMetadata } from '../common/baseTypes';
import { IBaseError } from '../common/errorTypes';

/**
 * Base workflow event interface
 */
export interface IWorkflowEventBase extends IBaseEvent {
    id: string;
    workflowId: string;
    timestamp: number;
    metadata: IBaseHandlerMetadata;
}

/**
 * Workflow step event types
 */
export interface IWorkflowStepEvent extends IWorkflowEventBase {
    type: 'start' | 'complete' | 'fail' | 'skip';
    stepId: string;
    agent?: IAgentType;
    result?: unknown;
    error?: Error;
}

/**
 * Workflow control event types
 */
export interface IWorkflowControlEvent extends IWorkflowEventBase {
    type: 'start' | 'pause' | 'resume' | 'stop' | 'reset' | 'workflow_control' | 'workflow_error';
    error?: IBaseError;
}

/**
 * Workflow agent event types
 */
export interface IWorkflowAgentEvent extends IWorkflowEventBase {
    type: 'assign' | 'unassign';
    stepId: string;
    agent?: IAgentType;
}

/**
 * Workflow task event types
 */
export interface IWorkflowTaskEvent extends IWorkflowEventBase {
    type: 'add' | 'remove' | 'update';
    task: ITaskType;
    status?: keyof typeof TASK_STATUS_enum;
}

/**
 * Combined workflow events interface
 */
/** @deprecated Use error metrics instead of recovery events */
export interface IWorkflowEvents {
    'workflow:step': IWorkflowStepEvent;
    'workflow:control': IWorkflowControlEvent;
    'workflow:agent': IWorkflowAgentEvent;
    'workflow:task': IWorkflowTaskEvent;
}

/**
 * Union type of all workflow event types
 */
export type WorkflowEventType = 
    | IWorkflowStepEvent
    | IWorkflowControlEvent
    | IWorkflowAgentEvent
    | IWorkflowTaskEvent;

/**
 * Event emission parameter types
 * These types match what the emitter expects in its emit methods
 */
export type WorkflowControlEventParams = {
    type: IWorkflowControlEvent['type'];
    workflowId: string;
    error?: IBaseError;
};

export type WorkflowStepEventParams = {
    type: IWorkflowStepEvent['type'];
    workflowId: string;
    stepId: string;
    agent?: IAgentType;
    result?: unknown;
    error?: Error;
};

export type WorkflowAgentEventParams = {
    type: IWorkflowAgentEvent['type'];
    workflowId: string;
    stepId: string;
    agent?: IAgentType;
};

export type WorkflowTaskEventParams = {
    type: IWorkflowTaskEvent['type'];
    workflowId: string;
    task: ITaskType;
    status?: keyof typeof TASK_STATUS_enum;
};
