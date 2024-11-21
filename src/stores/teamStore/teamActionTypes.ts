/**
 * @file teamActionTypes.ts
 * @path src/stores/teamStore/teamActionTypes.ts
 * @description Team store action types
 */

import { ITeamState } from '../../types/team/teamBaseTypes';
import { IHandlerResult } from '../../types/common/commonHandlerTypes';
import { ITaskType } from '../../types/task/taskBaseTypes';
import { IAgentType } from '../../types/agent/agentBaseTypes';
import { IErrorType } from '../../types/common/commonErrorTypes';

export interface ITeamActions {
    setState: (fn: (state: ITeamState) => Partial<ITeamState>) => void;
    getState: () => ITeamState;
    subscribe: (listener: (state: ITeamState) => void) => () => void;
    destroy: () => void;
}

export interface ITeamWorkflowActions {
    startWorkflow: (inputs?: Record<string, unknown>) => Promise<IHandlerResult>;
    stopWorkflow: (reason?: string) => Promise<void>;
    handleWorkflowError: (params: {
        task?: ITaskType;
        error: IErrorType;
        context?: Record<string, unknown>;
    }) => Promise<void>;
}

export interface ITeamTaskActions {
    handleTaskStatusChange: (
        taskId: string,
        status: string,
        metadata?: Record<string, unknown>
    ) => Promise<void>;
    handleTaskError: (
        task: ITaskType,
        error: IErrorType,
        context?: Record<string, unknown>
    ) => Promise<void>;
    handleTaskBlocked: (
        taskId: string,
        reason: string
    ) => Promise<void>;
}

export interface ITeamAgentActions {
    handleAgentStatusChange: (
        agent: IAgentType,
        status: string,
        task?: ITaskType
    ) => Promise<void>;
    handleAgentError: (params: {
        agent: IAgentType;
        task: ITaskType;
        error: IErrorType;
        context?: Record<string, unknown>;
    }) => Promise<IHandlerResult>;
}

export interface ITeamResourceActions {
    handleResourceTracking: (
        task: ITaskType,
        modelUsage: Record<string, number>,
        costDetails: Record<string, number>
    ) => Promise<void>;
}
