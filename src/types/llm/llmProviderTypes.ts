/**
 * @file llmProviderTypes.ts
 * @path src/types/llm/llmProviderTypes.ts
 * @description LLM provider-specific type definitions using Langchain
 */

import { BaseChatModel, BaseChatModelParams } from '@langchain/core/language_models/chat_models';
import { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';
import { 
    LLM_PROVIDER_enum,
    GROQ_MODEL_enum,
    OPENAI_MODEL_enum,
    ANTHROPIC_MODEL_enum,
    GOOGLE_MODEL_enum,
    MISTRAL_MODEL_enum,
    EnumTypeGuards
} from '../common/commonEnums';
import { HarmCategory, HarmBlockThreshold, SafetySetting } from './googleTypes';
import type { IBaseMetrics } from '../metrics/base/baseMetrics';
import type { IResourceMetrics } from '../metrics/base/resourceMetrics';
import type { IPerformanceMetrics } from '../metrics/base/performanceMetrics';
import type { IUsageMetrics } from '../metrics/base/usageMetrics';
import type { IBaseLLMConfig } from './llmCommonTypes';

// ─── Provider-Specific Configurations ──────────────────────────────────────────

export interface IGroqConfig extends Omit<IBaseLLMConfig, 'model' | 'provider'> {
    provider: LLM_PROVIDER_enum.GROQ;
    model: GROQ_MODEL_enum;
    contextWindow?: number;
    streamingLatency?: number;
}

export interface IOpenAIConfig extends Omit<IBaseLLMConfig, 'model' | 'provider'> {
    provider: LLM_PROVIDER_enum.OPENAI;
    model: OPENAI_MODEL_enum;
    frequencyPenalty?: number;
    presencePenalty?: number;
    organization?: string;
}

export interface IAnthropicConfig extends Omit<IBaseLLMConfig, 'model' | 'provider'> {
    provider: LLM_PROVIDER_enum.ANTHROPIC;
    model: ANTHROPIC_MODEL_enum;
    anthropicApiUrl?: string;
    contextUtilization?: number;
}

export interface IGoogleConfig extends Omit<IBaseLLMConfig, 'model' | 'provider'> {
    provider: LLM_PROVIDER_enum.GOOGLE;
    model: GOOGLE_MODEL_enum;
    baseUrl?: string;
    safetySettings?: SafetySetting[];
}

export interface IMistralConfig extends Omit<IBaseLLMConfig, 'model' | 'provider'> {
    provider: LLM_PROVIDER_enum.MISTRAL;
    model: MISTRAL_MODEL_enum;
    endpoint?: string;
    inferenceOptions?: {
        numThreads?: number;
        useGpu?: boolean;
    };
}

// ─── Provider Metrics ──────────────────────────────────────────────────────────

export interface IBaseProviderMetrics extends IBaseMetrics {
    provider: LLM_PROVIDER_enum;
    model: string;
    latency: number;
    tokenUsage: {
        prompt: number;
        completion: number;
        total: number;
    };
    cost: {
        promptCost: number;
        completionCost: number;
        totalCost: number;
        currency: string;
    };
    resources: IResourceMetrics;
    performance: IPerformanceMetrics;
    usage: IUsageMetrics;
    callback?: CallbackManagerForLLMRun;
}

export interface IGroqMetrics extends IBaseProviderMetrics {
    provider: LLM_PROVIDER_enum.GROQ;
    model: GROQ_MODEL_enum;
    contextWindow: number;
    streamingLatency: number;
    gpuUtilization: number;
}

export interface IOpenAIMetrics extends IBaseProviderMetrics {
    provider: LLM_PROVIDER_enum.OPENAI;
    model: OPENAI_MODEL_enum;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    requestOverhead: number;
}

export interface IAnthropicMetrics extends IBaseProviderMetrics {
    provider: LLM_PROVIDER_enum.ANTHROPIC;
    model: ANTHROPIC_MODEL_enum;
    contextUtilization: number;
    responseQuality: number;
    modelConfidence: number;
}

export interface IGoogleMetrics extends IBaseProviderMetrics {
    provider: LLM_PROVIDER_enum.GOOGLE;
    model: GOOGLE_MODEL_enum;
    safetyRatings: Record<HarmCategory, number>;
    modelLatency: number;
    apiOverhead: number;
}

export interface IMistralMetrics extends IBaseProviderMetrics {
    provider: LLM_PROVIDER_enum.MISTRAL;
    model: MISTRAL_MODEL_enum;
    inferenceTime: number;
    throughput: number;
    gpuMemoryUsage: number;
}

// ─── Provider Type Unions ────────────────────────────────────────────────────────

export type LLMProviderConfig = 
    | IGroqConfig 
    | IOpenAIConfig 
    | IAnthropicConfig 
    | IGoogleConfig 
    | IMistralConfig;

export type LLMProviderMetrics = 
    | IGroqMetrics 
    | IOpenAIMetrics 
    | IAnthropicMetrics 
    | IGoogleMetrics 
    | IMistralMetrics;

// ─── Type Guards ────────────────────────────────────────────────────────────

export const LLMProviderTypeGuards = {
    isGroqConfig: (config: LLMProviderConfig): config is IGroqConfig => {
        return config.provider === LLM_PROVIDER_enum.GROQ && EnumTypeGuards.isGroqModel(config.model);
    },

    isOpenAIConfig: (config: LLMProviderConfig): config is IOpenAIConfig => {
        return config.provider === LLM_PROVIDER_enum.OPENAI && EnumTypeGuards.isOpenAIModel(config.model);
    },

    isAnthropicConfig: (config: LLMProviderConfig): config is IAnthropicConfig => {
        return config.provider === LLM_PROVIDER_enum.ANTHROPIC && EnumTypeGuards.isAnthropicModel(config.model);
    },

    isGoogleConfig: (config: LLMProviderConfig): config is IGoogleConfig => {
        return config.provider === LLM_PROVIDER_enum.GOOGLE && EnumTypeGuards.isGoogleModel(config.model);
    },

    isMistralConfig: (config: LLMProviderConfig): config is IMistralConfig => {
        return config.provider === LLM_PROVIDER_enum.MISTRAL && EnumTypeGuards.isMistralModel(config.model);
    },

    isGroqMetrics: (metrics: LLMProviderMetrics): metrics is IGroqMetrics => {
        return metrics.provider === LLM_PROVIDER_enum.GROQ && EnumTypeGuards.isGroqModel(metrics.model);
    },

    isOpenAIMetrics: (metrics: LLMProviderMetrics): metrics is IOpenAIMetrics => {
        return metrics.provider === LLM_PROVIDER_enum.OPENAI && EnumTypeGuards.isOpenAIModel(metrics.model);
    },

    isAnthropicMetrics: (metrics: LLMProviderMetrics): metrics is IAnthropicMetrics => {
        return metrics.provider === LLM_PROVIDER_enum.ANTHROPIC && EnumTypeGuards.isAnthropicModel(metrics.model);
    },

    isGoogleMetrics: (metrics: LLMProviderMetrics): metrics is IGoogleMetrics => {
        return metrics.provider === LLM_PROVIDER_enum.GOOGLE && EnumTypeGuards.isGoogleModel(metrics.model);
    },

    isMistralMetrics: (metrics: LLMProviderMetrics): metrics is IMistralMetrics => {
        return metrics.provider === LLM_PROVIDER_enum.MISTRAL && EnumTypeGuards.isMistralModel(metrics.model);
    }
};
