/**
 * @file providers.ts
 * @path KaibanJS/src/utils/types/llm/providers.ts
 * @description Type definitions for LLM providers, their configurations, and chat formats
 */

import { LLMProvider, LLMConfig, BaseLLMConfig, ActiveLLMConfig } from '@/utils/types/llm/common';
import { SafetySetting } from "@google/generative-ai";
import { Tool } from "langchain/tools";

// ─── Provider-Specific Configurations ───────────────────────────────────────

/**
 * Groq configuration
 */
export interface GroqConfig extends BaseLLMConfig {
    provider: 'groq';
    model: string;
    temperature?: number;
    maxTokens?: number;
    stop?: string | string[] | null;
    responseFormat?: 'json' | 'text';
    topK?: number;
    presencePenalty?: number;
    frequencyPenalty?: number;
}

/**
 * OpenAI configuration with custom responseFormat
 */
export interface OpenAIConfig extends Omit<BaseLLMConfig, 'responseFormat'> {
    provider: 'openai';
    model: string;
    temperature?: number;
    maxTokens?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    topP?: number;
    n?: number;
    stop?: string[];
    modelKwargs?: Record<string, unknown>;
    organization?: string;
    responseFormat?: { 
        type: 'text' | 'json_object'; 
        schema?: Record<string, unknown>; 
    };
}

/**
 * Anthropic configuration
 */
export interface AnthropicConfig extends BaseLLMConfig {
    provider: 'anthropic';
    model: string;
    temperature?: number;
    maxTokensToSample?: number;
    stopSequences?: string[];
    topK?: number;
    topP?: number;
    metadata?: {
        userId?: string;
        conversationId?: string;
    };
    system?: string;
}

/**
 * Google configuration
 */
export interface GoogleConfig extends BaseLLMConfig {
    provider: 'google';
    model: string;
    temperature?: number;
    maxOutputTokens?: number;
    topP?: number;
    topK?: number;
    stopSequences?: string[];
    safetySettings?: SafetySetting[];
    location?: string;
}

/**
 * Mistral configuration
 */
export interface MistralConfig extends BaseLLMConfig {
    provider: 'mistral';
    model: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    safeMode?: boolean;
    randomSeed?: number;
    endpoint?: string;
}

// ─── Chat Format Configurations ──────────────────────────────────────────────

export interface ChatFormat {
    userPrefix: string;
    assistantPrefix: string;
    systemPrefix: string;
    separator: string;
    stopTokens: string[];
    maxTokens: number;
}

export const ProviderChatFormats: Record<LLMProvider, ChatFormat> = {
    groq: {
        userPrefix: "User:",
        assistantPrefix: "Assistant:",
        systemPrefix: "System:",
        separator: "\n\n",
        stopTokens: ["User:", "Assistant:", "System:"],
        maxTokens: 8192
    },
    openai: {
        userPrefix: "",
        assistantPrefix: "",
        systemPrefix: "",
        separator: "",
        stopTokens: ["<|endoftext|>"],
        maxTokens: 8192
    },
    anthropic: {
        userPrefix: "\n\nHuman:",
        assistantPrefix: "\n\nAssistant:",
        systemPrefix: "\n\nSystem:",
        separator: "\n\n",
        stopTokens: ["\n\nHuman:", "\n\nAssistant:"],
        maxTokens: 100000
    },
    google: {
        userPrefix: "",
        assistantPrefix: "",
        systemPrefix: "",
        separator: "\n",
        stopTokens: ["<end_of_turn>"],
        maxTokens: 32768
    },
    mistral: {
        userPrefix: "[INST]",
        assistantPrefix: "[/INST]",
        systemPrefix: "[SYS]",
        separator: "\n",
        stopTokens: ["[INST]", "[/INST]"],
        maxTokens: 32768
    },
    none: {
        userPrefix: "",
        assistantPrefix: "",
        systemPrefix: "",
        separator: "",
        stopTokens: [],
        maxTokens: 0
    }
};

// ─── Type Guards ────────────────────────────────────────────────────────────

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

// ─── Provider Validation ─────────────────────────────────────────────────────

export const validateProviderConfig = (config: LLMConfig): void => {
    if (config.provider === 'none') return; // Skip validation for 'none' provider

    const requiredFields: Partial<Record<LLMProvider, (keyof ActiveLLMConfig)[]>> = {
        groq: ['model', 'apiKey'],
        openai: ['model', 'apiKey'],
        anthropic: ['model', 'apiKey'],
        google: ['model', 'apiKey'],
        mistral: ['model', 'apiKey'],
    };

    const required = requiredFields[config.provider];
    
    if (required) {
        const missingFields = required.filter(field => !(field in config));
        if (missingFields.length > 0) {
            throw new Error(
                `Missing required fields for ${config.provider}: ${missingFields.join(', ')}`
            );
        }
    }
};


// ─── Token Limit Validation ─────────────────────────────────────────────────

export const ensureValidTokenLimits = (config: LLMConfig): void => {
    const maxTokens = ProviderChatFormats[config.provider].maxTokens;

    // Explicitly infer `configuredMax` as `number | undefined`
    const configuredMax: number | undefined = (() => {
        if ('maxTokens' in config && typeof config.maxTokens === 'number') return config.maxTokens;
        if ('maxOutputTokens' in config && typeof config.maxOutputTokens === 'number') return config.maxOutputTokens;
        if ('maxTokensToSample' in config && typeof config.maxTokensToSample === 'number') return config.maxTokensToSample;
        return undefined;
    })();

    // Check only if `configuredMax` is defined and is a number
    if (configuredMax !== undefined && configuredMax > maxTokens) {
        throw new Error(
            `Token limit ${configuredMax} exceeds maximum of ${maxTokens} for ${config.provider}`
        );
    }
};