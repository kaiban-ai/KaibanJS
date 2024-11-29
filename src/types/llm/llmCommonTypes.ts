/**
 * @file llmCommonTypes.ts
 * @path src/types/llm/llmCommonTypes.ts
 * @description Common LLM type definitions using Langchain
 *
 * @module @types/llm
 */

import { BaseChatModel, BaseChatModelParams, BaseChatModelCallOptions } from '@langchain/core/language_models/chat_models';
import { AIMessageChunk } from '@langchain/core/messages';
import { Callbacks } from '@langchain/core/callbacks/manager';
import { 
    LLM_PROVIDER_enum,
    GROQ_MODEL_enum,
    OPENAI_MODEL_enum,
    ANTHROPIC_MODEL_enum,
    GOOGLE_MODEL_enum,
    MISTRAL_MODEL_enum,
    EnumTypeGuards
} from '../common/commonEnums';

// Provider display names mapping
export const LLMProviders: Record<LLM_PROVIDER_enum, string> = {
    [LLM_PROVIDER_enum.GROQ]: 'Groq',
    [LLM_PROVIDER_enum.OPENAI]: 'OpenAI',
    [LLM_PROVIDER_enum.ANTHROPIC]: 'Anthropic',
    [LLM_PROVIDER_enum.GOOGLE]: 'Google',
    [LLM_PROVIDER_enum.MISTRAL]: 'Mistral'
};

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
    streaming?: boolean;
    stop?: string[];
    presencePenalty?: number;
    frequencyPenalty?: number;
    repetitionPenalty?: number;
}

// Safety settings type for Google provider
export interface IGoogleSafetySettings {
    category: string;
    threshold: 'BLOCK_NONE' | 'BLOCK_LOW' | 'BLOCK_MEDIUM' | 'BLOCK_HIGH';
}

// Provider-specific configurations extending Langchain's base model
export interface IGroqConfig extends Omit<IBaseLLMConfig, 'model'> {
    provider: LLM_PROVIDER_enum.GROQ;
    model: GROQ_MODEL_enum;
    streaming?: boolean;
    stop?: string[];
    streamingLatency?: number;
}

export interface IOpenAIConfig extends Omit<IBaseLLMConfig, 'model'> {
    provider: LLM_PROVIDER_enum.OPENAI;
    model: OPENAI_MODEL_enum;
    streaming?: boolean;
    presencePenalty?: number;
    frequencyPenalty?: number;
    functions?: Array<{
        name: string;
        description?: string;
        parameters: Record<string, unknown>;
    }>;
}

export interface IAnthropicConfig extends Omit<IBaseLLMConfig, 'model'> {
    provider: LLM_PROVIDER_enum.ANTHROPIC;
    model: ANTHROPIC_MODEL_enum;
    streaming?: boolean;
    maxTokensToSample?: number;
    stopSequences?: string[];
    anthropicVersion?: string;
}

export interface IGoogleConfig extends Omit<IBaseLLMConfig, 'model'> {
    provider: LLM_PROVIDER_enum.GOOGLE;
    model: GOOGLE_MODEL_enum;
    streaming?: boolean;
    safetySettings?: IGoogleSafetySettings[];
    stopSequences?: string[];
    candidateCount?: number;
    maxOutputTokens?: number;
}

export interface IMistralConfig extends Omit<IBaseLLMConfig, 'model'> {
    provider: LLM_PROVIDER_enum.MISTRAL;
    model: MISTRAL_MODEL_enum;
    streaming?: boolean;
    safeMode?: boolean;
    randomSeed?: number;
    repetitionPenalty?: number;
}

// Union type for all provider configurations
export type LLMProviderConfig = 
    | IGroqConfig 
    | IOpenAIConfig 
    | IAnthropicConfig 
    | IGoogleConfig 
    | IMistralConfig;

// Alias for backward compatibility
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
    topK: 40,
    streaming: false,
    streamingLatency: 100
};

// Runtime configuration type
export interface IRuntimeLLMConfig extends BaseChatModelCallOptions {
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
    streaming?: boolean;
    stop?: string[];
    presencePenalty?: number;
    frequencyPenalty?: number;
    repetitionPenalty?: number;
    tags?: string[];
    callbacks?: Callbacks;
}

// Streaming chunk type extending Langchain's AIMessageChunk
export interface IStreamingChunk {
    content: string;
    done: boolean;
    metadata?: {
        timestamp: number;
        chunkIndex: number;
        totalChunks?: number;
        tokenCount?: number;
        streamingLatency?: number;
    };
    // Additional fields from AIMessageChunk that might be needed
    type?: string;
    name?: string;
    additional_kwargs?: Record<string, unknown>;
}

// Runtime configuration helpers
export const createProviderConfig = (config: IRuntimeLLMConfig): LLMProviderConfig => {
    const { provider, model, tags, callbacks, ...rest } = config;

    const baseConfig = {
        ...rest,
        callbacks: callbacks as BaseChatModelParams['callbacks']
    };

    switch (provider) {
        case LLM_PROVIDER_enum.GROQ: {
            if (!EnumTypeGuards.isGroqModel(model)) {
                throw new Error(`Invalid model ${model} for provider ${provider}`);
            }
            return {
                ...baseConfig,
                provider: LLM_PROVIDER_enum.GROQ,
                model: model as GROQ_MODEL_enum
            } as IGroqConfig;
        }

        case LLM_PROVIDER_enum.OPENAI: {
            if (!EnumTypeGuards.isOpenAIModel(model)) {
                throw new Error(`Invalid model ${model} for provider ${provider}`);
            }
            return {
                ...baseConfig,
                provider: LLM_PROVIDER_enum.OPENAI,
                model: model as OPENAI_MODEL_enum
            } as IOpenAIConfig;
        }

        case LLM_PROVIDER_enum.ANTHROPIC: {
            if (!EnumTypeGuards.isAnthropicModel(model)) {
                throw new Error(`Invalid model ${model} for provider ${provider}`);
            }
            return {
                ...baseConfig,
                provider: LLM_PROVIDER_enum.ANTHROPIC,
                model: model as ANTHROPIC_MODEL_enum
            } as IAnthropicConfig;
        }

        case LLM_PROVIDER_enum.GOOGLE: {
            if (!EnumTypeGuards.isGoogleModel(model)) {
                throw new Error(`Invalid model ${model} for provider ${provider}`);
            }
            return {
                ...baseConfig,
                provider: LLM_PROVIDER_enum.GOOGLE,
                model: model as GOOGLE_MODEL_enum
            } as IGoogleConfig;
        }

        case LLM_PROVIDER_enum.MISTRAL: {
            if (!EnumTypeGuards.isMistralModel(model)) {
                throw new Error(`Invalid model ${model} for provider ${provider}`);
            }
            return {
                ...baseConfig,
                provider: LLM_PROVIDER_enum.MISTRAL,
                model: model as MISTRAL_MODEL_enum
            } as IMistralConfig;
        }

        default:
            throw new Error(`Unsupported provider: ${provider}`);
    }
};

// Type guards
export const isLangchainModel = (model: unknown): model is BaseChatModel => {
    return model instanceof BaseChatModel;
};

export const isRuntimeConfig = (config: unknown): config is IRuntimeLLMConfig => {
    if (typeof config !== 'object' || config === null) return false;
    const c = config as IRuntimeLLMConfig;
    return (
        typeof c.provider === 'string' &&
        typeof c.model === 'string' &&
        Object.values(LLM_PROVIDER_enum).includes(c.provider as LLM_PROVIDER_enum)
    );
};
