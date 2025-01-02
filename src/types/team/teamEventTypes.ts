/**
 * @file teamEventTypes.ts
 * @path src/types/team/teamEventTypes.ts
 * @description Team event type definitions
 */

import { v4 as uuidv4 } from 'uuid';
import type { ITeamHandlerMetadata } from './teamBaseTypes';
import type { IWorkflowResult } from '../workflow/workflowBaseTypes';
import type { IErrorMetadata } from '../common/metadataTypes';
import type { IBaseEvent } from '../common/baseTypes';

// Event type enum
export enum TeamEventType {
    WORKFLOW_START = 'team:workflow:start',
    WORKFLOW_STOP = 'team:workflow:stop',
    WORKFLOW_ERROR = 'team:workflow:error',
    AGENT_STATUS_CHANGE = 'team:agent:status',
    AGENT_ERROR = 'team:agent:error',
    TASK_STATUS_CHANGE = 'team:task:status',
    TASK_ERROR = 'team:task:error',
    TASK_BLOCKED = 'team:task:blocked',
    FEEDBACK_PROVIDED = 'team:feedback:provided'
}

// Base team event interface
export interface TeamEvent extends IBaseEvent {
    id: string;
    type: TeamEventType;
    metadata: ITeamHandlerMetadata;
}

// Event creation helper
function createBaseEvent<T extends TeamEventType>(
    type: T,
    metadata: ITeamHandlerMetadata
): Omit<TeamEvent & { type: T }, 'payload'> {
    return {
        id: uuidv4(),
        type,
        timestamp: Date.now(),
        metadata
    };
}

// Workflow events
export interface IWorkflowStartEvent extends TeamEvent {
    type: TeamEventType.WORKFLOW_START;
    payload: {
        workflowId: string;
        config: Record<string, unknown>;
    };
}

export interface IWorkflowStopEvent extends TeamEvent {
    type: TeamEventType.WORKFLOW_STOP;
    payload: {
        workflowId: string;
        result: IWorkflowResult;
    };
}

export interface IWorkflowErrorEvent extends TeamEvent {
    type: TeamEventType.WORKFLOW_ERROR;
    payload: {
        workflowId: string;
        error: IErrorMetadata;
    };
}

// Agent events
export interface IAgentStatusChangeEvent extends TeamEvent {
    type: TeamEventType.AGENT_STATUS_CHANGE;
    payload: {
        agentId: string;
        previousStatus: string;
        newStatus: string;
        timestamp: number;
    };
}

export interface IAgentErrorEvent extends TeamEvent {
    type: TeamEventType.AGENT_ERROR;
    payload: {
        agentId: string;
        error: IErrorMetadata;
    };
}

// Task events
export interface ITaskStatusChangeEvent extends TeamEvent {
    type: TeamEventType.TASK_STATUS_CHANGE;
    payload: {
        taskId: string;
        previousStatus: string;
        newStatus: string;
        timestamp: number;
    };
}

export interface ITaskErrorEvent extends TeamEvent {
    type: TeamEventType.TASK_ERROR;
    payload: {
        taskId: string;
        error: IErrorMetadata;
    };
}

export interface ITaskBlockedEvent extends TeamEvent {
    type: TeamEventType.TASK_BLOCKED;
    payload: {
        taskId: string;
        reason: string;
    };
}

// Feedback events
export interface IFeedbackProvidedEvent extends TeamEvent {
    type: TeamEventType.FEEDBACK_PROVIDED;
    payload: {
        feedbackId: string;
        targetId: string;
        targetType: 'agent' | 'task' | 'workflow';
        content: string;
        rating?: number;
        timestamp: number;
    };
}

// Event creation helpers
export const createWorkflowStartEvent = (
    metadata: ITeamHandlerMetadata,
    config: Record<string, unknown>
): IWorkflowStartEvent => ({
    ...createBaseEvent(TeamEventType.WORKFLOW_START, metadata),
    payload: { workflowId: uuidv4(), config }
});

export const createWorkflowStopEvent = (
    metadata: ITeamHandlerMetadata,
    workflowId: string,
    result: IWorkflowResult
): IWorkflowStopEvent => ({
    ...createBaseEvent(TeamEventType.WORKFLOW_STOP, metadata),
    payload: { workflowId, result }
});

export const createWorkflowErrorEvent = (
    metadata: ITeamHandlerMetadata,
    workflowId: string,
    error: IErrorMetadata
): IWorkflowErrorEvent => ({
    ...createBaseEvent(TeamEventType.WORKFLOW_ERROR, metadata),
    payload: { workflowId, error }
});

export const createAgentStatusChangeEvent = (
    metadata: ITeamHandlerMetadata,
    agentId: string,
    previousStatus: string,
    newStatus: string
): IAgentStatusChangeEvent => ({
    ...createBaseEvent(TeamEventType.AGENT_STATUS_CHANGE, metadata),
    payload: { agentId, previousStatus, newStatus, timestamp: Date.now() }
});

export const createAgentErrorEvent = (
    metadata: ITeamHandlerMetadata,
    agentId: string,
    error: IErrorMetadata
): IAgentErrorEvent => ({
    ...createBaseEvent(TeamEventType.AGENT_ERROR, metadata),
    payload: { agentId, error }
});

export const createTaskStatusChangeEvent = (
    metadata: ITeamHandlerMetadata,
    taskId: string,
    previousStatus: string,
    newStatus: string
): ITaskStatusChangeEvent => ({
    ...createBaseEvent(TeamEventType.TASK_STATUS_CHANGE, metadata),
    payload: { taskId, previousStatus, newStatus, timestamp: Date.now() }
});

export const createTaskErrorEvent = (
    metadata: ITeamHandlerMetadata,
    taskId: string,
    error: IErrorMetadata
): ITaskErrorEvent => ({
    ...createBaseEvent(TeamEventType.TASK_ERROR, metadata),
    payload: { taskId, error }
});

export const createTaskBlockedEvent = (
    metadata: ITeamHandlerMetadata,
    taskId: string,
    reason: string
): ITaskBlockedEvent => ({
    ...createBaseEvent(TeamEventType.TASK_BLOCKED, metadata),
    payload: { taskId, reason }
});

export const createFeedbackProvidedEvent = (
    metadata: ITeamHandlerMetadata,
    targetId: string,
    targetType: 'agent' | 'task' | 'workflow',
    content: string,
    rating?: number
): IFeedbackProvidedEvent => ({
    ...createBaseEvent(TeamEventType.FEEDBACK_PROVIDED, metadata),
    payload: {
        feedbackId: uuidv4(),
        targetId,
        targetType,
        content,
        rating,
        timestamp: Date.now()
    }
});

// Union type of all team events
export type TeamEventUnion =
    | IWorkflowStartEvent
    | IWorkflowStopEvent
    | IWorkflowErrorEvent
    | IAgentStatusChangeEvent
    | IAgentErrorEvent
    | ITaskStatusChangeEvent
    | ITaskErrorEvent
    | ITaskBlockedEvent
    | IFeedbackProvidedEvent;
