/**
 * @file actions.ts
 * @path src/utils/types/agent/actions.ts
 * @description Agent action types and interfaces
 *
 * @module @types/agent
 */

import type { AgentType } from './base';
import type { TaskType } from '../task/base';
import type { Output, ParsedOutput } from '../llm/responses';
import type { AGENT_STATUS_enum } from '../common/enums';
import type { ErrorType } from '../common/errors';
import type { HandlerResult } from './handlers';

// ─── Core Action Types ──────────────────────────────────────────────────────────

/**
 * Error handling actions interface
 */
export interface AgentErrorActions {
    handleAgentError: (params: {
        agent: AgentType;
        task: TaskType;
        error: ErrorType;
        context?: Record<string, unknown>;
    }) => Promise<HandlerResult>;
}

/**
 * Thinking process actions interface
 */
export interface AgentThinkingActions {
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
    }) => void;
}

/**
 * Tool execution actions interface
 */
export interface AgentToolActions {
    handleStreamingOutput: (params: {
        agent: AgentType;
        task: TaskType;
        chunk: string;
        isDone: boolean;
    }) => void;

    handleFinalAnswer: (params: {
        agent: AgentType;
        task: TaskType;
        parsedLLMOutput: ParsedOutput;
    }) => ParsedOutput;
}

/**
 * Status management actions interface
 */
export interface AgentStatusActions {
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
    }) => void;

    handleIterationEnd: (params: {
        agent: AgentType;
        task: TaskType;
        iterations: number;
        maxAgentIterations: number;
    }) => void;
}

/**
 * Complete agent store actions interface
 */
export interface AgentStoreActions extends 
    AgentErrorActions,
    AgentThinkingActions,
    AgentToolActions,
    AgentStatusActions {}

// ─── Type Guards ────────────────────────────────────────────────────────────

export const AgentActionTypeGuards = {
    /**
     * Check if value has error actions
     */
    hasErrorActions: (value: unknown): value is AgentErrorActions => {
        if (typeof value !== 'object' || value === null) return false;
        return typeof (value as AgentErrorActions).handleAgentError === 'function';
    },

    /**
     * Check if value has thinking actions
     */
    hasThinkingActions: (value: unknown): value is AgentThinkingActions => {
        if (typeof value !== 'object' || value === null) return false;
        const actions = value as AgentThinkingActions;
        return (
            typeof actions.handleAgentThinking === 'function' &&
            typeof actions.handleAgentOutput === 'function'
        );
    },

    /**
     * Check if value has tool actions
     */
    hasToolActions: (value: unknown): value is AgentToolActions => {
        if (typeof value !== 'object' || value === null) return false;
        const actions = value as AgentToolActions;
        return (
            typeof actions.handleStreamingOutput === 'function' &&
            typeof actions.handleFinalAnswer === 'function'
        );
    },

    /**
     * Check if value has complete store actions
     */
    hasStoreActions: (value: unknown): value is AgentStoreActions => {
        if (typeof value !== 'object' || value === null) return false;
        return (
            AgentActionTypeGuards.hasErrorActions(value) &&
            AgentActionTypeGuards.hasThinkingActions(value) &&
            AgentActionTypeGuards.hasToolActions(value)
        );
    }
};