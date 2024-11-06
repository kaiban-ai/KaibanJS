/**
 * @file base.ts
 * @path src/utils/types/team/base.ts
 * @description Core team interfaces and types
 */

import { BaseStoreState, StoreSubscribe } from '../store/base';
import { WORKFLOW_STATUS_enum } from '../common/enums';
import { WorkflowResult } from '../workflow/base';
import { AgentType } from '../agent/base';
import { TaskType } from '../task/base';
import { Log } from './logs';
import { WorkflowStats } from '../workflow/stats';

/**
 * Team environment configuration
 */
export interface TeamEnvironment {
    [key: string]: unknown;
}

/**
 * Team inputs interface
 */
export interface TeamInputs {
    [key: string]: unknown;
}

/**
 * Team runtime state
 */
export interface TeamRuntimeState {
    /** Workflow status */
    teamWorkflowStatus: keyof typeof WORKFLOW_STATUS_enum;
    
    /** Workflow result */
    workflowResult: WorkflowResult;
    
    /** Team inputs */
    inputs: TeamInputs;
    
    /** Workflow context */
    workflowContext: string;
    
    /** Environment variables */
    env: TeamEnvironment;
    
    /** Log level */
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
    
    /** Task initialization flag */
    tasksInitialized: boolean;
}

/**
 * Core team state interface
 */
export interface TeamState extends BaseStoreState {
    /** Workflow status */
    teamWorkflowStatus: keyof typeof WORKFLOW_STATUS_enum;
    
    /** Workflow result */
    workflowResult: WorkflowResult | null;
    
    /** Team name */
    name: string;
    
    /** Active agents */
    agents: AgentType[];
    
    /** Active tasks */
    tasks: TaskType[];
    
    /** Workflow logs */
    workflowLogs: Log[];
    
    /** Team inputs */
    inputs: TeamInputs;
    
    /** Workflow context */
    workflowContext: string;
    
    /** Environment variables */
    env: TeamEnvironment;
    
    /** Log level */
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    
    /** Task initialization flag */
    tasksInitialized: boolean;
}

/**
 * Core team store interface
 */
export interface TeamStore extends TeamState {
    /** Get workflow status */
    getWorkflowStatus: () => keyof typeof WORKFLOW_STATUS_enum;
    
    /** Get workflow result */
    getWorkflowResult: () => WorkflowResult | null;
    
    /** Get workflow statistics */
    getWorkflowStats: () => WorkflowStats;

    /** Store management methods */
    getState: () => TeamState;
    setState: (fn: (state: TeamState) => Partial<TeamState>) => void;
    subscribe: StoreSubscribe<TeamState>;
    destroy: () => void;
}

/**
 * Team initialization parameters
 */
export interface ITeamParams {
    /** Team name */
    name: string;
    /** Initial agents */
    agents?: AgentType[];
    /** Initial tasks */
    tasks?: TaskType[];
    /** Log level */
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
    /** Initial inputs */
    inputs?: TeamInputs;
    /** Environment variables */
    env?: TeamEnvironment;
}

/**
 * Team interface
 */
export interface ITeam {
    /** Team store */
    store: TeamStore;

    /** Start workflow */
    start(inputs?: TeamInputs): Promise<WorkflowStartResult>;

    /** Get team store */
    getStore(): TeamStore;

    /** Get bound team store */
    useStore(): TeamStore;

    /** Subscribe to state changes */
    subscribeToChanges(
        listener: (newValues: Partial<TeamState>) => void,
        properties?: Array<keyof TeamState>
    ): () => void;

    /** Provide feedback for task */
    provideFeedback(taskId: string, feedbackContent: string): void;

    /** Validate task */
    validateTask(taskId: string): void;

    /** Get workflow status */
    getWorkflowStatus(): keyof typeof WORKFLOW_STATUS_enum;

    /** Get workflow result */
    getWorkflowResult(): WorkflowResult;

    /** Get workflow statistics */
    getWorkflowStats(): WorkflowStats;
}

/**
 * Type utilities for team types
 */
export const TeamTypeGuards = {
    /**
     * Check if value is TeamEnvironment
     */
    isTeamEnvironment: (value: unknown): value is TeamEnvironment => {
        return typeof value === 'object' && value !== null;
    },

    /**
     * Check if value is TeamInputs
     */
    isTeamInputs: (value: unknown): value is TeamInputs => {
        return typeof value === 'object' && value !== null;
    },

    /**
     * Check if value is TeamState
     */
    isTeamState: (value: unknown): value is TeamState => {
        if (typeof value !== 'object' || value === null) return false;
        const state = value as Partial<TeamState>;
        return (
            typeof state.name === 'string' &&
            Array.isArray(state.agents) &&
            Array.isArray(state.tasks) &&
            Array.isArray(state.workflowLogs) &&
            typeof state.teamWorkflowStatus === 'string' &&
            typeof state.workflowContext === 'string' &&
            typeof state.inputs === 'object' &&
            typeof state.env === 'object' &&
            typeof state.tasksInitialized === 'boolean'
        );
    }
};

export type TeamStateKey = keyof TeamState;

export interface WorkflowStartResult {
    /** Workflow status */
    status: keyof typeof WORKFLOW_STATUS_enum;
    
    /** Workflow result */
    result: WorkflowResult;
    
    /** Workflow statistics */
    stats: WorkflowStats;
}