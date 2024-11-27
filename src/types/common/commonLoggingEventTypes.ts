/**
* @file commonLoggingEventTypes.ts
* @path src/types/common/commonLoggingEventTypes.ts
* @description Common logging event type definitions
*
* @module @types/common
*/

import type { IBaseEvent } from './commonEventTypes';
import type { 
    ILog,
    ITaskLogMetadata,
    IWorkflowLogMetadata,
    IAgentLogMetadata
} from '../team/teamLogsTypes';

// ─── Log Event Types ─────────────────────────────────────────────────────────

export enum LOG_EVENT_TYPE {
    LOG_CREATED = 'log.created',
    LOG_UPDATED = 'log.updated',
    LOG_CLEARED = 'log.cleared',
    TASK_LOG_ADDED = 'log.task.added',
    WORKFLOW_LOG_ADDED = 'log.workflow.added',
    AGENT_LOG_ADDED = 'log.agent.added'
}

// ─── Log Event Interfaces ─────────────────────────────────────────────────────

export interface ILogCreatedEvent extends IBaseEvent {
    type: LOG_EVENT_TYPE.LOG_CREATED;
    log: ILog;
}

export interface ILogUpdatedEvent extends IBaseEvent {
    type: LOG_EVENT_TYPE.LOG_UPDATED;
    previousLog: ILog;
    newLog: ILog;
}

export interface ILogClearedEvent extends IBaseEvent {
    type: LOG_EVENT_TYPE.LOG_CLEARED;
}

export interface ITaskLogAddedEvent extends IBaseEvent {
    type: LOG_EVENT_TYPE.TASK_LOG_ADDED;
    log: ILog;
    taskId: string;
    metadata: ITaskLogMetadata;
}

export interface IWorkflowLogAddedEvent extends IBaseEvent {
    type: LOG_EVENT_TYPE.WORKFLOW_LOG_ADDED;
    log: ILog;
    workflowId: string;
    metadata: IWorkflowLogMetadata;
}

export interface IAgentLogAddedEvent extends IBaseEvent {
    type: LOG_EVENT_TYPE.AGENT_LOG_ADDED;
    log: ILog;
    agentId: string;
    metadata: IAgentLogMetadata;
}

// ─── Log Event Union Type ──────────────────────────────────────────────────────

export type LogEvent =
    | ILogCreatedEvent
    | ILogUpdatedEvent
    | ILogClearedEvent
    | ITaskLogAddedEvent
    | IWorkflowLogAddedEvent
    | IAgentLogAddedEvent;

// ─── Log Event Handler Types ───────────────────────────────────────────────────

export interface ILogEventHandler {
    onLogCreated(event: ILogCreatedEvent): Promise<void>;
    onLogUpdated(event: ILogUpdatedEvent): Promise<void>;
    onLogCleared(event: ILogClearedEvent): Promise<void>;
    onTaskLogAdded(event: ITaskLogAddedEvent): Promise<void>;
    onWorkflowLogAdded(event: IWorkflowLogAddedEvent): Promise<void>;
    onAgentLogAdded(event: IAgentLogAddedEvent): Promise<void>;
}
