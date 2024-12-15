/**
 * @file llmProviderTypes.ts
 * @path src/types/llm/llmProviderTypes.ts
 * @description LLM provider-specific type definitions using Langchain
 */

import { BaseChatModel, BaseChatModelCallOptions, BaseChatModelParams } from '@langchain/core/language_models/chat_models';
import { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';
import { AIMessageChunk } from '@langchain/core/messages';
import { ChatGroq } from '@langchain/groq';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatMistralAI } from '@langchain/mistralai';
import { OpenAICoreRequestOptions } from '@langchain/openai';
import { BaseLanguageModelCallOptions, type FunctionDefinition } from '@langchain/core/language_models/base';

import { 
    LLM_PROVIDER_enum,
    GROQ_MODEL_enum,
    OPENAI_MODEL_enum,
    ANTHROPIC_MODEL_enum,
    GOOGLE_MODEL_enum,
    MISTRAL_MODEL_enum,
    MANAGER_CATEGORY_enum,
    ERROR_SEVERITY_enum,
    EnumTypeGuards
} from '../common/enumTypes';
import { HarmCategory, HarmBlockThreshold, SafetySetting } from './googleTypes';
import { ERROR_KINDS, type IBaseError, type IErrorContext, type IErrorType } from '../common/errorTypes';
import type { IBaseMetrics } from '../metrics/base/baseMetrics';
import type { IResourceMetrics } from '../metrics/base/resourceMetrics';
import type { IPerformanceMetrics } from '../metrics/base/performanceMetrics';
import type { IUsageMetrics } from '../metrics/base/usageMetrics';
import type { IRuntimeLLMConfig } from './llmCommonTypes';
import type { IBaseManager, IBaseManagerMetadata } from '../agent/agentManagerTypes';
import type { IHandlerResult } from '../common/baseTypes';
import type { ILLMValidationResult } from './llmValidationTypes';

// Re-export Google types
export { HarmCategory, HarmBlockThreshold, SafetySetting };

// ─── Provider Instance Types ────────────────────────────────────────────────────

export type ProviderMap = {
    [LLM_PROVIDER_enum.GROQ]: ChatGroq;
    [LLM_PROVIDER_enum.OPENAI]: ChatOpenAI;
    [LLM_PROVIDER_enum.ANTHROPIC]: ChatAnthropic;
    [LLM_PROVIDER_enum.GOOGLE]: ChatGoogleGenerativeAI;
    [LLM_PROVIDER_enum.MISTRAL]: ChatMistralAI;
};

export type ProviderInstance = ProviderMap[keyof ProviderMap];

// ─── Provider Call Options ────────────────────────────────────────────────────

/**
 * Named tool choice format matching Langchain's structure
 */
export interface ChatCompletionNamedToolChoice {
    type: "function";
    function: {
        name: string;
    };
}

/**
 * Tool choice type matching Langchain's format
 */
export type ProviderToolChoice = string | ChatCompletionNamedToolChoice | "auto" | "none";

/**
 * Base call options extending Langchain's BaseLanguageModelCallOptions
 */
export interface IBaseProviderCallOptions extends Omit<BaseChatModelCallOptions, 'tool_choice'> {
    tool_choice?: ProviderToolChoice;
    functions?: FunctionDefinition[];
}

export interface IGroqCallOptions extends IBaseProviderCallOptions {
    options?: OpenAICoreRequestOptions;
}

export interface IOpenAICallOptions extends IBaseProviderCallOptions {
    options?: OpenAICoreRequestOptions;
    logprobs?: boolean;
    topLogprobs?: number;
}

export interface IAnthropicCallOptions extends IBaseProviderCallOptions {
    options?: OpenAICoreRequestOptions;
    anthropicApiVersion?: string;
}

export interface IGoogleCallOptions extends IBaseProviderCallOptions {
    options?: OpenAICoreRequestOptions;
    safetySettings?: Array<{
        category: string;
        threshold: string;
    }>;
}

export interface IMistralCallOptions extends IBaseProviderCallOptions {
    options?: OpenAICoreRequestOptions;
    safeMode?: boolean;
}

export type ProviderCallOptions = IBaseProviderCallOptions & (
    | IGroqCallOptions 
    | IOpenAICallOptions 
    | IAnthropicCallOptions 
    | IGoogleCallOptions 
    | IMistralCallOptions
);

// ─── Base LLM Configuration ────────────────────────────────────────────────────

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

// ─── Provider-Specific Configurations ────────────────────────────────────────────

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

// ─── Provider Manager Interface ────────────────────────────────────────────────

export interface IProviderManager extends IBaseManager {
    readonly category: MANAGER_CATEGORY_enum.RESOURCE;
    validateProviderConfig(config: ILLMProviderConfig): Promise<void>;
    getProviderInstance<T extends ILLMProviderConfig>(config: T): Promise<IHandlerResult<ProviderInstance>>;
    validateConfig(config: ILLMProviderConfig): Promise<ILLMValidationResult>;
    validate(params: unknown): Promise<boolean>;
    getMetadata(): IBaseManagerMetadata;
}

// ─── Provider Error Types ────────────────────────────────────────────────────────

export interface IProviderErrorContext extends IErrorContext {
    provider: LLM_PROVIDER_enum;
    model?: string;
    instanceId?: string;
    requestId?: string;
    tokenUsage?: {
        prompt: number;
        completion: number;
        total: number;
    };
    latency?: number;
    statusCode?: number;
    rateLimitInfo?: {
        limit: number;
        remaining: number;
        reset: number;
    };
}

// ─── Provider Metrics ────────────────────────────────────────────────────────

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
    timestamp: number;
}

export interface IOpenAIMetrics extends IBaseProviderMetrics {
    provider: LLM_PROVIDER_enum.OPENAI;
    model: OPENAI_MODEL_enum;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    requestOverhead: number;
    timestamp: number;
}

export interface IAnthropicMetrics extends IBaseProviderMetrics {
    provider: LLM_PROVIDER_enum.ANTHROPIC;
    model: ANTHROPIC_MODEL_enum;
    contextUtilization: number;
    responseQuality: number;
    modelConfidence: number;
    timestamp: number;
}

export interface IGoogleMetrics extends IBaseProviderMetrics {
    provider: LLM_PROVIDER_enum.GOOGLE;
    model: GOOGLE_MODEL_enum;
    safetyRatings: Record<HarmCategory, number>;
    modelLatency: number;
    apiOverhead: number;
    timestamp: number;
}

export interface IMistralMetrics extends IBaseProviderMetrics {
    provider: LLM_PROVIDER_enum.MISTRAL;
    model: MISTRAL_MODEL_enum;
    inferenceTime: number;
    throughput: number;
    gpuMemoryUsage: number;
    timestamp: number;
}

// ─── Provider Type Unions ────────────────────────────────────────────────────────

export type ILLMProviderConfig = 
    | IGroqConfig 
    | IOpenAIConfig 
    | IAnthropicConfig 
    | IGoogleConfig 
    | IMistralConfig;

export type ILLMProviderMetrics = 
    | IGroqMetrics 
    | IOpenAIMetrics 
    | IAnthropicMetrics 
    | IGoogleMetrics 
    | IMistralMetrics;

// ─── Type Guards ────────────────────────────────────────────────────────────

export const ILLMProviderTypeGuards = {
    isGroqConfig: (config: ILLMProviderConfig): config is IGroqConfig => {
        return config.provider === LLM_PROVIDER_enum.GROQ && EnumTypeGuards.isGroqModel(config.model);
    },

    isOpenAIConfig: (config: ILLMProviderConfig): config is IOpenAIConfig => {
        return config.provider === LLM_PROVIDER_enum.OPENAI && EnumTypeGuards.isOpenAIModel(config.model);
    },

    isAnthropicConfig: (config: ILLMProviderConfig): config is IAnthropicConfig => {
        return config.provider === LLM_PROVIDER_enum.ANTHROPIC && EnumTypeGuards.isAnthropicModel(config.model);
    },

    isGoogleConfig: (config: ILLMProviderConfig): config is IGoogleConfig => {
        return config.provider === LLM_PROVIDER_enum.GOOGLE && EnumTypeGuards.isGoogleModel(config.model);
    },

    isMistralConfig: (config: ILLMProviderConfig): config is IMistralConfig => {
        return config.provider === LLM_PROVIDER_enum.MISTRAL && EnumTypeGuards.isMistralModel(config.model);
    },

    isGroqMetrics: (metrics: ILLMProviderMetrics): metrics is IGroqMetrics => {
        return metrics.provider === LLM_PROVIDER_enum.GROQ && EnumTypeGuards.isGroqModel(metrics.model);
    },

    isOpenAIMetrics: (metrics: ILLMProviderMetrics): metrics is IOpenAIMetrics => {
        return metrics.provider === LLM_PROVIDER_enum.OPENAI && EnumTypeGuards.isOpenAIModel(metrics.model);
    },

    isAnthropicMetrics: (metrics: ILLMProviderMetrics): metrics is IAnthropicMetrics => {
        return metrics.provider === LLM_PROVIDER_enum.ANTHROPIC && EnumTypeGuards.isAnthropicModel(metrics.model);
    },

    isGoogleMetrics: (metrics: ILLMProviderMetrics): metrics is IGoogleMetrics => {
        return metrics.provider === LLM_PROVIDER_enum.GOOGLE && EnumTypeGuards.isGoogleModel(metrics.model);
    },

    isMistralMetrics: (metrics: ILLMProviderMetrics): metrics is IMistralMetrics => {
        return metrics.provider === LLM_PROVIDER_enum.MISTRAL && EnumTypeGuards.isMistralModel(metrics.model);
    }
};
