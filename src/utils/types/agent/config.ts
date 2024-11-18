/**
 * @file config.ts
 * @path KaibanJS/src/utils/types/agent/config.ts
 * @description Agent configuration types and validation schemas
 */

import { Tool } from "langchain/tools";
import type { BaseAgentConfig, IBaseAgent } from './base';
import type { LLMConfig } from "../llm";
import type { TaskType } from "../task/base";
import type { WorkflowResult } from "../workflow";
import type { TeamStore } from "../team/base";
import type { Output, ParsedOutput } from "../llm/responses";
import type { ErrorType } from "../common";

/**
 * Agent validation schema for configuration validation
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
 * Agent creation result interface
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
 * Agent execution context interface
 */
export interface ExecutionContext {
    task: TaskType;
    agent: IBaseAgent;
    iterations: number;
    maxAgentIterations: number;
    startTime: number;
    lastOutput?: Output;
    lastError?: ErrorType;
}

/**
 * Type guard utilities for agent configuration
 */
export const AgentConfigTypeGuards = {
    isAgentValidationSchema: (schema: unknown): schema is AgentValidationSchema => {
        if (!schema || typeof schema !== 'object') return false;
        const s = schema as Partial<AgentValidationSchema>;
        return Array.isArray(s.required) && 'constraints' in s;
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

/**
 * Agent configuration utilities
 */
export const AgentConfigUtils = {
    /**
     * Validate agent configuration
     */
    validateConfig: (config: BaseAgentConfig, schema: AgentValidationSchema): boolean => {
        // Implement validation logic here
        return true;
    },

    /**
     * Create default configuration
     */
    createDefaultConfig: (name: string, role: string): BaseAgentConfig => {
        return {
            name,
            role,
            goal: '',
            background: '',
            llmConfig: {
                provider: 'openai',
                apiKey: '',
                model: 'gpt-4'
            }
        };
    },

    /**
     * Generate unique configuration hash
     */
    generateConfigHash: (config: BaseAgentConfig): string => {
        return Buffer.from(JSON.stringify({
            name: config.name,
            role: config.role,
            goal: config.goal,
            background: config.background,
            tools: config.tools?.map(t => t.name)
        })).toString('base64');
    }
};