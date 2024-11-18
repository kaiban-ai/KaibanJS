/**
 * @file llmConfig.ts
 * @path C:\Users\pwalc\Documents\GroqEmailAssistant\KaibanJS\src\utils\helpers\llm\llmConfig.ts
 * @description Configuration defaults and helpers for LLM models
 */

import type { 
    GroqConfig, 
    OpenAIConfig, 
    AnthropicConfig, 
    GoogleConfig, 
    MistralConfig 
  } from '@/utils/types';
  
  /**
   * Default configuration for Groq LLM
   */
  export const defaultGroqConfig: GroqConfig = {
    provider: 'groq',
    model: 'llama3-groq-70b-8192-tool-use-preview',
    temperature: 0.1,
    streaming: true,
    maxTokens: 8192,
    stop: null,
    apiKey: process.env.GROQ_API_KEY || ''
  };
  
  /**
   * Default configuration for OpenAI LLM
   */
  export const defaultOpenAIConfig: OpenAIConfig = {
    provider: 'openai',
    model: 'gpt-4-0125-preview',
    temperature: 0.7,
    streaming: true,
    maxTokens: 4096,
    apiKey: process.env.OPENAI_API_KEY || '',
    frequencyPenalty: 0,
    presencePenalty: 0,
    topP: 1,
    n: 1,
    stop: []
  };
  
  /**
   * Default configuration for Anthropic LLM
   */
  export const defaultAnthropicConfig: AnthropicConfig = {
    provider: 'anthropic',
    model: 'claude-3-sonnet-20240229',
    temperature: 0.7,
    streaming: true,
    maxTokensToSample: 4096,
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    stopSequences: [],
    topK: undefined,
    topP: undefined
  };
  
  /**
   * Default configuration for Google LLM
   */
  export const defaultGoogleConfig: GoogleConfig = {
    provider: 'google',
    model: 'gemini-1.0-pro',
    temperature: 0.7,
    streaming: true,
    maxOutputTokens: 4096,
    apiKey: process.env.GOOGLE_API_KEY || '',
    topK: undefined,
    topP: undefined,
    stopSequences: [],
    safetySettings: []
  };
  
  /**
   * Default configuration for Mistral LLM
   */
  export const defaultMistralConfig: MistralConfig = {
    provider: 'mistral',
    model: 'mistral-large-2024-q1',
    temperature: 0.7,
    streaming: true,
    maxTokens: 4096,
    apiKey: process.env.MISTRAL_API_KEY || '',
    topP: undefined,
    safeMode: false,
    randomSeed: undefined,
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