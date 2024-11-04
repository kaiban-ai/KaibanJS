/**
 * @file base.ts
 * @path src/utils/types/team/base.ts
 * @description Core team type definitions and interfaces
 */

import { StoreApi, UseBoundStore, StateCreator } from 'zustand';
import { BaseMessage } from '@langchain/core/messages';
import { Tool } from "langchain/tools";
import { BaseStoreState, StoreSubscribe } from '../store/base';
import { AgentType } from '../agent/base';
import { TaskType, TaskStats } from '../task/base';
import { Log, PrepareNewLogParams } from './logs';
import { WORKFLOW_STATUS_enum, TASK_STATUS_enum, AGENT_STATUS_enum } from '../common/enums';
import { WorkflowResult } from '../workflow/base';
import { ErrorType } from '../common/errors';
import { WorkflowStats, CostDetails } from '../workflow/stats';
import { Output, LLMUsageStats } from '../llm/responses';

/**
 * Team initialization parameters
 */
export interface TeamInitParams {
    /** Team name */
    name: string;
    
    /** Initial agents */
    agents?: AgentType[];
    
    /** Initial tasks */
    tasks?: TaskType[];
    
    /** Log level configuration */
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
    
    /** Initial inputs */
    inputs?: Record<string, unknown>;
    
    /** Environment variables */
    env?: Record<string, unknown>;
}

/**
 * Team operation parameters
 */
export interface TeamOperationParams {
    /** Operation timeout in milliseconds */
    timeout?: number;
    
    /** Maximum retries for failed operations */
    maxRetries?: number;
    
    /** Abort signal for cancellation */
    signal?: AbortSignal;
}

/**
 * Team message configuration
 */
export interface TeamMessageConfig {
    /** Message history size limit */
    maxMessages?: number;
    
    /** Token limit per message */
    maxTokens?: number;
    
    /** Message pruning strategy */
    pruningStrategy?: 'fifo' | 'lru' | 'relevance';
}

/**
 * Team environment and inputs
 */
export interface TeamEnvironment {
    [key: string]: string | number | boolean | null | undefined;
}

export interface TeamInputs {
    [key: string]: string | number | boolean | null | undefined;
}

/**
 * Team validation result
 */
export interface TeamValidationResult {
    /** Validation success flag */
    isValid: boolean;
    
    /** Validation errors */
    errors: string[];
    
    /** Optional warnings */
    warnings?: string[];
}

/**
 * Team execution context
 */
export interface TeamExecutionContext {
    /** Execution start time */
    startTime: number;
    
    /** Total executions */
    totalExecutions: number;
    
    /** Consecutive failures */
    consecutiveFailures: number;
    
    /** Total execution duration */
    totalDuration: number;
    
    /** Last success timestamp */
    lastSuccessTime?: number;
    
    /** Last error timestamp */
    lastErrorTime?: number;
    
    /** Last error encountered */
    lastError?: Error;
    
    /** Context metadata */
    metadata?: Record<string, unknown>;
}

/**
 * Team state interface
 */
export interface TeamState extends BaseStoreState {
    teamWorkflowStatus: keyof typeof WORKFLOW_STATUS_enum;
    workflowResult: WorkflowResult;
    inputs: TeamInputs;
    workflowContext: string;
    env: TeamEnvironment;
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
    tasksInitialized: boolean;
}

/**
 * Store methods interface
 */
export interface TeamStoreMethods {
    getState: () => TeamStore;
    setState: (partial: Partial<TeamStore> | ((state: TeamStore) => Partial<TeamStore>), replace?: boolean) => void;
    subscribe: StoreSubscribe<TeamStore>;
    destroy: () => void;
    handleSystemMessage: (message: string) => void;
}

/**
 * Message history methods
 */
export interface TeamMessageMethods {
    addSystemMessage: (message: string) => Promise<void>;
    addUserMessage: (message: string) => Promise<void>;
    addAIMessage: (message: string) => Promise<void>;
    getMessageHistory: () => Promise<BaseMessage[]>;
    clearMessageHistory: () => Promise<void>;
}

/**
 * Task handling methods
 */
export interface TeamTaskMethods {
    handleTaskCompletion: (params: { 
        agent: AgentType; 
        task: TaskType; 
        result: unknown;
        metadata?: {
            duration?: number;
            iterationCount?: number;
            llmUsageStats?: LLMUsageStats;
            costDetails?: CostDetails;
        };
    }) => void;

    handleTaskIncomplete: (params: { 
        agent: AgentType; 
        task: TaskType; 
        error: Error;
        metadata?: {
            iterationCount?: number;
            lastAttemptTime?: number;
            retryCount?: number;
        };
    }) => void;

    handleTaskError: (params: { 
        task: TaskType; 
        error: ErrorType;
        context?: {
            phase?: string;
            attemptNumber?: number;
            lastSuccessfulOperation?: string;
            recoveryPossible?: boolean;
        };
        metadata?: Record<string, unknown>;
    }) => void;

    handleTaskBlocked: (params: { 
        task: TaskType; 
        error: ErrorType;
        blockingReason?: string;
        dependencies?: {
            taskId: string;
            status: keyof typeof TASK_STATUS_enum;
            requiredFor: string;
        }[];
    }) => void;

    handleTaskStatusChange: (
        taskId: string,
        status: keyof typeof TASK_STATUS_enum,
        metadata?: {
            changedBy?: string;
            reason?: string;
            timestamp?: number;
            previousStatus?: keyof typeof TASK_STATUS_enum;
            statusDuration?: number;
        }
    ) => void;
}

/**
 * Tool handling methods
 */
export interface TeamToolMethods {
    handleToolExecution: (params: {
        agent: AgentType;
        task: TaskType;
        tool: Tool;
        input: string;
        result?: string;
    }) => void;

    handleToolError: (params: {
        agent: AgentType;
        task: TaskType;
        tool: Tool;
        error: Error;
        toolName: string;
    }) => void;

    handleToolDoesNotExist: (params: {
        agent: AgentType;
        task: TaskType;
        toolName: string;
    }) => void;
}

/**
 * Agent handling methods
 */
export interface TeamAgentMethods {
    handleAgentStatusChange: (agent: AgentType, status: keyof typeof AGENT_STATUS_enum) => void;
    handleAgentError: (params: {
        agent: AgentType;
        task: TaskType;
        error: ErrorType;
        context?: Record<string, unknown>;
    }) => void;
    handleAgentThinking: (params: {
        agent: AgentType;
        task: TaskType;
        messages: BaseMessage[];
        output?: Output;
    }) => void;
    handleAgentAction: (params: {
        agent: AgentType;
        task: TaskType;
        action: unknown;
        runId: string;
    }) => void;
    handleAgentOutput: (params: {
        agent: AgentType;
        task: TaskType;
        output: Output;
        type: 'thought' | 'observation' | 'finalAnswer' | 'selfQuestion' | 'weird';
    }) => void;
    handleAgentTaskCompleted: (params: {
        agent: AgentType;
        task: TaskType;
        result: unknown;
    }) => void;
    handleIterationStart: (params: {
        agent: AgentType;
        task: TaskType;
        iterations: number;
        maxAgentIterations: number;
    }) => void;
    handleIterationEnd: (params: {
        agent: AgentType;
        task: TaskType;
        iterations: number;
        maxAgentIterations: number;
    }) => void;
    handleMaxIterationsExceeded: (params: {
        agent: AgentType;
        task: TaskType;
        iterations: number;
        maxAgentIterations: number;
        error: ErrorType;
    }) => void;
}

/**
 * Workflow handling methods
 */
export interface TeamWorkflowMethods {
    handleWorkflowError: (params: { task: TaskType; error: ErrorType }) => void;
    handleWorkflowBlocked: (params: { task: TaskType; error: ErrorType }) => void;
    handleWorkflowStatusChange: (status: keyof typeof WORKFLOW_STATUS_enum) => void;
    handleWorkflowComplete: () => void;
    startWorkflow: (inputs?: TeamInputs) => Promise<WorkflowStartResult>;
    workOnTask: (agent: AgentType, task: TaskType) => Promise<void>;
}

/**
 * Feedback handling methods
 */
export interface TeamFeedbackMethods {
    provideFeedback: (taskId: string, feedbackContent: string) => Promise<void>;
    processFeedback: (taskId: string, feedbackId: string) => Promise<void>;
}

/**
 * State action methods
 */
export interface TeamStateActions {
    setInputs: (inputs: TeamInputs) => void;
    setEnvironment: (env: TeamEnvironment) => void;
    setName: (name: string) => void;
    setAgents: (agents: AgentType[]) => void;
    setTasks: (tasks: TaskType[]) => void;
    setWorkflowStatus: (status: keyof typeof WORKFLOW_STATUS_enum) => void;
    resetWorkflowState: () => void;
}

/**
 * Streaming methods
 */
export interface TeamStreamingMethods {
    handleStreamingOutput: (params: {
        agent: AgentType;
        task: TaskType;
        chunk: string;
        isDone: boolean;
    }) => void;
}

/**
 * Validation methods
 */
export interface TeamValidationMethods {
    validateTask: (taskId: string) => Promise<void>;
}

/**
 * Complete team store interface
 */
export interface TeamStore extends 
    TeamState, 
    TeamStoreMethods, 
    TeamMessageMethods,
    TeamTaskMethods,
    TeamAgentMethods,
    TeamWorkflowMethods,
    TeamToolMethods,
    TeamFeedbackMethods,
    TeamStateActions,
    TeamStreamingMethods,
    TeamValidationMethods {
    // Core store methods
    getState: () => TeamStore;
    setState: (partial: Partial<TeamStore> | ((state: TeamStore) => Partial<TeamStore>), replace?: boolean) => void;
    subscribe: StoreSubscribe<TeamStore>;
    destroy: () => void;

    // Log methods
    prepareNewLog: (params: PrepareNewLogParams) => Log;
    addWorkflowLog: (log: Log) => void;
    clearWorkflowLogs: () => void;

    // State management
    updateInputs: (inputs: TeamInputs) => void;
    updateEnvironment: (env: TeamEnvironment) => void;
    clearAll: () => void;
    resetWorkflowStateAction: () => void;

    // Stats and context
    getTaskStats: (task: TaskType) => TaskStats;
    getWorkflowStats: () => WorkflowStats;
    deriveContextFromLogs: (logs: Log[], currentTaskId: string) => string;

    // Lifecycle methods
    initialize: (config: TeamInitParams) => void;
    cleanup: () => Promise<void>;
}

/**
 * Type safe store setter
 */
export type SetTeamState = (
    partial: Partial<TeamStore> | ((state: TeamStore) => Partial<TeamStore>),
    replace?: boolean
) => void;

/**
 * Type safe store getter
 */
export type GetTeamState = () => TeamStore;

/**
 * Store API types
 */
export type TeamStateApi = StoreApi<TeamStore>;
export type BoundTeamStore = UseBoundStore<TeamStateApi>;

/**
 * Store creator type
 */
export type TeamStoreCreator = StateCreator<
    TeamStore,
    [['zustand/devtools', never], ['zustand/subscribeWithSelector', never]],
    [],
    TeamStore
>;

/**
 * Workflow start result
 */
export interface WorkflowStartResult {
    status: keyof typeof WORKFLOW_STATUS_enum;
    result: WorkflowResult;
    stats: WorkflowStats;
}

/**
 * Type guards and utilities
 */
export const TeamTypeGuards = {
    isTeamStore: (store: unknown): store is TeamStore => {
        return (
            typeof store === 'object' &&
            store !== null &&
            'getState' in store &&
            'setState' in store &&
            'subscribe' in store &&
            'destroy' in store
        );
    }
};

export const TeamUtils = {
    isTeamReady: (team: TeamState): boolean => {
        return (
            team.agents.length > 0 &&
            team.tasks.length > 0 &&
            team.tasksInitialized
        );
    },

    hasCompletedAllTasks: (team: TeamState): boolean => {
        return team.tasks.every((task: TaskType) => 
            task.status === TASK_STATUS_enum.DONE || 
            task.status === TASK_STATUS_enum.VALIDATED
        );
    },

    getTaskCompletionStatus: (team: TeamState): {
        total: number;
        completed: number;
        percentage: number;
        remaining: number;
    } => {
        const total = team.tasks.length;
        const completed = team.tasks.filter(
            (task: TaskType) => 
                task.status === TASK_STATUS_enum.DONE || 
                task.status === TASK_STATUS_enum.VALIDATED
        ).length;
        return {
            total,
            completed,
            percentage: (completed / total) * 100,
            remaining: total - completed
        };
    },

    canStartWorkflow: (team: TeamState): boolean => {
        return (
            team.teamWorkflowStatus === 'INITIAL' &&
            team.agents.length > 0 &&
            team.tasks.length > 0 &&
            team.tasksInitialized
        );
    },

    getActiveAgents: (team: TeamState): AgentType[] => {
        return team.agents.filter(agent => 
            agent.status !== AGENT_STATUS_enum.INITIAL &&
            agent.status !== AGENT_STATUS_enum.THINKING_ERROR
        );
    },

    getResourceUsage: (team: TeamState): {
        tokens: number;
        cost: number;
        time: number;
    } => {
        return team.tasks.reduce((acc, task) => {
            const stats = task.llmUsageStats || {
                inputTokens: 0,
                outputTokens: 0,
                costBreakdown: { total: 0 }
            };
            
            return {
                tokens: acc.tokens + stats.inputTokens + stats.outputTokens,
                cost: acc.cost + (stats.costBreakdown?.total || 0),
                time: acc.time + (task.duration || 0)
            };
        }, { tokens: 0, cost: 0, time: 0 });
    }
};
