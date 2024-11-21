/**
 * @file llmProviderTypes.ts
 * @path KaibanJS/src/types/llm/llmProviderTypes.ts
 * @description Type definitions for LLM providers, their configurations, and chat formats
 *
 * @module types/llm
 */

import { ILLMProvider, ILLMConfig, IBaseLLMConfig, IActiveLLMConfig } from './llmCommonTypes';
import { SafetySetting } from "@google/generative-ai";
import { Tool } from "langchain/tools";

// ─── Provider-Specific Configurations ─────────────────────────────────────────────

/**
 * Groq configuration
 */
export interface IGroqConfig extends IActiveLLMConfig {
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
export interface IOpenAIConfig extends Omit<IActiveLLMConfig, 'responseFormat'> {
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
export interface IAnthropicConfig extends IActiveLLMConfig {
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
export interface IGoogleConfig extends IActiveLLMConfig {
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
export interface IMistralConfig extends IActiveLLMConfig {
    provider: 'mistral';
    model: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    safeMode?: boolean;
    randomSeed?: number;
    endpoint?: string;
}

// ─── Chat Format Configurations ─────────────────────────────────────────────────

export interface IChatFormat {
    userPrefix: string;
    assistantPrefix: string;
    systemPrefix: string;
    separator: string;
    stopTokens: string[];
    maxTokens: number;
}

export const ProviderChatFormats: Record<ILLMProvider, IChatFormat> = {
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

// ─── Type Guards ─────────────────────────────────────────────────────────────────

export const isGroqConfig = (config: ILLMConfig): config is IGroqConfig => 
    config.provider === 'groq';

export const isOpenAIConfig = (config: ILLMConfig): config is IOpenAIConfig => 
    config.provider === 'openai';

export const isAnthropicConfig = (config: ILLMConfig): config is IAnthropicConfig =>
    config.provider === 'anthropic';

export const isGoogleConfig = (config: ILLMConfig): config is IGoogleConfig =>
    config.provider === 'google';

export const isMistralConfig = (config: ILLMConfig): config is IMistralConfig =>
    config.provider === 'mistral';

// ─── Provider Validation ─────────────────────────────────────────────────────────

export const validateProviderConfig = (config: ILLMConfig): void => {
    if (config.provider === 'none') return; // Skip validation for 'none' provider

    const requiredFields: Partial<Record<ILLMProvider, (keyof IActiveLLMConfig)[]>> = {
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

// ─── Token Limit Validation ─────────────────────────────────────────────────────

export const ensureValidTokenLimits = (config: ILLMConfig): void => {
    const maxTokens = ProviderChatFormats[config.provider].maxTokens;

    const configuredMax: number | undefined = (() => {
        if ('maxTokens' in config && typeof config.maxTokens === 'number') return config.maxTokens;
        if ('maxOutputTokens' in config && typeof config.maxOutputTokens === 'number') return config.maxOutputTokens;
        if ('maxTokensToSample' in config && typeof config.maxTokensToSample === 'number') return config.maxTokensToSample;
        return undefined;
    })();

    if (configuredMax !== undefined && configuredMax > maxTokens) {
        throw new Error(
            `Token limit ${configuredMax} exceeds maximum of ${maxTokens} for ${config.provider}`
        );
    }
};
