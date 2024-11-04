/**
 * @file common.ts
 * @path src/types/llm/common.ts
 * @description Common type definitions shared across LLM modules
 *
 * @packageDocumentation
 * @module @types/llm
 */

/**
 * Available LLM providers
 */
export const LLMProviders = {
    GROQ: 'groq',
    OPENAI: 'openai',
    ANTHROPIC: 'anthropic',
    GOOGLE: 'google',
    MISTRAL: 'mistral'
} as const;

export type LLMProvider = typeof LLMProviders[keyof typeof LLMProviders];

/**
 * Token limits for different models
 */
export const TOKEN_LIMITS = {
    GROQ_DEFAULT: 8192,
    OPENAI_GPT4: 8192,
    ANTHROPIC_CLAUDE: 100000,
    GOOGLE_GEMINI: 32768,
    MISTRAL_LARGE: 32768
} as const;

/**
 * Streaming chunk interface
 */
export interface StreamingChunk {
    content: string;
    metadata?: Record<string, unknown>;
    finishReason?: string;
    done: boolean;
}

/**
 * Base runtime options interface
 */
export interface LLMRuntimeOptions {
    timeoutMs?: number;
    maxRetries?: number;
    abortSignal?: AbortSignal;
    metadata?: Record<string, unknown>;
}

/**
 * Common configuration interface
 */
export interface BaseLLMConfig {
    provider: LLMProvider;
    model: string;
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
}

/**
 * Base event metadata
 */
export interface LLMEventMetadata {
    provider: LLMProvider;
    model: string;
    requestId?: string;
}