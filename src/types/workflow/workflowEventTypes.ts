import { IAgentType } from '../agent/agentBaseTypes';
import { ITaskType } from '../task/taskBaseTypes';
import { TASK_STATUS_enum } from '../common/commonEnums';
import { IBaseEvent } from '../common/commonEventTypes';
import { IBaseHandlerMetadata } from '../common/commonMetadataTypes';

/**
 * Workflow step event types
 */
export interface IWorkflowStepEvent extends IBaseEvent {
    type: 'start' | 'complete' | 'fail' | 'skip';
    stepId: string;
    agent?: IAgentType;
    result?: unknown;
    error?: Error;
    metadata: IBaseHandlerMetadata;
}

/**
 * Workflow control event types
 */
export interface IWorkflowControlEvent extends IBaseEvent {
    type: 'start' | 'pause' | 'resume' | 'stop' | 'reset';
    metadata: IBaseHandlerMetadata;
}

/**
 * Workflow agent event types
 */
export interface IWorkflowAgentEvent extends IBaseEvent {
    type: 'assign' | 'unassign';
    stepId: string;
    agent?: IAgentType;
    metadata: IBaseHandlerMetadata;
}

/**
 * Workflow task event types
 */
export interface IWorkflowTaskEvent extends IBaseEvent {
    type: 'add' | 'remove' | 'update';
    task: ITaskType;
    status?: keyof typeof TASK_STATUS_enum;
    metadata: IBaseHandlerMetadata;
}

/**
 * Combined workflow events interface
 */
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
