/**
 * @file config.ts
 * @path KaibanJS/src/utils/types/agent/config.ts
 * @description Agent configuration interfaces and types for consistent agent initialization
 */

import { Tool } from "langchain/tools";
import { LLMConfig } from "../llm";
import { TeamStore } from "../team";
import { IMessageHistory } from "../messaging/history";
import { IBaseAgent } from "./base";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import { LLMInstance } from "../llm";
import { TaskType } from "../task";
import { AgentType } from "./base";
import { Output } from "../llm";
import { ErrorType } from "../common";
import { REACTChampionAgentPrompts } from './prompts';
import type { BaseMessage } from "@langchain/core/messages";

/**
 * Base agent configuration interface
 */
export interface BaseAgentConfig {
    name: string;
    role: string;
    goal: string;
    background: string;
    tools: Tool[];
    llmConfig?: LLMConfig;
    maxIterations?: number;
    forceFinalAnswer?: boolean;
    promptTemplates?: Record<string, unknown>;
    llmInstance?: any;
    messageHistory?: IMessageHistory;
}

/**
 * Extended agent configuration with message history
 */
export interface ExtendedBaseAgentConfig extends BaseAgentConfig {
    messageHistory?: IMessageHistory;
}

/**
 * React-specific agent configuration
 */
export interface ReactAgentConfig {
    messageHistory: IMessageHistory;
    executableAgent: RunnableWithMessageHistory<
        Array<BaseMessage> | Record<string, any>,  // RunInput type
        string | BaseMessage | Array<BaseMessage> | Record<string, BaseMessage | Array<BaseMessage>>  // RunOutput type
    >;
    promptTemplates: REACTChampionAgentPrompts;
    llmInstance: LLMInstance;
}

/**
 * Execution context for an agent's task
 */
export interface ExecutionContext {
    task: TaskType;
    agent: AgentType;
    iterations: number;
    maxAgentIterations: number;
    startTime: number;
    lastOutput?: Output;
    lastError?: ErrorType;
}

/**
 * Agentic loop result
 */
export interface AgenticLoopResult {
    result?: Output; // Final result from the loop execution
    error?: string;  // Description of an error, if encountered
    metadata: {
        iterations: number;        // Number of completed iterations
        maxAgentIterations: number; // Maximum allowed iterations
    };
}

/**
 * Agent initialization parameters
 */
export interface IAgentParams {
    name: string;
    role: string;
    goal: string;
    background: string;
    tools?: Tool[];
    llmConfig?: LLMConfig;
    maxIterations?: number;
    forceFinalAnswer?: boolean;
    promptTemplates?: Record<string, unknown>;
    messageHistory?: IMessageHistory;
    env?: Record<string, unknown>;
    store?: TeamStore | null;
}

/**
 * Agent configuration validation schema
 */
export interface AgentValidationSchema {
    required: string[];
    constraints: {
        name?: {
            minLength?: number;
            maxLength?: number;
            pattern?: RegExp;
        };
        role?: {
            allowedValues?: string[];
            custom?: (value: string) => boolean;
        };
        tools?: {
            minCount?: number;
            maxCount?: number;
            requiredTools?: string[];
        };
    };
    customValidation?: (config: BaseAgentConfig) => boolean;
}

/**
 * Agent creation result
 */
export interface AgentCreationResult {
    success: boolean;
    agent?: IBaseAgent;
    error?: Error;
    validation?: {
        isValid: boolean;
        errors: string[];
    };
    metadata?: {
        createdAt: number;
        configHash: string;
        version: string;
    };
}

/**
 * Type guard utilities
 */
export const AgentConfigTypeGuards = {
    isBaseAgentConfig: (config: unknown): config is BaseAgentConfig => {
        if (!config || typeof config !== 'object') return false;
        const c = config as Partial<BaseAgentConfig>;
        return (
            typeof c.name === 'string' &&
            typeof c.role === 'string' &&
            typeof c.goal === 'string' &&
            typeof c.background === 'string' &&
            Array.isArray(c.tools)
        );
    },

    isReactAgentConfig: (config: unknown): config is ReactAgentConfig => {
        if (!config || typeof config !== 'object') return false;
        const c = config as Partial<ReactAgentConfig>;
        return !!(
            c.messageHistory &&
            c.executableAgent &&
            c.promptTemplates &&
            c.llmInstance
        );
    },

    isExecutionContext: (value: unknown): value is ExecutionContext => {
        if (!value || typeof value !== 'object') return false;
        const ctx = value as Partial<ExecutionContext>;
        return !!(
            ctx.task &&
            ctx.agent &&
            typeof ctx.iterations === 'number' &&
            typeof ctx.maxAgentIterations === 'number' &&
            typeof ctx.startTime === 'number'
        );
    }
};
