/**
 * @file agentHandlersTypes.ts
 * @path KaibanJS/src/types/agent/agentHandlersTypes.ts
 * @description Type definitions for agent event handlers and processing
 *
 * @module types/agent
 */

import type { IAgentType } from './agentBaseTypes';
import type { ITaskType } from '../task/taskBaseTypes';
import type { IOutput, IParsedOutput } from '../llm/llmResponseTypes';
import type { IErrorType } from '../common/commonErrorTypes';
import type { IHandlerResult } from '../common/commonHandlerTypes';

// ─── Handler Parameter Types ──────────────────────────────────────────────────

/**
 * Error handler parameters
 */
export interface IErrorHandlerParams {
    /** The agent instance that encountered the error */
    agent: IAgentType;
    /** The task being processed when the error occurred */
    task: ITaskType;
    /** The error that was encountered */
    error: IErrorType;
    /** Optional context information about the error */
    context?: Record<string, unknown>;
}

/**
 * Thinking handler parameters
 */
export interface IThinkingHandlerParams {
    /** The agent instance that is thinking */
    agent: IAgentType;
    /** The task being processed */
    task: ITaskType;
    /** The messages being processed */
    messages: unknown[];
    /** Optional output from the thinking process */
    output?: IOutput;
}

/**
 * Tool handler parameters
 */
export interface IToolHandlerParams {
    /** The agent instance using the tool */
    agent: IAgentType;
    /** The task being processed */
    task: ITaskType;
    /** The tool being used (optional) */
    tool?: unknown;
    /** Any error that occurred during tool use */
    error: Error;
    /** The name of the tool being used */
    toolName: string;
}

// ─── Handler Type Guards ────────────────────────────────────────────────────────

export const IHandlerTypeGuards = {
    /**
     * Check if value is error handler parameters
     */
    isErrorHandlerParams: (value: unknown): value is IErrorHandlerParams => {
        if (typeof value !== 'object' || value === null) return false;
        const params = value as Partial<IErrorHandlerParams>;
        return !!(params.agent && params.task && params.error);
    },

    /**
     * Check if value is thinking handler parameters
     */
    isThinkingHandlerParams: (value: unknown): value is IThinkingHandlerParams => {
        if (typeof value !== 'object' || value === null) return false;
        const params = value as Partial<IThinkingHandlerParams>;
        return !!(params.agent && params.task && Array.isArray(params.messages));
    },

    /**
     * Check if value is tool handler parameters
     */
    isToolHandlerParams: (value: unknown): value is IToolHandlerParams => {
        if (typeof value !== 'object' || value === null) return false;
        const params = value as Partial<IToolHandlerParams>;
        return !!(
            params.agent && 
            params.task && 
            params.error instanceof Error &&
            typeof params.toolName === 'string'
        );
    }
};
