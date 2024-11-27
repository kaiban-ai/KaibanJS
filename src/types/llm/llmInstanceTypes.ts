/**
 * @file llmInstanceTypes.ts
 * @path KaibanJS/src/types/llm/llmInstanceTypes.ts
 * @description LLM instance interfaces and runtime behavior types
 *
 * @module types/llm
 */

import { LLM_PROVIDER_enum } from '../common/commonEnums';
import { 
    type LLMProviderConfig,
    type IBaseLLMConfig,
    type IGroqConfig,
    type IOpenAIConfig,
    type IAnthropicConfig,
    type IGoogleConfig,
    type IMistralConfig
} from './llmProviderTypes';

import { 
    type ILLMRuntimeOptions,
    type IStreamingChunk
} from './llmCommonTypes';

import type { LLMResponse } from './llmResponseTypes';
import type { IOutput } from './llmResponseTypes';
import type { IValidationResult } from '../common/commonValidationTypes';

// ─── Core Instance Interface ─────────────────────────────────────────────────────

export interface ILLMInstance {
    generate(input: string, options?: ILLMRuntimeOptions): Promise<LLMResponse>;
    generateStream(input: string, options?: ILLMRuntimeOptions): AsyncIterator<IStreamingChunk>;
    validateConfig(config: LLMProviderConfig): Promise<IValidationResult<unknown>>;
    cleanup(): Promise<void>;
    getConfig(): IBaseLLMConfig;
    updateConfig(updates: Partial<IBaseLLMConfig>): void;
    getProvider(): LLM_PROVIDER_enum;
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
    getConfig(): IGroqConfig;
}

export interface IOpenAIInstance extends ILLMInstance {
    getConfig(): IOpenAIConfig;
}

export interface IAnthropicInstance extends ILLMInstance {
    getConfig(): IAnthropicConfig;
}

export interface IGoogleInstance extends ILLMInstance {
    getConfig(): IGoogleConfig;
}

export interface IMistralInstance extends ILLMInstance {
    getConfig(): IMistralConfig;
}

// ─── Type Guards ─────────────────────────────────────────────────────────────────

export const LLMInstanceGuards = {
    isGroqInstance: (instance: ILLMInstance): instance is IGroqInstance => {
        const config = instance.getConfig();
        return config.provider === LLM_PROVIDER_enum.GROQ && config.apiKey !== undefined;
    },
    
    isOpenAIInstance: (instance: ILLMInstance): instance is IOpenAIInstance => {
        const config = instance.getConfig();
        return config.provider === LLM_PROVIDER_enum.OPENAI && config.apiKey !== undefined;
    },
    
    isAnthropicInstance: (instance: ILLMInstance): instance is IAnthropicInstance => {
        const config = instance.getConfig();
        return config.provider === LLM_PROVIDER_enum.ANTHROPIC && config.apiKey !== undefined;
    },
    
    isGoogleInstance: (instance: ILLMInstance): instance is IGoogleInstance => {
        const config = instance.getConfig();
        return config.provider === LLM_PROVIDER_enum.GOOGLE && config.apiKey !== undefined;
    },
    
    isMistralInstance: (instance: ILLMInstance): instance is IMistralInstance => {
        const config = instance.getConfig();
        return config.provider === LLM_PROVIDER_enum.MISTRAL && config.apiKey !== undefined;
    }
};

// ─── Instance Factory Types ─────────────────────────────────────────────────────

export interface ILLMInstanceFactory {
    createInstance(config: LLMProviderConfig): Promise<ILLMInstance>;
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
