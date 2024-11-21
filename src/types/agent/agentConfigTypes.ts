
/**
 * @file agentConfigTypes.ts
 * @path KaibanJS/src/types/agent/agentConfigTypes.ts
 * @description Agent configuration types and validation schemas
 *
 * @module types/agent
 */

import { Tool } from "langchain/tools";
import type { IBaseAgent } from './agentBaseTypes';
import type { ILLMConfig } from "../llm/llmCommonTypes";
import type { ITaskType } from "../task/taskBaseTypes";
import type { IOutput } from "../llm/llmResponseTypes";
import type { IErrorType } from "../common/commonErrorTypes";

// ─── Configuration Types ────────────────────────────────────────────────────

export interface IAgentValidationSchema {
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
    customValidation?: (config: Record<string, unknown>) => boolean;
}

export interface IAgentCreationResult {
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

export interface IExecutionContext {
    task: ITaskType;
    agent: IBaseAgent;
    iterations: number;
    maxAgentIterations: number;
    startTime: number;
    lastOutput?: IOutput;
    lastError?: IErrorType;
}

// ─── Type Guards ────────────────────────────────────────────────────────────

export const IAgentConfigTypeGuards = {
    isAgentValidationSchema: (schema: unknown): schema is IAgentValidationSchema => {
        if (!schema || typeof schema !== 'object') return false;
        const s = schema as Partial<IAgentValidationSchema>;
        return Array.isArray(s.required) && 'constraints' in s;
    },

    isExecutionContext: (value: unknown): value is IExecutionContext => {
        if (!value || typeof value !== 'object') return false;
        const ctx = value as Partial<IExecutionContext>;
        return !!(
            ctx.task &&
            ctx.agent &&
            typeof ctx.iterations === 'number' &&
            typeof ctx.maxAgentIterations === 'number' &&
            typeof ctx.startTime === 'number'
        );
    }
};
