/**
 * @file agentValidationTypes.ts
 * @path KaibanJS/src/types/agent/agentValidationTypes.ts
 * @description Validation type definitions for agent management using Zod
 *
 * @module types/agent
 */

import { z } from 'zod';
import type { IBaseAgent } from './agentBaseTypes';
import { LLM_PROVIDER_enum, VALIDATION_ERROR_enum, VALIDATION_WARNING_enum } from '../common/enumTypes';
import { ToolName } from '../tool/toolTypes';
import type { IValidationResult } from '../common/validationTypes';

/**
 * Agent validation schema using Zod
 */
export const AgentValidationSchema = z.object({
    // Required core properties
    id: z.string().min(1),
    name: z.string().min(1),
    role: z.string().min(1),
    goal: z.string().min(1),
    version: z.string().default('1.0.0'),

    // Optional properties with defaults
    background: z.string().default(''),
    capabilities: z.object({
        canThink: z.boolean().default(true),
        canUseTools: z.boolean().default(true),
        canLearn: z.boolean().default(false),
        supportedToolTypes: z.array(z.string() as z.ZodType<ToolName>),
        supportedTools: z.array(z.string() as z.ZodType<ToolName>),
        maxConcurrentTasks: z.number().default(1),
        memoryCapacity: z.number().default(1000)
    }).default({
        canThink: true,
        canUseTools: true,
        canLearn: false,
        supportedToolTypes: [],
        supportedTools: [],
        maxConcurrentTasks: 1,
        memoryCapacity: 1000
    }),

    // LLM configuration
    llmConfig: z.object({
        provider: z.nativeEnum(LLM_PROVIDER_enum),
        model: z.string().optional(),
        apiKey: z.string().optional(),
        temperature: z.number().optional(),
        streaming: z.boolean().optional(),
        apiBaseUrl: z.string().optional(),
        maxRetries: z.number().optional(),
        timeout: z.number().optional(),
        maxConcurrency: z.number().optional(),
        headers: z.record(z.string()).optional(),
        debug: z.boolean().optional(),
        stopSequences: z.array(z.string()).optional()
    }),
    llmSystemMessage: z.string().nullable().default(null),
    forceFinalAnswer: z.boolean().default(false),
    
    // Tools and environment
    tools: z.array(z.any()).default([]),
    env: z.record(z.unknown()).nullable().default(null),
    
    // Metadata and templates
    metadata: z.object({
        id: z.string(),
        name: z.string(),
        description: z.string().optional(),
        capabilities: z.array(z.string() as z.ZodType<ToolName>),
        skills: z.array(z.string()),
        created: z.date(),
        lastActive: z.date().optional(),
        tags: z.array(z.string()).optional()
    }).default({
        id: '',
        name: '',
        capabilities: [],
        skills: [],
        created: new Date()
    }),

    promptTemplates: z.record(z.unknown()).default({}),
    
    // Execution configuration
    executionConfig: z.object({
        maxRetries: z.number().default(3),
        timeoutMs: z.number().default(30000),
        errorThreshold: z.number().default(5)
    }).default({
        maxRetries: 3,
        timeoutMs: 30000,
        errorThreshold: 5
    })
});

export type IAgentValidationSchema = z.infer<typeof AgentValidationSchema>;

/**
 * Agent validation result interface
 */
export interface IAgentValidationResult {
    isValid: boolean;
    readonly errors: readonly VALIDATION_ERROR_enum[];
    readonly warnings: readonly VALIDATION_WARNING_enum[];
    agent?: IBaseAgent;
    metadata: {
        timestamp: number;
        duration: number;
        validatorName: string;
        validatedFields: string[];
        configHash?: string;
        validationDuration?: number;
    };
}

/**
 * Agent selection criteria interface
 */
export interface IAgentSelectionCriteria {
    role?: string;
    tools?: string[];
    preferredModels?: string[];
    capabilities?: string[];
    minPerformanceScore?: number;
    metadata?: {
        tags?: string[];
        skills?: string[];
    };
}

/**
 * Agent creation result interface
 */
export interface IAgentCreationResult {
    success: boolean;
    agent?: IBaseAgent;
    validation: IAgentValidationResult;
    metadata: {
        createdAt: number;
        configHash: string;
        version: string;
        validationDuration?: number;
        initializationDuration?: number;
    };
}

/**
 * Agent validation rule interface
 */
export interface IAgentValidationRule {
    id: string;
    validate: (agent: IBaseAgent, context?: IAgentValidationContext) => Promise<IValidationResult>;
    priority: number;
}

/**
 * Agent validation context interface
 */
export interface IAgentValidationContext {
    environment?: Record<string, unknown>;
    runtime?: Record<string, unknown>;
    capabilities?: string[];
    tools?: string[];
}

/**
 * Agent validation cache interface
 */
export interface IAgentValidationCache {
    result: IValidationResult;
    timestamp: number;
    context: IAgentValidationContext;
    hash: string;
}
