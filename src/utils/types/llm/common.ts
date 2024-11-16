/**
 * @file common.ts
 * @description Common type definitions shared across LLM modules
 */

// Available LLM providers
export const LLMProviders = {
    GROQ: 'groq',
    OPENAI: 'openai',
    ANTHROPIC: 'anthropic',
    GOOGLE: 'google',
    MISTRAL: 'mistral',
    NONE: 'none'
} as const;

export type LLMProvider = typeof LLMProviders[keyof typeof LLMProviders];

// Token limits for different models
export const TOKEN_LIMITS = {
    GROQ_DEFAULT: 8192,
    OPENAI_GPT4: 8192,
    ANTHROPIC_CLAUDE: 100000,
    GOOGLE_GEMINI: 32768,
    MISTRAL_LARGE: 32768
} as const;

// Base configuration interface for all providers
export interface BaseLLMConfig {
    provider: LLMProvider;
    apiKey?: string | null;
    temperature?: number;
    streaming?: boolean;
    apiBaseUrl?: string;
    maxRetries?: number;
    timeout?: number;
    maxConcurrency?: number;
    headers?: Record<string, string>;
    debug?: boolean;
    stopSequences?: string[];
    model?: string;
}

// Configuration for active providers
export interface ActiveLLMConfig extends BaseLLMConfig {
    provider: Exclude<LLMProvider, 'none'>;
    model: string;
    apiKey: string; // Made required for active configs
}

// Configuration for when no provider is selected
export interface NoneLLMConfig {
    provider: 'none';
    model?: never;
    apiKey?: never;
}

// Union type for all provider configurations
export type LLMConfig = ActiveLLMConfig | NoneLLMConfig;

// Strict type for configurations that require an active provider
export type StrictActiveLLMConfig = ActiveLLMConfig;

// Type guard to check if config is for an active provider
export function isActiveConfig(config: LLMConfig): config is ActiveLLMConfig {
    return config.provider !== 'none';
}

// Helper function to ensure apiKey is present for active configs
export function ensureApiKey(config: LLMConfig, fallbackApiKey?: string): ActiveLLMConfig {
    if (config.provider === 'none') {
        throw new Error('Cannot ensure API key for non-active provider');
    }

    if (config.apiKey) {
        return config as ActiveLLMConfig;
    }

    if (fallbackApiKey) {
        return {
            ...config,
            apiKey: fallbackApiKey
        } as ActiveLLMConfig;
    }

    throw new Error(`API key is required for provider ${config.provider}`);
}

// Streaming chunk interface
export interface StreamingChunk {
    content: string;
    metadata?: Record<string, unknown>;
    finishReason?: string;
    done: boolean;
}

// Base runtime options interface
export interface LLMRuntimeOptions {
    timeoutMs?: number;
    maxRetries?: number;
    abortSignal?: AbortSignal;
    metadata?: Record<string, unknown>;
}

// Base event metadata
export interface LLMEventMetadata {
    provider: LLMProvider;
    model: string;
    requestId?: string;
}
