/**
 * @file teamBaseTypes.ts
 * @path src/types/team/teamBaseTypes.ts
 * @description Team base type definitions
 */

import { IHistoricalMetrics } from './teamTimeWindowTypes';
import { IAgentResourceMetrics, IAgentPerformanceMetrics, IAgentUsageMetrics } from '../agent/agentMetricTypes';
import { IWorkflowResult } from '../workflow/workflowBaseTypes';
import { IWorkflowStats } from '../workflow/workflowStatsTypes';
import { IHandlerResult } from '../common/commonHandlerTypes';
import { IBaseHandlerMetadata, IErrorMetadata } from '../common/commonMetadataTypes';
import { IPerformanceMetrics } from '../common/commonMetricTypes';

// ─── Team Agent Types ───────────────────────────────────────────────────────────

export interface ITeamAgentSnapshot {
    readonly resource: IAgentResourceMetrics;
    readonly performance: IAgentPerformanceMetrics;
    readonly usage: IAgentUsageMetrics;
    readonly timestamp: number;
}

export interface ITeamAgentMetrics {
    readonly perAgent: Record<string, IHistoricalMetrics<ITeamAgentSnapshot>>;
    readonly aggregated: {
        readonly totalAgents: number;
        readonly activeAgents: number;
        readonly efficiency: number;
    };
}

// ─── Team State Types ───────────────────────────────────────────────────────────

export interface ITeamState {
    readonly name: string;
    readonly agents: string[];
    readonly tasks: string[];
    readonly workflowLogs: string[];
    readonly teamWorkflowStatus: string;
    readonly workflowContext: Record<string, unknown>;
    readonly inputs: Record<string, unknown>;
    readonly env: Record<string, string>;
    readonly tasksInitialized: boolean;
    readonly workflowResult?: IWorkflowResult;
}

// ─── Team Handler Types ──────────────────────────────────────────────────────

/** Team-specific metadata interface */
export interface ITeamHandlerMetadata extends IBaseHandlerMetadata {
    teamId: string;
    teamName: string;
    agentCount: number;
    taskCount: number;
    workflowStatus: string;
    performance: IPerformanceMetrics & {
        agentUtilization: number;
        taskCompletion: number;
    };
}

/** Team handler result type */
export type ITeamHandlerResult<T = unknown> = IHandlerResult<T, ITeamHandlerMetadata>;

// ─── Team Store Methods ─────────────────────────────────────────────────────────

export interface ITeamStoreMethods {
    getState: () => ITeamState;
    setState: (fn: (state: ITeamState) => Partial<ITeamState>) => void;
    subscribe: (listener: (state: ITeamState) => void) => () => void;
    destroy: () => void;
    startWorkflow: () => Promise<ITeamHandlerResult<IWorkflowResult>>;
    stopWorkflow: () => Promise<ITeamHandlerResult<void>>;
    handleWorkflowError: () => Promise<ITeamHandlerResult<IErrorMetadata>>;
    handleAgentStatusChange: () => Promise<ITeamHandlerResult<void>>;
    handleAgentError: () => Promise<ITeamHandlerResult<IErrorMetadata>>;
    handleTaskStatusChange: () => Promise<ITeamHandlerResult<void>>;
    handleTaskError: () => Promise<ITeamHandlerResult<IErrorMetadata>>;
    handleTaskBlocked: () => Promise<ITeamHandlerResult<void>>;
    provideFeedback: () => Promise<ITeamHandlerResult<void>>;
}
