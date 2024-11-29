/**
 * @file llmInstanceTypes.ts
 * @path KaibanJS/src/types/llm/llmInstanceTypes.ts
 * @description LLM instance interfaces and runtime behavior types using Langchain
 *
 * @module types/llm
 */

import { BaseChatModel, BaseChatModelParams, BaseChatModelCallOptions } from '@langchain/core/language_models/chat_models';
import { BaseMessage, BaseMessageLike, AIMessage, AIMessageChunk, MessageType } from '@langchain/core/messages';
import { BaseLanguageModelInput } from '@langchain/core/language_models/base';
import { LLMResult } from '@langchain/core/outputs';
import { Callbacks } from '@langchain/core/callbacks/manager';
import { LLM_PROVIDER_enum } from '../common/commonEnums';
import { 
    type LLMProviderConfig,
    type IGroqConfig,
    type IOpenAIConfig,
    type IAnthropicConfig,
    type IGoogleConfig,
    type IMistralConfig
} from './llmProviderTypes';

import type { LLMResponse } from './llmResponseTypes';
import type { IValidationResult } from '../common/commonValidationTypes';

// ─── Core Instance Interface ─────────────────────────────────────────────────────

export interface ILLMInstance {
    id: string;
    generate(
        messages: BaseLanguageModelInput,
        options?: BaseChatModelCallOptions,
        callbacks?: Callbacks
    ): Promise<LLMResponse>;

    generateStream(
        messages: BaseLanguageModelInput,
        options?: BaseChatModelCallOptions,
        callbacks?: Callbacks
    ): AsyncGenerator<AIMessageChunk>;

    validateConfig(config: LLMProviderConfig): Promise<IValidationResult>;
    cleanup(): Promise<void>;
    getConfig(): LLMProviderConfig;
    updateConfig(updates: Partial<BaseChatModelCallOptions>): void;
    getProvider(): LLM_PROVIDER_enum;
}

export interface IAgenticLoopResult {
    error?: string;
    result?: LLMResult | null;
    metadata: {
        iterations: number;
        maxAgentIterations: number;
    };
}

// ─── Provider-Specific Types ─────────────────────────────────────────────────────

export interface IProviderConfig extends BaseChatModelParams {
    provider: LLM_PROVIDER_enum;
    apiKey: string;
}

export interface IProviderInstance<T extends LLMProviderConfig> extends ILLMInstance {
    config: T;
}

export type IGroqInstance = IProviderInstance<IGroqConfig>;
export type IOpenAIInstance = IProviderInstance<IOpenAIConfig>;
export type IAnthropicInstance = IProviderInstance<IAnthropicConfig>;
export type IGoogleInstance = IProviderInstance<IGoogleConfig>;
export type IMistralInstance = IProviderInstance<IMistralConfig>;

// ─── Type Guards ─────────────────────────────────────────────────────────────────

export const LLMInstanceGuards = {
    isLLMInstance: (instance: unknown): instance is ILLMInstance => {
        return instance !== null &&
               typeof instance === 'object' &&
               'id' in instance &&
               'generate' in instance &&
               'generateStream' in instance &&
               'getProvider' in instance;
    },

    isProviderConfig: (config: unknown): config is IProviderConfig => {
        return config !== null &&
               typeof config === 'object' &&
               'provider' in config &&
               'apiKey' in config;
    },

    isProviderInstance: <T extends LLMProviderConfig>(
        instance: ILLMInstance,
        provider: LLM_PROVIDER_enum
    ): instance is IProviderInstance<T> => {
        return instance.getProvider() === provider;
    }
};

// ─── Instance Factory Types ─────────────────────────────────────────────────────

export interface ILLMInstanceFactory {
    createInstance(config: LLMProviderConfig): Promise<ILLMInstance>;
}

export interface ILLMInstanceOptions extends BaseChatModelCallOptions {
    maxConcurrentRequests?: number;
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

// ─── Message Conversion Utilities ────────────────────────────────────────────────

export function convertToBaseMessages(input: BaseLanguageModelInput): BaseMessage[] {
    if (Array.isArray(input)) {
        return input.map(msg => {
            if (msg instanceof BaseMessage) {
                return msg;
            }
            if (typeof msg === 'object' && msg !== null && 'content' in msg && 'type' in msg) {
                return new AIMessage({ content: String(msg.content) });
            }
            return new AIMessage({ content: String(msg) });
        });
    }
    if (typeof input === 'string') {
        return [new AIMessage({ content: input })];
    }
    if (input instanceof BaseMessage) {
        return [input];
    }
    throw new Error('Invalid message format');
}
