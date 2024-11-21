/**
 * @file llmCommonTypes.ts
 * @path KaibanJS/src/types/llm/llmCommonTypes.ts
 * @description Common type definitions shared across LLM modules
 *
 * @module types/llm
 */

import { ILLMUsageStats } from './llmResponseTypes';
import { ICostDetails } from '../tool/toolExecutionTypes';
import { IBaseHandlerMetadata } from '../common/commonMetadataTypes';

// ─── Provider Constants ─────────────────────────────────────────────────────────

export const LLMProviders = {
    GROQ: 'groq',
    OPENAI: 'openai',
    ANTHROPIC: 'anthropic',
    GOOGLE: 'google',
    MISTRAL: 'mistral',
    NONE: 'none'
} as const;

export type ILLMProvider = (typeof LLMProviders)[keyof typeof LLMProviders];

// ─── Streaming Types ──────────────────────────────────────────────────────────

export const StreamingFinishReasons = {
    STOP: 'stop',
    LENGTH: 'length',
    TOOL_CALLS: 'tool_calls',
    CONTENT_FILTER: 'content_filter',
    ERROR: 'error'
} as const;

export type IStreamingFinishReason = typeof StreamingFinishReasons[keyof typeof StreamingFinishReasons];

export interface ILLMEventMetadata extends IBaseHandlerMetadata {
    llm: {
        provider: ILLMProvider;
        model: string;
        requestId?: string;
    };
}

export interface IStreamingChunk {
    content: string;
    metadata?: ILLMEventMetadata;
    finishReason?: IStreamingFinishReason;
    done: boolean;
}

// ─── Runtime Options ─────────────────────────────────────────────────────────

export interface ILLMRuntimeOptions {
    timeoutMs?: number;
    maxRetries?: number;
    abortSignal?: AbortSignal;
    metadata?: Record<string, unknown>;
    
    onChunk?: (chunk: IStreamingChunk) => void;
    onComplete?: (chunk: IStreamingChunk) => void;
    onError?: (error: Error) => void;
}

// ─── Token Limits ───────────────────────────────────────────────────────────

export const TOKEN_LIMITS = {
    GROQ_DEFAULT: 8192,
    OPENAI_GPT4: 8192,
    ANTHROPIC_CLAUDE: 100000,
    GOOGLE_GEMINI: 32768,
    MISTRAL_LARGE: 32768
} as const;

// ─── Configuration Types ──────────────────────────────────────────────────────

export interface IBaseLLMConfig {
    provider: ILLMProvider;
    model?: string;
    apiKey?: string;
    temperature?: number;
    streaming?: boolean;
    apiBaseUrl?: string;
    maxRetries?: number;
    timeout?: number;
    maxConcurrency?: number;
    headers?: Record<string, string>;
    debug?: boolean;
    stopSequences?: string[];
    
    usageStats?: ILLMUsageStats;
    costDetails?: ICostDetails;
}

export interface IActiveLLMConfig extends IBaseLLMConfig {
    provider: Exclude<ILLMProvider, 'none'>;
    model: string;
    apiKey: string;
}

export interface INoneLLMConfig extends IBaseLLMConfig {
    provider: 'none';
}

export type ILLMConfig = IActiveLLMConfig | INoneLLMConfig;

// ─── Type Guards ─────────────────────────────────────────────────────────────

export const isActiveConfig = (config: ILLMConfig): config is IActiveLLMConfig => {
    return config.provider !== 'none';
};

// ─── Helper Functions ────────────────────────────────────────────────────────

export const ensureApiKey = (config: ILLMConfig, fallbackApiKey?: string): IActiveLLMConfig => {
    if (config.provider === 'none') {
        throw new Error('Cannot ensure API key for non-active provider');
    }

    if (config.apiKey) {
        return config as IActiveLLMConfig;
    }

    if (fallbackApiKey) {
        return {
            ...config,
            apiKey: fallbackApiKey
        } as IActiveLLMConfig;
    }

    throw new Error(`API key is required for provider ${config.provider}`);
};
