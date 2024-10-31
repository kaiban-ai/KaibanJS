/**
 * @file providers.ts
 * @path src/types/llm/providers.ts
 * @description Type definitions for LLM providers and their configurations
 *
 * @packageDocumentation
 * @module @types/llm
 */

import { SafetySetting } from "@google/generative-ai";
import { Tool } from "langchain/tools";
import { ChatGroqCallbacks } from "./callbacks";

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
 * Base configuration interface for all LLM providers
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
 * Runtime options for LLM requests
 */
export interface LLMRuntimeOptions {
    timeoutMs?: number;
    maxRetries?: number;
    abortSignal?: AbortSignal;
    metadata?: Record<string, unknown>;
}

/**
 * Groq-specific configuration
 */
export interface GroqConfig extends BaseLLMConfig {
    provider: 'groq';
    stop?: string | string[] | null;
    temperature?: number;
    max_tokens?: number;
    responseFormat?: 'json' | 'text';
    topK?: number;
    presencePenalty?: number;
    frequencyPenalty?: number;
    callbacks?: ChatGroqCallbacks;
}

/**
 * OpenAI-specific configuration
 */
export interface OpenAIConfig extends BaseLLMConfig {
    provider: 'openai';
    max_tokens?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
    top_p?: number;
    n?: number;
    stop?: string[];
    model_kwargs?: Record<string, unknown>;
    organization?: string;
    responseFormat?: { 
        type: 'text' | 'json_object'; 
        schema?: Record<string, unknown> 
    };
    tools?: Array<{ 
        type: string; 
        function: Record<string, unknown> 
    }>;
}

/**
 * Anthropic-specific configuration
 */
export interface AnthropicConfig extends BaseLLMConfig {
    provider: 'anthropic';
    max_tokens_to_sample?: number;
    stop_sequences?: string[];
    top_k?: number;
    top_p?: number;
    metadata?: {
        user_id?: string;
        conversation_id?: string;
    };
    system?: string;
}

/**
 * Google-specific configuration
 */
export interface GoogleConfig extends BaseLLMConfig {
    provider: 'google';
    modelName?: string;
    maxOutputTokens?: number;
    topP?: number;
    topK?: number;
    stopSequences?: string[];
    safetySettings?: SafetySetting[];
    apiVersion?: string;
    baseUrl?: string;
    streamUsage?: boolean;
    projectId?: string;
    location?: string;
}

/**
 * Mistral-specific configuration
 */
export interface MistralConfig extends BaseLLMConfig {
    provider: 'mistral';
    top_p?: number;
    safe_mode?: boolean;
    random_seed?: number;
    endpoint?: string;
    max_tokens?: number;
    responseFormat?: 'text' | 'json';
    tools?: Array<{ 
        type: string; 
        function: Record<string, unknown> 
    }>;
}

/**
 * Union type for all LLM configurations
 */
export type LLMConfig = 
    | GroqConfig 
    | OpenAIConfig 
    | AnthropicConfig 
    | GoogleConfig 
    | MistralConfig;

/**
 * Type guards for configuration validation
 */
export const isGroqConfig = (config: LLMConfig): config is GroqConfig => 
    config.provider === 'groq';

export const isOpenAIConfig = (config: LLMConfig): config is OpenAIConfig => 
    config.provider === 'openai';

export const isAnthropicConfig = (config: LLMConfig): config is AnthropicConfig => 
    config.provider === 'anthropic';

export const isGoogleConfig = (config: LLMConfig): config is GoogleConfig => 
    config.provider === 'google';

export const isMistralConfig = (config: LLMConfig): config is MistralConfig => 
    config.provider === 'mistral';