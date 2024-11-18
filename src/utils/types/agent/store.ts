/**
 * @file store.ts
 * @path src/utils/types/agent/store.ts
 * @description Agent store types and interfaces
 *
 * @module @types/agent
 */

import type { IBaseStoreState, IBaseStoreMethods } from '../store/base';
import type { AgentType } from './base';
import type { TaskType } from '../task/base';
import type { Output, ParsedOutput, LLMUsageStats } from '../llm/responses';
import type { AGENT_STATUS_enum } from '../common/enums';
import type { HandlerResult } from './handlers';
import type { IAgentMetadata, IAgentExecutionState, IAgentPerformanceStats } from './state';

// ─── Store Configuration Types ────────────────────────────────────────────────

/**
 * Agent store configuration interface
 */
export interface IAgentStoreConfig {
    name: string;
    maxConcurrentTasks?: number;
    taskTimeout?: number;
    progressCheckInterval?: number;
    maxRetries?: number;
    retryDelay?: number;
    middleware?: {
        devtools?: boolean;
        subscribeWithSelector?: boolean;
        persistence?: boolean;
    };
}

/**
 * Agent validation rules interface
 */
export interface IAgentValidationRules {
    requiredFields?: string[];
    validators?: Array<(state: IAgentState) => boolean>;
    costThresholds?: {
        warning: number;
        critical: number;
    };
}

// ─── Store State Types ──────────────────────────────────────────────────────────

/**
 * Complete agent store state
 */
export interface IAgentState extends IBaseStoreState {
    agents: AgentType[];
    activeAgents: AgentType[];
    metadata: Record<string, IAgentMetadata>;
    executionState: Record<string, IAgentExecutionState>;
    performanceStats: Record<string, IAgentPerformanceStats>;
    errors: Error[];
    loading: boolean;
}

// ─── Store Action Types ────────────────────────────────────────────────────────

/**
 * Agent error actions interface
 */
export interface IAgentErrorActions {
    handleAgentError: (params: {
        agent: AgentType;
        task: TaskType;
        error: Error;
        context?: Record<string, unknown>;
    }) => Promise<HandlerResult>;
}

/**
 * Agent thinking actions interface
 */
export interface IAgentThinkingActions {
    handleAgentThinking: (params: {
        agent: AgentType;
        task: TaskType;
        messages: any[];
        output?: Output;
    }) => Promise<HandlerResult>;

    handleAgentOutput: (params: {
        agent: AgentType;
        task: TaskType;
        output: Output;
        type: 'thought' | 'observation' | 'finalAnswer' | 'selfQuestion' | 'weird';
    }) => Promise<HandlerResult>;
}

/**
 * Agent tool actions interface
 */
export interface IAgentToolActions {
    handleStreamingOutput: (params: {
        agent: AgentType;
        task: TaskType;
        chunk: string;
        isDone: boolean;
    }) => Promise<HandlerResult>;

    handleFinalAnswer: (params: {
        agent: AgentType;
        task: TaskType;
        parsedLLMOutput: ParsedOutput;
    }) => ParsedOutput;
}

/**
 * Agent status actions interface
 */
export interface IAgentStatusActions {
    handleAgentStatusChange: (
        agent: AgentType,
        status: keyof typeof AGENT_STATUS_enum,
        task: TaskType
    ) => Promise<void>;

    handleIterationStart: (params: {
        agent: AgentType;
        task: TaskType;
        iterations: number;
        maxAgentIterations: number;
    }) => Promise<void>;

    handleIterationEnd: (params: {
        agent: AgentType;
        task: TaskType;
        iterations: number;
        maxAgentIterations: number;
    }) => Promise<void>;
}

// ─── Store Methods Types ───────────────────────────────────────────────────────

/**
 * Complete agent store actions interface
 */
export interface IAgentStoreActions extends
    IAgentErrorActions,
    IAgentThinkingActions,
    IAgentToolActions,
    IAgentStatusActions {}

/**
 * Complete agent store methods interface
 */
export interface IAgentStoreMethods extends 
    IBaseStoreMethods<IAgentState>,
    IAgentStoreActions {}

// ─── Type Guards ────────────────────────────────────────────────────────────

export const AgentStoreTypeGuards = {
    /**
     * Check if value has store actions
     */
    hasStoreActions: (value: unknown): value is IAgentStoreActions => {
        if (typeof value !== 'object' || value === null) return false;
        const actions = value as Partial<IAgentStoreActions>;
        return (
            typeof actions.handleAgentError === 'function' &&
            typeof actions.handleAgentThinking === 'function' &&
            typeof actions.handleAgentOutput === 'function' &&
            typeof actions.handleStreamingOutput === 'function' &&
            typeof actions.handleFinalAnswer === 'function' &&
            typeof actions.handleAgentStatusChange === 'function' &&
            typeof actions.handleIterationStart === 'function' &&
            typeof actions.handleIterationEnd === 'function'
        );
    },

    /**
     * Check if value is agent store methods
     */
    isAgentStoreMethods: (value: unknown): value is IAgentStoreMethods => {
        if (typeof value !== 'object' || value === null) return false;
        
        const methods = value as { 
            getState?: unknown; 
            setState?: unknown; 
            subscribe?: unknown; 
            destroy?: unknown; 
        };

        return (
            AgentStoreTypeGuards.hasStoreActions(value) &&
            typeof methods.getState === 'function' &&
            typeof methods.setState === 'function' &&
            typeof methods.subscribe === 'function' &&
            typeof methods.destroy === 'function'
        );
    },

    /**
     * Check if value is agent store config
     */
    isAgentStoreConfig: (value: unknown): value is IAgentStoreConfig => {
        if (typeof value !== 'object' || value === null) return false;
        const config = value as Partial<IAgentStoreConfig>;
        return (
            typeof config.name === 'string' &&
            (!config.maxConcurrentTasks || typeof config.maxConcurrentTasks === 'number') &&
            (!config.taskTimeout || typeof config.taskTimeout === 'number') &&
            (!config.progressCheckInterval || typeof config.progressCheckInterval === 'number')
        );
    }
};
