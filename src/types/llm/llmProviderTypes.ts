/**
 * @file llmProviderTypes.ts
 * @path src/types/llm/llmProviderTypes.ts
 * @description LLM provider-specific type definitions and configuration
 *
 * @module @types/llm
 */

import { 
    LLM_PROVIDER_enum,
    GROQ_MODEL_enum,
    OPENAI_MODEL_enum,
    ANTHROPIC_MODEL_enum,
    GOOGLE_MODEL_enum,
    MISTRAL_MODEL_enum,
    EnumTypeGuards
} from '../common/commonEnums';
import type { IBaseMetrics } from '../metrics/base/baseMetrics';
import type { IResourceMetrics } from '../metrics/base/resourceMetrics';
import type { IPerformanceMetrics } from '../metrics/base/performanceMetrics';
import type { IUsageMetrics } from '../metrics/base/usageMetrics';

// ─── Base Configuration ────────────────────────────────────────────────────────

export interface IBaseLLMConfig {
    apiKey?: string;        // API key for authentication
    apiBaseUrl?: string;    // Base URL for API requests
    maxRetries?: number;    // Maximum retries for failed requests
    timeout?: number;       // Timeout in milliseconds */
    model: string;          // Model identifier */
    provider: LLM_PROVIDER_enum;  // Provider identifier */
    temperature?: number;   // Temperature for response generation */
    maxTokens?: number;     // Maximum tokens to generate */
    topP?: number;          // Top P sampling */
    topK?: number;          // Top K sampling */
    callbacks?: any;        // Callback functions
    metadata?: Record<string, unknown>; // Additional metadata
}

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
    safetySettings?: {
        category: string;
        threshold: number;
    }[];
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
    safetyRatings: Record<string, number>;
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
        return config.provider === LLM_PROVIDER_enum.GROQ;
    },

    isOpenAIConfig: (config: LLMProviderConfig): config is IOpenAIConfig => {
        return config.provider === LLM_PROVIDER_enum.OPENAI;
    },

    isAnthropicConfig: (config: LLMProviderConfig): config is IAnthropicConfig => {
        return config.provider === LLM_PROVIDER_enum.ANTHROPIC;
    },

    isGoogleConfig: (config: LLMProviderConfig): config is IGoogleConfig => {
        return config.provider === LLM_PROVIDER_enum.GOOGLE;
    },

    isMistralConfig: (config: LLMProviderConfig): config is IMistralConfig => {
        return config.provider === LLM_PROVIDER_enum.MISTRAL;
    },

    isGroqMetrics: (metrics: LLMProviderMetrics): metrics is IGroqMetrics => {
        return metrics.provider === LLM_PROVIDER_enum.GROQ;
    },

    isOpenAIMetrics: (metrics: LLMProviderMetrics): metrics is IOpenAIMetrics => {
        return metrics.provider === LLM_PROVIDER_enum.OPENAI;
    },

    isAnthropicMetrics: (metrics: LLMProviderMetrics): metrics is IAnthropicMetrics => {
        return metrics.provider === LLM_PROVIDER_enum.ANTHROPIC;
    },

    isGoogleMetrics: (metrics: LLMProviderMetrics): metrics is IGoogleMetrics => {
        return metrics.provider === LLM_PROVIDER_enum.GOOGLE;
    },

    isMistralMetrics: (metrics: LLMProviderMetrics): metrics is IMistralMetrics => {
        return metrics.provider === LLM_PROVIDER_enum.MISTRAL;
    }
};

// ─── Runtime Configuration Helpers ────────────────────────────────────────────

export interface IRuntimeConfig extends Omit<IBaseLLMConfig, 'provider' | 'model'> {
    provider: LLM_PROVIDER_enum;
    model: string;
}

export const createProviderConfig = (config: IRuntimeConfig): LLMProviderConfig => {
    const { provider, model, ...rest } = config;

    switch (provider) {
        case LLM_PROVIDER_enum.GROQ:
            if (!EnumTypeGuards.isGroqModel(model)) {
                throw new Error(`Invalid model ${model} for provider ${provider}`);
            }
            return {
                ...rest,
                provider,
                model: model as GROQ_MODEL_enum
            };

        case LLM_PROVIDER_enum.OPENAI:
            if (!EnumTypeGuards.isOpenAIModel(model)) {
                throw new Error(`Invalid model ${model} for provider ${provider}`);
            }
            return {
                ...rest,
                provider,
                model: model as OPENAI_MODEL_enum
            };

        case LLM_PROVIDER_enum.ANTHROPIC:
            if (!EnumTypeGuards.isAnthropicModel(model)) {
                throw new Error(`Invalid model ${model} for provider ${provider}`);
            }
            return {
                ...rest,
                provider,
                model: model as ANTHROPIC_MODEL_enum
            };

        case LLM_PROVIDER_enum.GOOGLE:
            if (!EnumTypeGuards.isGoogleModel(model)) {
                throw new Error(`Invalid model ${model} for provider ${provider}`);
            }
            return {
                ...rest,
                provider,
                model: model as GOOGLE_MODEL_enum
            };

        case LLM_PROVIDER_enum.MISTRAL:
            if (!EnumTypeGuards.isMistralModel(model)) {
                throw new Error(`Invalid model ${model} for provider ${provider}`);
            }
            return {
                ...rest,
                provider,
                model: model as MISTRAL_MODEL_enum
            };

        default:
            throw new Error(`Unsupported provider: ${provider}`);
    }
};

// ─── Runtime Type Guard ────────────────────────────────────────────────────────

export const isRuntimeConfig = (config: unknown): config is IRuntimeConfig => {
    if (typeof config !== 'object' || config === null) return false;
    const c = config as IRuntimeConfig;
    return (
        typeof c.provider === 'string' &&
        typeof c.model === 'string' &&
        Object.values(LLM_PROVIDER_enum).includes(c.provider as LLM_PROVIDER_enum)
    );
};
