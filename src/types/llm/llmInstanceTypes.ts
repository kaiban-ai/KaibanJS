/**
 * @file llmInstanceTypes.ts
 * @path KaibanJS/src/types/llm/llmInstanceTypes.ts
 * @description LLM instance interfaces and runtime behavior types
 *
 * @module types/llm
 */

import { 
    ILLMResponse, 
    IOutput 
} from './llmResponseTypes';

import type { 
    IGroqConfig,
    IOpenAIConfig, 
    IAnthropicConfig,
    IGoogleConfig,
    IMistralConfig 
} from './llmProviderTypes';
import { 
    ILLMConfig, 
    ILLMProvider, 
    ILLMRuntimeOptions,
    IStreamingChunk,
    IActiveLLMConfig,
    ensureApiKey
} from './llmCommonTypes';

// ─── Core Instance Interface ─────────────────────────────────────────────────────

export interface ILLMInstance {
    generate(input: string, options?: ILLMRuntimeOptions): Promise<ILLMResponse>;
    generateStream(input: string, options?: ILLMRuntimeOptions): AsyncIterator<IStreamingChunk>;
    validateConfig(): Promise<void>;
    cleanup(): Promise<void>;
    getConfig(): IActiveLLMConfig;
    updateConfig(updates: Partial<IActiveLLMConfig>): void;
    getProvider(): ILLMProvider;
}

export interface IAgenticLoopResult {
    error?: string;
    result?: IOutput | null;
    metadata: {
        iterations: number;
        maxAgentIterations: number;
    };
}

// ─── Provider-Specific Types ─────────────────────────────────────────────────────

export interface IGroqInstance extends ILLMInstance {
    getConfig(): IActiveLLMConfig & { provider: 'groq' };
}

export interface IOpenAIInstance extends ILLMInstance {
    getConfig(): IActiveLLMConfig & { provider: 'openai' };
}

export interface IAnthropicInstance extends ILLMInstance {
    getConfig(): IActiveLLMConfig & { provider: 'anthropic' };
}

export interface IGoogleInstance extends ILLMInstance {
    getConfig(): IActiveLLMConfig & { provider: 'google' };
}

export interface IMistralInstance extends ILLMInstance {
    getConfig(): IActiveLLMConfig & { provider: 'mistral' };
}

// ─── Type Guards ─────────────────────────────────────────────────────────────────

export const LLMInstanceGuards = {
    isGroqInstance: (instance: ILLMInstance): instance is IGroqInstance => {
        const config = instance.getConfig();
        return config.provider === 'groq' && config.apiKey !== undefined;
    },
    
    isOpenAIInstance: (instance: ILLMInstance): instance is IOpenAIInstance => {
        const config = instance.getConfig();
        return config.provider === 'openai' && config.apiKey !== undefined;
    },
    
    isAnthropicInstance: (instance: ILLMInstance): instance is IAnthropicInstance => {
        const config = instance.getConfig();
        return config.provider === 'anthropic' && config.apiKey !== undefined;
    },
    
    isGoogleInstance: (instance: ILLMInstance): instance is IGoogleInstance => {
        const config = instance.getConfig();
        return config.provider === 'google' && config.apiKey !== undefined;
    },
    
    isMistralInstance: (instance: ILLMInstance): instance is IMistralInstance => {
        const config = instance.getConfig();
        return config.provider === 'mistral' && config.apiKey !== undefined;
    }
};

// ─── Instance Factory Types ─────────────────────────────────────────────────────

export interface ILLMInstanceFactory {
    createInstance(config: ILLMConfig): Promise<ILLMInstance>;
}

export interface ILLMInstanceOptions {
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

export function toActiveConfig(config: ILLMConfig): IActiveLLMConfig {
    return ensureApiKey(config);
}
