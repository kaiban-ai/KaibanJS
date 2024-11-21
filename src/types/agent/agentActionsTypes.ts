/**
 * @file agentActionsTypes.ts
 * @path KaibanJS/src/types/agent/agentActionsTypes.ts
 * @description Agent action types and interfaces
 *
 * @module types/agent
 */

import type { IAgentType, IReactChampionAgent } from './agentBaseTypes';
import type { ITaskType } from '../task/taskBaseTypes';
import type { IOutput, IParsedOutput } from '../llm/llmResponseTypes';
import type { AGENT_STATUS_enum } from '../common/commonEnums';
import type { IErrorType } from '../common/commonErrorTypes';
import type { IHandlerResult } from '../common/commonHandlerTypes';

// ─── Core Action Types ──────────────────────────────────────────────────────────

/**
 * Error handling actions interface
 */
export interface IAgentErrorActions {
    handleAgentError: (params: {
        agent: IAgentType;
        task: ITaskType;
        error: IErrorType;
        context?: Record<string, unknown>;
    }) => Promise<IHandlerResult>;
}

/**
 * Thinking process actions interface
 */
export interface IAgentThinkingActions {
    handleAgentThinking: (params: {
        agent: IAgentType;
        task: ITaskType;
        messages: unknown[];
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
 * Tool execution actions interface
 */
export interface IAgentToolActions {
    handleStreamingOutput: (params: {
        agent: IAgentType;
        task: ITaskType;
        chunk: string;
        isDone: boolean;
    }) => Promise<void>;

    handleFinalAnswer: (params: {
        agent: IAgentType;
        task: ITaskType;
        parsedLLMOutput: IParsedOutput;
    }) => Promise<IParsedOutput>;
}

/**
 * Status management actions interface
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
 * Complete agent store actions interface
 */
export interface IAgentStoreActions extends 
    IAgentErrorActions,
    IAgentThinkingActions,
    IAgentToolActions,
    IAgentStatusActions {
    
    /**
     * Type guard to ensure agent is a REACT Champion agent before handling iterations
     */
    ensureReactChampionAgent: (agent: IAgentType) => asserts agent is IReactChampionAgent;
}

// ─── Type Guards ────────────────────────────────────────────────────────────

export const IAgentActionTypeGuards = {
    /**
     * Check if value has error actions
     */
    hasErrorActions: (value: unknown): value is IAgentErrorActions => {
        if (typeof value !== 'object' || value === null) return false;
        return typeof (value as IAgentErrorActions).handleAgentError === 'function';
    },

    /**
     * Check if value has thinking actions
     */
    hasThinkingActions: (value: unknown): value is IAgentThinkingActions => {
        if (typeof value !== 'object' || value === null) return false;
        const actions = value as IAgentThinkingActions;
        return (
            typeof actions.handleAgentThinking === 'function' &&
            typeof actions.handleAgentOutput === 'function'
        );
    },

    /**
     * Check if value has tool actions
     */
    hasToolActions: (value: unknown): value is IAgentToolActions => {
        if (typeof value !== 'object' || value === null) return false;
        const actions = value as IAgentToolActions;
        return (
            typeof actions.handleStreamingOutput === 'function' &&
            typeof actions.handleFinalAnswer === 'function'
        );
    },

    /**
     * Check if value has complete store actions
     */
    hasStoreActions: (value: unknown): value is IAgentStoreActions => {
        if (typeof value !== 'object' || value === null) return false;
        return (
            IAgentActionTypeGuards.hasErrorActions(value) &&
            IAgentActionTypeGuards.hasThinkingActions(value) &&
            IAgentActionTypeGuards.hasToolActions(value) &&
            typeof (value as IAgentStoreActions).ensureReactChampionAgent === 'function'
        );
    }
};
