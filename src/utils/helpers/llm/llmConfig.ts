/**
 * @file llmConfig.ts
 * @path C:\Users\pwalc\Documents\GroqEmailAssistant\KaibanJS\src\utils\helpers\llm\llmConfig.ts
 * @description Configuration defaults and helpers for LLM models
 */

import type { 
    IGroqConfig, 
    IOpenAIConfig, 
    IAnthropicConfig, 
    IGoogleConfig, 
    IMistralConfig 
} from '../../../types/llm/llmProviderTypes';

import { 
    LLM_PROVIDER_enum,
    GROQ_MODEL_enum,
    OPENAI_MODEL_enum,
    ANTHROPIC_MODEL_enum,
    GOOGLE_MODEL_enum,
    MISTRAL_MODEL_enum
} from '../../../types/common/enumTypes';
  
/**
 * Default configuration for Groq LLM
 */
export const defaultGroqConfig: IGroqConfig = {
    provider: LLM_PROVIDER_enum.GROQ,
    model: GROQ_MODEL_enum.MIXTRAL,
    temperature: 0.1,
    streaming: true,
    maxTokens: 8192,
    stop: [],
    apiKey: process.env.GROQ_API_KEY || ''
};
  
/**
 * Default configuration for OpenAI LLM
 */
export const defaultOpenAIConfig: IOpenAIConfig = {
    provider: LLM_PROVIDER_enum.OPENAI,
    model: OPENAI_MODEL_enum.GPT4_TURBO,
    temperature: 0.7,
    streaming: true,
    maxTokens: 4096,
    apiKey: process.env.OPENAI_API_KEY || '',
    frequencyPenalty: 0,
    presencePenalty: 0,
    topP: 1,
    stop: []
};
  
/**
 * Default configuration for Anthropic LLM
 */
export const defaultAnthropicConfig: IAnthropicConfig = {
    provider: LLM_PROVIDER_enum.ANTHROPIC,
    model: ANTHROPIC_MODEL_enum.CLAUDE3_SONNET,
    temperature: 0.7,
    streaming: true,
    maxTokens: 4096,
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    stop: [],
    topK: undefined,
    topP: undefined
};
  
/**
 * Default configuration for Google LLM
 */
export const defaultGoogleConfig: IGoogleConfig = {
    provider: LLM_PROVIDER_enum.GOOGLE,
    model: GOOGLE_MODEL_enum.GEMINI_PRO,
    temperature: 0.7,
    streaming: true,
    maxTokens: 4096,
    apiKey: process.env.GOOGLE_API_KEY || '',
    topK: undefined,
    topP: undefined,
    stop: [],
    safetySettings: []
};
  
/**
 * Default configuration for Mistral LLM
 */
export const defaultMistralConfig: IMistralConfig = {
    provider: LLM_PROVIDER_enum.MISTRAL,
    model: MISTRAL_MODEL_enum.MEDIUM,
    temperature: 0.7,
    streaming: true,
    maxTokens: 4096,
    apiKey: process.env.MISTRAL_API_KEY || '',
    topP: undefined,
    endpoint: undefined
};
  
/**
 * Get default config based on provider
 */
export function getDefaultConfig(provider: string) {
    switch (provider.toLowerCase()) {
        case 'groq':
            return defaultGroqConfig;
        case 'openai':
            return defaultOpenAIConfig;
        case 'anthropic':
            return defaultAnthropicConfig;
        case 'google':
            return defaultGoogleConfig;
        case 'mistral':
            return defaultMistralConfig;
        default:
            throw new Error(`Unsupported provider: ${provider}`);
    }
}
  
/**
 * Config validation utilities
 */
export const configUtils = {
    /**
     * Validate API key presence
     */
    validateApiKey: (config: { apiKey?: string; provider: string }): boolean => {
        if (!config.apiKey) {
            throw new Error(`API key is required for ${config.provider}`);
        }
        return true;
    },
  
    /**
     * Validate temperature range
     */
    validateTemperature: (temperature?: number): boolean => {
        if (temperature !== undefined && (temperature < 0 || temperature > 1)) {
            throw new Error('Temperature must be between 0 and 1');
        }
        return true;
    },
  
    /**
     * Validate streaming configuration
     */
    validateStreaming: (streaming?: boolean, provider?: string): boolean => {
        if (streaming && provider && !['groq', 'openai', 'anthropic', 'google', 'mistral'].includes(provider)) {
            throw new Error(`Streaming not supported for provider: ${provider}`);
        }
        return true;
    }
};
  
/**
 * Export everything
 */
export default {
    defaultGroqConfig,
    defaultOpenAIConfig,
    defaultAnthropicConfig,
    defaultGoogleConfig,
    defaultMistralConfig,
    getDefaultConfig,
    configUtils
};
