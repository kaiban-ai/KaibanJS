/**
 * @file config.ts
 * @path src/utils/types/agent/config.ts
 * @description Agent configuration interfaces and types
 */

import { Tool } from "langchain/tools";
import { LLMConfig } from "../llm/providers";
import { TeamStore } from "../team";
import { IMessageHistory } from "../messaging/history";
import { IBaseAgent } from "./base";

// Base agent configuration interface
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

// Extended agent configuration with message history
export interface ExtendedBaseAgentConfig extends BaseAgentConfig {
    messageHistory?: IMessageHistory;
}

// Agent initialization parameters
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

// Agent configuration validation schema
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

// Agent creation result
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
