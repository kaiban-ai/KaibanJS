/**
 * @file team.ts
 * @path src/utils/types/store/team.ts
 * @description Team store types and interfaces for coordinating agents and tasks
 */

import type { BaseStoreState } from './base';
import type { StoreSubscribe } from './base';
import type { BaseMessage } from "@langchain/core/messages";
import type { Tool } from "langchain/tools";
import type { 
    WORKFLOW_STATUS_enum, 
    TASK_STATUS_enum,
    AGENT_STATUS_enum 
} from '../common/enums';
import type { ErrorType } from '../common/errors';
import type { 
    AgentType,
    TaskType,
    Output,
    LLMUsageStats,
    TeamEnvironment,
    TeamInputs,
    WorkflowStats,
    WorkflowResult
} from '@/utils/types';

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
 * Team store state interface
 */
export interface TeamStoreState extends BaseStoreState {
    /** Runtime state */
    runtime: TeamRuntimeState;
}

/**
 * Team store message methods
 */
export interface TeamMessageMethods {
    addSystemMessage(message: string): Promise<void>;
    addUserMessage(message: string): Promise<void>;
    addAIMessage(message: string): Promise<void>;
    getMessageHistory(): Promise<BaseMessage[]>;
    clearMessageHistory(): Promise<void>;
}

/**
 * Team store task methods
 */
export interface TeamTaskMethods {
    handleTaskCompletion(params: { 
        agent: AgentType; 
        task: TaskType; 
        result: unknown;
        metadata?: {
            duration?: number;
            iterationCount?: number;
            llmUsageStats?: LLMUsageStats;
        };
    }): void;

    handleTaskIncomplete(params: { 
        agent: AgentType; 
        task: TaskType; 
        error: Error;
        metadata?: {
            iterationCount?: number;
            lastAttemptTime?: number;
            retryCount?: number;
        };
    }): void;

    handleTaskError(params: { 
        task: TaskType; 
        error: ErrorType;
        context?: {
            phase?: string;
            attemptNumber?: number;
            lastSuccessfulOperation?: string;
            recoveryPossible?: boolean;
        };
    }): void;

    handleTaskBlocked(params: { 
        task: TaskType; 
        error: ErrorType;
        blockingReason?: string;
    }): void;

    handleTaskStatusChange(
        taskId: string,
        status: keyof typeof TASK_STATUS_enum,
        metadata?: Record<string, unknown>
    ): void;
}

/**
 * Team store agent methods
 */
export interface TeamAgentMethods {
    handleAgentStatusChange(agent: AgentType, status: keyof typeof AGENT_STATUS_enum): void;
    
    handleAgentError(params: {
        agent: AgentType;
        task: TaskType;
        error: ErrorType;
        context?: Record<string, unknown>;
    }): void;
    
    handleAgentThinking(params: {
        agent: AgentType;
        task: TaskType;
        messages: BaseMessage[];
        output?: Output;
    }): void;
    
    handleAgentAction(params: {
        agent: AgentType;
        task: TaskType;
        action: unknown;
        runId: string;
    }): void;

    handleAgentOutput(params: {
        agent: AgentType;
        task: TaskType;
        output: Output;
        type: 'thought' | 'observation' | 'finalAnswer' | 'selfQuestion' | 'weird';
    }): void;
}

/**
 * Team store tool methods
 */
export interface TeamToolMethods {
    handleToolExecution(params: {
        agent: AgentType;
        task: TaskType;
        tool: Tool;
        input: string;
        result?: string;
    }): void;

    handleToolError(params: {
        agent: AgentType;
        task: TaskType;
        tool: Tool;
        error: Error;
        toolName: string;
    }): void;

    handleToolDoesNotExist(params: {
        agent: AgentType;
        task: TaskType;
        toolName: string;
    }): void;
}

/**
 * Team store workflow methods
 */
export interface TeamWorkflowMethods {
    handleWorkflowError(params: { task: TaskType; error: ErrorType }): void;
    handleWorkflowBlocked(params: { task: TaskType; error: ErrorType }): void;
    handleWorkflowStatusChange(status: keyof typeof WORKFLOW_STATUS_enum): void;
    startWorkflow(inputs?: TeamInputs): Promise<WorkflowStartResult>;
    workOnTask(agent: AgentType, task: TaskType): Promise<void>;
}

/**
 * Team store feedback methods
 */
export interface TeamFeedbackMethods {
    provideFeedback: (taskId: string, feedbackContent: string) => Promise<void>;
    processFeedback: (taskId: string, feedbackId: string) => Promise<void>;
}

/**
 * Team store state actions
 */
export interface TeamStateActions {
    setInputs: (inputs: TeamInputs) => void;
    setEnvironment: (env: TeamEnvironment) => void;
    setName: (name: string) => void;
    setWorkflowStatus: (status: keyof typeof WORKFLOW_STATUS_enum) => void;
    updateInputs: (inputs: Partial<TeamInputs>) => void;
    resetWorkflowState: () => void;
}

/**
 * Workflow start result
 */
export interface WorkflowStartResult {
    /** Final status */
    status: keyof typeof WORKFLOW_STATUS_enum;
    
    /** Result data */
    result: WorkflowResult;
    
    /** Execution statistics */
    stats: WorkflowStats;
}

/**
 * Complete team store interface
 */
export interface TeamStore extends 
    TeamStoreState,
    TeamMessageMethods,
    TeamTaskMethods,
    TeamAgentMethods,
    TeamToolMethods,
    TeamWorkflowMethods,
    TeamFeedbackMethods,
    TeamStateActions {
    // Core store methods
    getState: () => TeamStore;
    setState: (partial: Partial<TeamStore> | ((state: TeamStore) => Partial<TeamStore>), replace?: boolean) => void;
    subscribe: StoreSubscribe<TeamStore>;
    destroy: () => void;
}

/**
 * Type guard utilities for team store
 */
export const TeamStoreTypeGuards = {
    /**
     * Check if value is TeamStoreState
     */
    isTeamStoreState: (value: unknown): value is TeamStoreState => {
        return (
            typeof value === 'object' &&
            value !== null &&
            'runtime' in value &&
            StoreTypeGuards.isBaseStoreState(value)
        );
    },

    /**
     * Check if value is TeamStore
     */
    isTeamStore: (value: unknown): value is TeamStore => {
        return (
            typeof value === 'object' &&
            value !== null &&
            'getState' in value &&
            'setState' in value &&
            'subscribe' in value &&
            'destroy' in value
        );
    },

    /**
     * Check if value has team message methods
     */
    hasTeamMessageMethods: (value: unknown): value is TeamMessageMethods => {
        return (
            typeof value === 'object' &&
            value !== null &&
            'addSystemMessage' in value &&
            'addUserMessage' in value &&
            'addAIMessage' in value &&
            'getMessageHistory' in value &&
            'clearMessageHistory' in value
        );
    },

    /**
     * Check if value has team task methods
     */
    hasTeamTaskMethods: (value: unknown): value is TeamTaskMethods => {
        return (
            typeof value === 'object' &&
            value !== null &&
            'handleTaskCompletion' in value &&
            'handleTaskIncomplete' in value &&
            'handleTaskError' in value &&
            'handleTaskBlocked' in value &&
            'handleTaskStatusChange' in value
        );
    }
};