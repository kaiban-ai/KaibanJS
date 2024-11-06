/**
 * @file config.ts
 * @path src/utils/types/agent/config.ts
 * @description Agent configuration interfaces and types
 *
 * @packageDocumentation
 * @module @types/agent
 */

import { Tool } from "langchain/tools";
import { LLMConfig } from "../llm/providers";
import { TeamStore } from "../team/store
import { IMessageHistory } from "../messaging/history";
import { IBaseAgent } from "./base";

/**
 * Base agent configuration interface
 */
export interface BaseAgentConfig {
    /** Display name */
    name: string;
    
    /** Agent's role or function */
    role: string;
    
    /** Primary goal or objective */
    goal: string;
    
    /** Background information */
    background: string;
    
    /** Available tools */
    tools: Tool[];
    
    /** LLM configuration */
    llmConfig?: LLMConfig;
    
    /** Maximum iterations */
    maxIterations?: number;
    
    /** Force final answer flag */
    forceFinalAnswer?: boolean;
    
    /** Prompt templates */
    promptTemplates?: Record<string, unknown>;
    
    /** LLM instance */
    llmInstance?: any;
    
    /** Message history */
    messageHistory?: IMessageHistory;
}

/**
 * Extended agent configuration with message history
 * @breaking-change v2.0.0 Added messageHistory to base configuration
 */
export interface ExtendedBaseAgentConfig extends BaseAgentConfig {
    /** Extended message history support */
    messageHistory?: IMessageHistory;
}

/**
 * Agent initialization parameters
 */
export interface IAgentParams {
    /** Display name */
    name: string;
    
    /** Agent's role */
    role: string;
    
    /** Primary goal */
    goal: string;
    
    /** Background info */
    background: string;
    
    /** Available tools */
    tools?: Tool[];
    
    /** LLM configuration */
    llmConfig?: LLMConfig;
    
    /** Maximum iterations */
    maxIterations?: number;
    
    /** Force final answer */
    forceFinalAnswer?: boolean;
    
    /** Prompt templates */
    promptTemplates?: Record<string, unknown>;
    
    /** Message history */
    messageHistory?: IMessageHistory;
    
    /** Environment variables */
    env?: Record<string, unknown>;
    
    /** Team store */
    store?: TeamStore | null;
}

/**
 * Agent configuration validation schema
 */
export interface AgentValidationSchema {
    /** Required fields */
    required: string[];
    
    /** Field constraints */
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
    
    /** Custom validation function */
    customValidation?: (config: BaseAgentConfig) => boolean;
}

/**
 * Agent creation result
 */
export interface AgentCreationResult {
    /** Success flag */
    success: boolean;
    
    /** Created agent instance */
    agent?: IBaseAgent;
    
    /** Error if creation failed */
    error?: Error;
    
    /** Validation results */
    validation?: {
        isValid: boolean;
        errors: string[];
    };
    
    /** Creation metadata */
    metadata?: {
        createdAt: number;
        configHash: string;
        version: string;
    };
}