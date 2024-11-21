/**
 * @file agentValidationTypes.ts
 * @path KaibanJS/src/types/agent/agentValidationTypes.ts
 * @description Validation type definitions for agent management
 *
 * @module types/agent
 */

import type { IValidationResult } from '../common/commonValidationTypes';
import type { IBaseAgent, IAgentCapabilities, IAgentMetadata } from './agentBaseTypes';
import type { ILLMConfig } from '../llm/llmCommonTypes';
import type { IValidationSchema } from '../common/commonValidationTypes';

/**
 * Agent validation schema interface
 */
export interface IAgentValidationSchema {
    // Required core properties
    name: string;
    role: string;
    goal: string;
    version: string;

    // Optional properties with defaults
    background?: string;
    capabilities?: IAgentCapabilities;
    validationSchema?: IValidationSchema;
    maxIterations?: number;
    
    // LLM configuration
    llmConfig: ILLMConfig;
    llmSystemMessage?: string;
    forceFinalAnswer?: boolean;
    
    // Tools and environment
    tools?: any[];
    env?: Record<string, unknown>;
    
    // Metadata and templates
    metadata?: Partial<IAgentMetadata>;
    promptTemplates?: Record<string, unknown>;
    
    // Execution configuration
    executionConfig?: {
        maxRetries?: number;
        timeoutMs?: number;
        errorThreshold?: number;
    };
}

/**
 * Agent validation result interface
 */
export interface IAgentValidationResult extends IValidationResult {
    agent?: IBaseAgent;
    metadata?: {
        timestamp: number;
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
