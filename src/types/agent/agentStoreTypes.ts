/**
 * @file agentStoreTypes.ts
 * @path KaibanJS/src/types/agent/agentStoreTypes.ts
 * @description Agent store types and interfaces for managing agent state and operations
 *
 * @module types/agent
 */

import { IAgentTypeGuards } from './agentBaseTypes';
import type { IBaseStoreState, IBaseStoreMethods, IStoreConfig } from '../store/baseStoreTypes';
import type { IAgentType, IAgentMetadata, IReactChampionAgent } from './agentBaseTypes';
import type { ITaskType } from '../task/taskBaseTypes';
import type { IOutput, IParsedOutput } from '../llm/llmResponseTypes';
import type { AGENT_STATUS_enum } from '../common/commonEnums';
import type { IHandlerResult } from '../common/commonHandlerTypes';
import type { IResourceMetrics, IUsageMetrics, IPerformanceMetrics } from '../common/commonMetricTypes';
import type { IAgentExecutionState } from './agentStateTypes';

// Re-export types from agentStateTypes
export type { IAgentExecutionState };

// ─── Store State Interface ────────────────────────────────────────────────────

/**
 * Agent store state interface
 */
export interface IAgentState extends IBaseStoreState {
    agents: IAgentType[];
    activeAgents: IAgentType[];
    metadata: Record<string, IAgentMetadata>;
    executionState: Record<string, IAgentExecutionState>;
    errors: Error[];
    loading: boolean;
}

// ─── Store Configuration ─────────────────────────────────────────────────────

/**
 * Agent store configuration interface
 */
export interface IAgentStoreConfig extends IStoreConfig {
    maxConcurrentTasks?: number;
    taskTimeout?: number;
    progressCheckInterval?: number;
}

// ─── Store Actions ───────────────────────────────────────────────────────────

/**
 * Agent error actions interface
 */
export interface IAgentErrorActions {
    handleAgentError: (params: {
        agent: IAgentType;
        task: ITaskType;
        error: Error;
        context?: Record<string, unknown>;
    }) => Promise<IHandlerResult>;
}

/**
 * Agent thinking actions interface
 */
export interface IAgentThinkingActions {
    handleAgentThinking: (params: {
        agent: IAgentType;
        task: ITaskType;
        messages: any[];
        output?: IOutput;
    }) => Promise<IHandlerResult>;

    handleAgentOutput: (params: {
        agent: IAgentType;
        task: ITaskType;
        output: IOutput;
        type: 'thought' | 'observation' | 'finalAnswer' | 'selfQuestion' | 'weird';
    }) => Promise<IHandlerResult>;
}

/**
 * Agent status actions interface
 */
export interface IAgentStatusActions {
    handleAgentStatusChange: (
        agent: IAgentType,
        status: keyof typeof AGENT_STATUS_enum,
        task: ITaskType
    ) => Promise<void>;

    /**
     * Handle iteration start for REACT Champion agents
     * @param params Parameters including the agent and iteration details
     * @throws Error if agent is not a REACT Champion agent
     */
    handleIterationStart: (params: {
        agent: IAgentType;
        task: ITaskType;
        iterations: number;
        maxAgentIterations: number;
    }) => Promise<void>;

    /**
     * Handle iteration end for REACT Champion agents
     * @param params Parameters including the agent and iteration details
     * @throws Error if agent is not a REACT Champion agent
     */
    handleIterationEnd: (params: {
        agent: IAgentType;
        task: ITaskType;
        iterations: number;
        maxAgentIterations: number;
    }) => Promise<void>;
}

/**
 * Combined store actions interface
 */
export interface IAgentStoreActions extends
    IAgentErrorActions,
    IAgentThinkingActions,
    IAgentStatusActions {
    
    /**
     * Type guard to ensure agent is a REACT Champion agent before handling iterations
     */
    ensureReactChampionAgent: (agent: IAgentType) => asserts agent is IReactChampionAgent;
}

/**
 * Complete store methods interface
 */
export interface IAgentStoreMethods extends 
    IBaseStoreMethods<IAgentState>,
    IAgentStoreActions {}

// ─── Type Guards ────────────────────────────────────────────────────────────

/**
 * Implementation of the REACT Champion agent type guard
 */
export const ensureReactChampionAgent = (agent: IAgentType): asserts agent is IReactChampionAgent => {
    if (!IAgentTypeGuards.isReactChampionAgent(agent)) {
        throw new Error('Agent must be a REACT Champion agent to handle iterations');
    }
};

export const IAgentStoreTypeGuards = {
    hasStoreActions: (value: unknown): value is IAgentStoreActions => {
        if (typeof value !== 'object' || value === null) return false;
        const actions = value as Partial<IAgentStoreActions>;
        return (
            typeof actions.handleAgentError === 'function' &&
            typeof actions.handleAgentThinking === 'function' &&
            typeof actions.handleAgentOutput === 'function' &&
            typeof actions.handleAgentStatusChange === 'function' &&
            typeof actions.handleIterationStart === 'function' &&
            typeof actions.handleIterationEnd === 'function' &&
            typeof actions.ensureReactChampionAgent === 'function'
        );
    },

    isAgentStoreMethods: (value: unknown): value is IAgentStoreMethods => {
        if (typeof value !== 'object' || value === null) return false;
        return IAgentStoreTypeGuards.hasStoreActions(value);
    }
};
