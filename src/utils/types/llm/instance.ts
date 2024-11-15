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
    StreamingChunk
} from './common';

// ─── Core Instance Interface ─────────────────────────────────────────────────

// Core LLM instance interface
export interface LLMInstance {
    generate(input: string, options?: LLMRuntimeOptions): Promise<LLMResponse>;
    generateStream(input: string, options?: LLMRuntimeOptions): AsyncIterator<StreamingChunk>;
    validateConfig(): Promise<void>;
    cleanup(): Promise<void>;
    getConfig(): LLMConfig;
    updateConfig(updates: Partial<LLMConfig>): void;
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
    getConfig(): GroqConfig;
}

// OpenAI LLM instance
export interface OpenAIInstance extends LLMInstance {
    getConfig(): OpenAIConfig;
}

// Anthropic LLM instance
export interface AnthropicInstance extends LLMInstance {
    getConfig(): AnthropicConfig;
}


// Google LLM instance
export interface GoogleInstance extends LLMInstance {
    getConfig(): GoogleConfig;
}

// Mistral LLM instance
export interface MistralInstance extends LLMInstance {
    getConfig(): MistralConfig;
}

// ─── Type Guards ──────────────────────────────────────────────────────────────

export const LLMInstanceGuards = {
    isGroqInstance: (instance: LLMInstance): instance is GroqInstance => {
        return instance.getProvider() === 'groq';
    },
    
    isOpenAIInstance: (instance: LLMInstance): instance is OpenAIInstance => {
        return instance.getProvider() === 'openai';
    },
    
    isAnthropicInstance: (instance: LLMInstance): instance is AnthropicInstance => {
        return instance.getProvider() === 'anthropic';
    },
    
    isGoogleInstance: (instance: LLMInstance): instance is GoogleInstance => {
        return instance.getProvider() === 'google';
    },
    
    isMistralInstance: (instance: LLMInstance): instance is MistralInstance => {
        return instance.getProvider() === 'mistral';
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