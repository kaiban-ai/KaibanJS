/**
 * @file base.ts
 * @path KaibanJS/src/utils/types/team/base.ts
 * @description Core team interfaces and types
 */

import { WORKFLOW_STATUS_enum, TASK_STATUS_enum } from '../common';
import { ErrorType } from '../common';
import { WorkflowResult, WorkflowStats } from '../workflow';
import { AgentType } from '../agent';
import { TaskType } from '../task';
import { Log } from './logs';

// Team environment configuration
export interface TeamEnvironment {
    [key: string]: unknown;
}

// Team inputs interface
export interface TeamInputs {
    [key: string]: unknown;
}

// Parameters for preparing new log entries
export interface PrepareNewLogParams {
    task: TaskType | null;
    agent: AgentType | null;
    logDescription: string;
    logType: 'TaskStatusUpdate' | 'AgentStatusUpdate' | 'WorkflowStatusUpdate' | 'SystemMessage' | 'UserMessage' | 'AIMessage' | 'FunctionMessage';
    metadata: Record<string, unknown>;
    taskStatus?: keyof typeof TASK_STATUS_enum;
    agentStatus?: string;
    workflowStatus?: keyof typeof WORKFLOW_STATUS_enum;
}

// Team runtime state
export interface TeamRuntimeState {
    teamWorkflowStatus: keyof typeof WORKFLOW_STATUS_enum;
    workflowResult: WorkflowResult;
    inputs: TeamInputs;
    workflowContext: string;
    env: TeamEnvironment;
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
    tasksInitialized: boolean;
}

// Core team state interface
export interface TeamState extends TeamRuntimeState {
    name: string;
    agents: AgentType[];
    tasks: TaskType[];
    workflowLogs: Log[];
}

// Core team store interface with all methods
export interface TeamStore extends TeamState {
    // State Management
    resetWorkflowState(): Promise<void>;
    setInputs(inputs: TeamInputs): void;
    updateInputs(inputs: Partial<TeamInputs>): void;
    setState(fn: (state: TeamState) => Partial<TeamState>): void;
    getState(): TeamState;
    
    // Task Management
    handleTaskStatusChange(taskId: string, status: keyof typeof TASK_STATUS_enum, metadata?: Record<string, unknown>): void;
    handleTaskError(params: { task: TaskType; error: ErrorType; context?: Record<string, unknown> }): void;
    handleTaskBlocked(params: { task: TaskType; error: ErrorType }): void;
    validateTask(taskId: string): void;
    provideFeedback(taskId: string, feedbackContent: string): void;

    // Workflow Management
    handleWorkflowStatusChange(status: keyof typeof WORKFLOW_STATUS_enum): Promise<void>;
    handleWorkflowError(params: { task: TaskType; error: ErrorType; context?: Record<string, unknown> }): void;
    finishWorkflowAction(): void;
    getWorkflowStats(): WorkflowStats;

    // Log Management
    prepareNewLog(params: PrepareNewLogParams): Log;

    // Subscription/Cleanup
    subscribe(listener: (state: TeamState) => void): () => void;
    destroy(): void;
}

// Team initialization parameters
export interface ITeamParams {
    name: string;
    agents?: AgentType[];
    tasks?: TaskType[];
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
    inputs?: TeamInputs;
    env?: TeamEnvironment;
}

// Core team interface
export interface ITeam {
    store: TeamStore;
    start(inputs?: TeamInputs): Promise<WorkflowStartResult>;
    getStore(): TeamStore;
    useStore(): TeamStore;
    subscribeToChanges(listener: (newValues: Partial<TeamState>) => void, properties?: Array<keyof TeamState>): () => void;
    provideFeedback(taskId: string, feedbackContent: string): void;
    validateTask(taskId: string): void;
    getWorkflowStatus(): keyof typeof WORKFLOW_STATUS_enum;
    getWorkflowResult(): WorkflowResult;
    getWorkflowStats(): WorkflowStats;
}

// Workflow start result
export interface WorkflowStartResult {
    status: keyof typeof WORKFLOW_STATUS_enum;
    result: WorkflowResult;
    stats: WorkflowStats;
}

// Type guards for team types
export const TeamTypeGuards = {
    isTeamEnvironment: (value: unknown): value is TeamEnvironment => {
        return typeof value === 'object' && value !== null;
    },
    isTeamInputs: (value: unknown): value is TeamInputs => {
        return typeof value === 'object' && value !== null;
    },
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