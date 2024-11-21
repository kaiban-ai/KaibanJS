/**
 * @file teamBaseTypes.ts
 * @path KaibanJS/src/types/team/teamBaseTypes.ts
 * @description Core team state and interface definitions
 *
 * @module @types/team
 */

import type { IBaseStoreState, IBaseStoreMethods } from '../store/baseStoreTypes';
import type { WORKFLOW_STATUS_enum } from '../common/commonEnums';
import type { IResourceMetrics, IUsageMetrics } from '../common/commonMetricTypes';
import type { IAgentType } from '../agent/agentBaseTypes';
import type { ITaskType } from '../task/taskBaseTypes';
import type { IWorkflowResult } from '../workflow/workflowBaseTypes';
import type { IWorkflowStats } from '../workflow/workflowStatsTypes';
import type { IHandlerResult } from '../common/commonHandlerTypes';
import type { ILog } from './teamLogsTypes';

// ─── Core Team State ──────────────────────────────────────────────────────────

export interface ITeamState extends IBaseStoreState {
    teamWorkflowStatus: keyof typeof WORKFLOW_STATUS_enum;
    workflowContext: string;
    inputs: ITeamInputs;
    env: Record<string, unknown>;
    tasksInitialized: boolean;
}

// ─── Team Configuration ────────────────────────────────────────────────────────

export interface ITeamEnvironment {
    [key: string]: unknown;
}

export interface ITeamInputs {
    context?: Record<string, unknown>;
    parameters?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
}

// ─── Team Metrics ────────────────────────────────────────────────────────────

export interface ITeamMetrics {
    resources: IResourceMetrics;
    usage: IUsageMetrics;
    workflow: IWorkflowStats;
}

// ─── Team Methods ───────────────────────────────────────────────────────────

export interface ITeamWorkflowMethods {
    startWorkflow: (inputs?: ITeamInputs) => Promise<IHandlerResult>;
    stopWorkflow: (reason?: string) => Promise<void>;
    handleWorkflowError: (params: {
        task?: ITaskType;
        error: Error;
        context?: Record<string, unknown>;
    }) => Promise<void>;
}

export interface ITeamAgentMethods {
    handleAgentStatusChange: (
        agent: IAgentType,
        status: string,
        task?: ITaskType
    ) => Promise<void>;
    handleAgentError: (params: {
        agent: IAgentType;
        task: ITaskType;
        error: Error;
        context?: Record<string, unknown>;
    }) => Promise<IHandlerResult>;
}

export interface ITeamTaskMethods {
    handleTaskStatusChange: (
        taskId: string,
        status: string,
        metadata?: Record<string, unknown>
    ) => Promise<void>;
    handleTaskError: (
        task: ITaskType, 
        error: Error, 
        context?: Record<string, unknown>
    ) => Promise<void>;
    handleTaskBlocked: (
        taskId: string, 
        reason: string
    ) => Promise<void>;
}

// ─── Combined Store Methods ──────────────────────────────────────────────────

export interface ITeamStoreMethods extends 
    IBaseStoreMethods<ITeamState>,
    ITeamWorkflowMethods,
    ITeamAgentMethods,
    ITeamTaskMethods {
    provideFeedback: (
        taskId: string,
        feedback: string,
        metadata?: Record<string, unknown>
    ) => Promise<void>;
}

// ─── Type Guards ────────────────────────────────────────────────────────────

export const ITeamTypeGuards = {
    isTeamState: (value: unknown): value is ITeamState => {
        if (!value || typeof value !== 'object') return false;
        const state = value as Partial<ITeamState>;
        return (
            typeof state.name === 'string' &&
            typeof state.teamWorkflowStatus === 'string' &&
            typeof state.workflowContext === 'string' &&
            Array.isArray(state.agents) &&
            Array.isArray(state.tasks) &&
            Array.isArray(state.workflowLogs)
        );
    },

    hasTeamMethods: (value: unknown): value is ITeamStoreMethods => {
        if (!value || typeof value !== 'object') return false;
        const methods = value as Partial<ITeamStoreMethods>;
        return (
            typeof methods.startWorkflow === 'function' &&
            typeof methods.stopWorkflow === 'function' &&
            typeof methods.handleTaskStatusChange === 'function' &&
            typeof methods.handleAgentStatusChange === 'function'
        );
    }
};
