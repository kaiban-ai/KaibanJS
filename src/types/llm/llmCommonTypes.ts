/**
 * @file llmCommonTypes.ts
 * @path src/types/llm/llmCommonTypes.ts
 * @description Common LLM type definitions integrated with Langchain
 *
 * @module @types/llm
 */

import { BaseChatModel, BaseChatModelParams } from '@langchain/core/language_models/chat_models';
import { 
    LLM_PROVIDER_enum,
    GROQ_MODEL_enum,
    OPENAI_MODEL_enum,
    ANTHROPIC_MODEL_enum,
    GOOGLE_MODEL_enum,
    MISTRAL_MODEL_enum,
    EnumTypeGuards
} from '../common/commonEnums';
import type { IValidationResult } from '../common/commonValidationTypes';

// Provider display names mapping
export const LLMProviders: Record<LLM_PROVIDER_enum, string> = {
    [LLM_PROVIDER_enum.GROQ]: 'Groq',
    [LLM_PROVIDER_enum.OPENAI]: 'OpenAI',
    [LLM_PROVIDER_enum.ANTHROPIC]: 'Anthropic',
    [LLM_PROVIDER_enum.GOOGLE]: 'Google',
    [LLM_PROVIDER_enum.MISTRAL]: 'Mistral'
};

// Runtime options extending Langchain's base params
export interface ILLMRuntimeOptions extends BaseChatModelParams {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    topK?: number;
    streaming?: boolean;
    timeout?: number;
}

// Streaming chunk type for streaming responses
export interface IStreamingChunk {
    content: string;
    done: boolean;
    metadata?: {
        timestamp: number;
        chunkIndex: number;
        totalChunks?: number;
    };
}

// Base configuration type extending Langchain's base params
export interface IBaseLLMConfig extends BaseChatModelParams {
    provider: LLM_PROVIDER_enum;
    model: string;
    apiKey?: string;
    apiBaseUrl?: string;
    maxRetries?: number;
    timeout?: number;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    topK?: number;
    contextWindow?: number;
    streamingLatency?: number;
}

// Provider-specific configurations extending Langchain's base model
export interface IGroqConfig extends Omit<IBaseLLMConfig, 'model'> {
    provider: LLM_PROVIDER_enum.GROQ;
    model: GROQ_MODEL_enum;
}

export interface IOpenAIConfig extends Omit<IBaseLLMConfig, 'model'> {
    provider: LLM_PROVIDER_enum.OPENAI;
    model: OPENAI_MODEL_enum;
}

export interface IAnthropicConfig extends Omit<IBaseLLMConfig, 'model'> {
    provider: LLM_PROVIDER_enum.ANTHROPIC;
    model: ANTHROPIC_MODEL_enum;
}

export interface IGoogleConfig extends Omit<IBaseLLMConfig, 'model'> {
    provider: LLM_PROVIDER_enum.GOOGLE;
    model: GOOGLE_MODEL_enum;
}

export interface IMistralConfig extends Omit<IBaseLLMConfig, 'model'> {
    provider: LLM_PROVIDER_enum.MISTRAL;
    model: MISTRAL_MODEL_enum;
}

// Union type for all provider configurations
export type LLMProviderConfig = 
    | IGroqConfig
    | IOpenAIConfig
    | IAnthropicConfig
    | IGoogleConfig
    | IMistralConfig;

// Common configuration type used by agents
export type ILLMConfig = LLMProviderConfig;

// Default configuration
export const DEFAULT_LLM_CONFIG: IBaseLLMConfig = {
    provider: LLM_PROVIDER_enum.GROQ,
    model: GROQ_MODEL_enum.MIXTRAL,
    maxRetries: 3,
    timeout: 30000,
    temperature: 0.7,
    maxTokens: 2048,
    topP: 1,
    topK: 40
};

// Utility functions
export const convertToProviderConfig = (config: IBaseLLMConfig): LLMProviderConfig => {
    if (!EnumTypeGuards.isLLMProvider(config.provider)) {
        throw new Error(`Invalid provider: ${config.provider}`);
    }

    if (!EnumTypeGuards.isValidModelForProvider(config.model, config.provider)) {
        throw new Error(`Invalid model ${config.model} for provider ${config.provider}`);
    }

    return config as LLMProviderConfig;
};

// Langchain integration types
export interface ILangchainConfig extends BaseChatModelParams {
    provider: LLM_PROVIDER_enum;
    model: string;
    // Additional KaibanJS-specific fields
    apiKey?: string;
    apiBaseUrl?: string;
    maxRetries?: number;
    streamingLatency?: number;
}

// Type guard for Langchain model instances
export const isLangchainModel = (model: any): model is BaseChatModel => {
    return model instanceof BaseChatModel;
};

// Runtime configuration types
export interface IRuntimeLLMConfig extends Omit<IBaseLLMConfig, 'provider' | 'model'> {
    provider: LLM_PROVIDER_enum;
    model: string;
}

// Active configuration type for runtime
export interface IActiveLLMConfig extends IRuntimeLLMConfig {
    tags?: string[];
}

// Validation helper
export const isValidProviderConfig = (config: IBaseLLMConfig): config is LLMProviderConfig => {
    return EnumTypeGuards.isLLMProvider(config.provider) && 
           EnumTypeGuards.isValidModelForProvider(config.model, config.provider);
};
