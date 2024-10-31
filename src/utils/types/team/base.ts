/**
 * @file base.ts
 * @path src/types/team/base.ts
 * @description Core team interfaces and types
 *
 * @packageDocumentation
 * @module @types/team
 */

import { AgentType, IBaseAgent } from "../agent";
import { TaskType } from "../task";
import { Log } from "./logs";
import { TASK_STATUS_enum, WORKFLOW_STATUS_enum } from "@/utils/core/enums";
import { WorkflowResult, WorkflowStats } from "../workflow";

/**
 * Team environment variables
 */
export interface TeamEnvironment {
    [key: string]: string | number | boolean | null | undefined;
}

/**
 * Team input parameters
 */
export interface TeamInputs {
    [key: string]: string | number | boolean | null | undefined;
}

/**
 * Team initialization parameters
 */
export interface ITeamParams {
    /** Team name */
    name: string;
    
    /** Team agents */
    agents?: IBaseAgent[];
    
    /** Team tasks */
    tasks?: TaskType[];
    
    /** Log level */
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
    
    /** Team inputs */
    inputs?: TeamInputs;
    
    /** Environment variables */
    env?: TeamEnvironment;
}

/**
 * Core team interface
 */
export interface ITeam {
    /** Team store */
    store: TeamStore;

    /**
     * Start team workflow
     */
    start(inputs?: TeamInputs): Promise<WorkflowStartResult>;

    /**
     * Get team store
     */
    getStore(): TeamStore;

    /**
     * Subscribe to team changes
     */
    subscribeToChanges(
        listener: (newValues: Partial<TeamState>) => void,
        properties?: TeamStateKey[]
    ): () => void;

    /**
     * Provide feedback for a task
     */
    provideFeedback(taskId: string, feedbackContent: string): void;

    /**
     * Validate a task
     */
    validateTask(taskId: string): void;

    /**
     * Get tasks by status
     */
    getTasksByStatus(status: keyof typeof TASK_STATUS_enum): TaskType[];

    /**
     * Get workflow status
     */
    getWorkflowStatus(): keyof typeof WORKFLOW_STATUS_enum;

    /**
     * Get workflow result
     */
    getWorkflowResult(): WorkflowResult;

    /**
     * Get workflow statistics
     */
    getWorkflowStats(): WorkflowStats;
}

/**
 * Team state interface
 */
export interface TeamState {
    /** Team name */
    name: string;
    
    /** Team agents */
    agents: AgentType[];
    
    /** Team tasks */
    tasks: TaskType[];
    
    /** Workflow logs */
    workflowLogs: Log[];
    
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
 * Workflow start result
 */
export interface WorkflowStartResult {
    /** Workflow status */
    status: keyof typeof WORKFLOW_STATUS_enum;
    
    /** Workflow result */
    result: WorkflowResult;
    
    /** Workflow statistics */
    stats: WorkflowStats;
}

/**
 * Team store interface
 */
export interface TeamStore extends TeamState {
    /**
     * Get current state
     */
    getState: () => TeamStore;

    /**
     * Update state
     */
    setState: (partial: Partial<TeamStore>) => void;

    /**
     * Subscribe to changes
     */
    subscribe: StoreSubscribe<TeamStore>;

    /**
     * Cleanup resources
     */
    destroy: () => void;

    /**
     * Handle system message
     */
    handleSystemMessage: (message: string) => void;
}

/**
 * Store subscription type
 */
export interface StoreSubscribe<T> {
    (listener: (state: T, previousState: T) => void): () => void;
    <U>(
        selector: (state: T) => U,
        listener: (selectedState: U, previousSelectedState: U) => void,
        options?: {
            equalityFn?: (a: U, b: U) => boolean;
            fireImmediately?: boolean;
        }
    ): () => void;
}

/**
 * Team state key type
 */
export type TeamStateKey = keyof TeamState;

/**
 * Type guards for team-related types
 */
export const TeamTypeGuards = {
    isTeamState: (value: unknown): value is TeamState => {
        return (
            typeof value === 'object' &&
            value !== null &&
            'name' in value &&
            'agents' in value &&
            'tasks' in value &&
            'workflowLogs' in value &&
            'teamWorkflowStatus' in value
        );
    },

    isTeamStore: (value: unknown): value is TeamStore => {
        return (
            TeamTypeGuards.isTeamState(value) &&
            'getState' in value &&
            'setState' in value &&
            'subscribe' in value &&
            'destroy' in value
        );
    }
};