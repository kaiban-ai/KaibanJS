/**
 * @file instance.ts
 * @path KaibanJS/src/utils/types/llm/instance.ts
 * @description LLM instance interfaces and runtime behavior types
 */
import { 
    LLMResponse, 
    Output 
} from './responses';

import type { 
    GroqConfig,
    OpenAIConfig, 
    AnthropicConfig,
    GoogleConfig,
    MistralConfig 
} from './providers';
import { 
    LLMConfig, 
    LLMProvider, 
    LLMRuntimeOptions,
    StreamingChunk,
    ActiveLLMConfig,
    ensureApiKey
} from './common';

// ─── Core Instance Interface ─────────────────────────────────────────────────

// Core LLM instance interface
export interface LLMInstance {
    generate(input: string, options?: LLMRuntimeOptions): Promise<LLMResponse>;
    generateStream(input: string, options?: LLMRuntimeOptions): AsyncIterator<StreamingChunk>;
    validateConfig(): Promise<void>;
    cleanup(): Promise<void>;
    getConfig(): ActiveLLMConfig;
    updateConfig(updates: Partial<ActiveLLMConfig>): void;
    getProvider(): LLMProvider;
}

// Result of agentic loop execution 
export interface AgenticLoopResult {
    error?: string;
    result?: Output | null;
    metadata: {
        iterations: number;
        maxAgentIterations: number;
    };
}

// ─── Provider-Specific Types ────────────────────────────────────────────────

// Groq LLM instance
export interface GroqInstance extends LLMInstance {
    getConfig(): ActiveLLMConfig & { provider: 'groq' };
}

// OpenAI LLM instance
export interface OpenAIInstance extends LLMInstance {
    getConfig(): ActiveLLMConfig & { provider: 'openai' };
}

// Anthropic LLM instance
export interface AnthropicInstance extends LLMInstance {
    getConfig(): ActiveLLMConfig & { provider: 'anthropic' };
}

// Google LLM instance
export interface GoogleInstance extends LLMInstance {
    getConfig(): ActiveLLMConfig & { provider: 'google' };
}

// Mistral LLM instance
export interface MistralInstance extends LLMInstance {
    getConfig(): ActiveLLMConfig & { provider: 'mistral' };
}

// ─── Type Guards ──────────────────────────────────────────────────────────────

export const LLMInstanceGuards = {
    isGroqInstance: (instance: LLMInstance): instance is GroqInstance => {
        const config = instance.getConfig();
        return config.provider === 'groq' && config.apiKey !== undefined;
    },
    
    isOpenAIInstance: (instance: LLMInstance): instance is OpenAIInstance => {
        const config = instance.getConfig();
        return config.provider === 'openai' && config.apiKey !== undefined;
    },
    
    isAnthropicInstance: (instance: LLMInstance): instance is AnthropicInstance => {
        const config = instance.getConfig();
        return config.provider === 'anthropic' && config.apiKey !== undefined;
    },
    
    isGoogleInstance: (instance: LLMInstance): instance is GoogleInstance => {
        const config = instance.getConfig();
        return config.provider === 'google' && config.apiKey !== undefined;
    },
    
    isMistralInstance: (instance: LLMInstance): instance is MistralInstance => {
        const config = instance.getConfig();
        return config.provider === 'mistral' && config.apiKey !== undefined;
    }
};

// ─── Instance Factory Types ──────────────────────────────────────────────────

export interface LLMInstanceFactory {
    createInstance(config: LLMConfig): Promise<LLMInstance>;
}

export interface LLMInstanceOptions {
    maxConcurrentRequests?: number;
    requestTimeout?: number;
    retry?: {
        maxRetries: number;
        backoffFactor: number;
    };
    cache?: {
        enabled: boolean;
        maxSize?: number;
        ttl?: number;
    };
}

// Helper function to convert config to ActiveLLMConfig
export function toActiveConfig(config: LLMConfig): ActiveLLMConfig {
    return ensureApiKey(config);
}
