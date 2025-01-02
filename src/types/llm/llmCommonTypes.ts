/**
* @file llmCommonTypes.ts
* @path src/types/llm/llmCommonTypes.ts
* @description Common LLM runtime type definitions using Langchain
*
* @module @types/llm
*/

import { BaseChatModelCallOptions } from '@langchain/core/language_models/chat_models';
import { Callbacks } from '@langchain/core/callbacks/manager';
import { LLM_PROVIDER_enum } from '../common/enumTypes';
import { IBaseLLMConfig } from './llmProviderTypes';

// Provider display names mapping
export const LLMProviders: Record<LLM_PROVIDER_enum, string> = {
    [LLM_PROVIDER_enum.GROQ]: 'Groq',
    [LLM_PROVIDER_enum.OPENAI]: 'OpenAI',
    [LLM_PROVIDER_enum.ANTHROPIC]: 'Anthropic',
    [LLM_PROVIDER_enum.GOOGLE]: 'Google',
    [LLM_PROVIDER_enum.MISTRAL]: 'Mistral',
    [LLM_PROVIDER_enum.UNKNOWN]: 'Unknown'
};

// Runtime configuration type
export interface IRuntimeLLMConfig extends BaseChatModelCallOptions {
    provider: LLM_PROVIDER_enum;
    model: string;
    apiKey?: string;
    apiBaseUrl?: string;
    maxRetries?: number;
    timeout?: number;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    topK?: number;
    contextWindow?: number;
    streamingLatency?: number;
    streaming?: boolean;
    stop?: string[];
    presencePenalty?: number;
    frequencyPenalty?: number;
    repetitionPenalty?: number;
    tags?: string[];
    callbacks?: Callbacks;
}

// Streaming chunk type extending Langchain's AIMessageChunk
export interface IStreamingChunk {
    content: string;
    done: boolean;
    metadata?: {
        timestamp: number;
        chunkIndex: number;
        totalChunks?: number;
        tokenCount?: number;
        streamingLatency?: number;
    };
    // Additional fields from AIMessageChunk that might be needed
    type?: string;
    name?: string;
    additional_kwargs?: Record<string, unknown>;
}

// Runtime configuration helpers
export const isRuntimeConfig = (config: unknown): config is IRuntimeLLMConfig => {
    if (typeof config !== 'object' || config === null) return false;
    const c = config as IRuntimeLLMConfig;
    return (
        typeof c.provider === 'string' &&
        typeof c.model === 'string' &&
        Object.values(LLM_PROVIDER_enum).includes(c.provider as LLM_PROVIDER_enum)
    );
};

// Re-export types from llmProviderTypes
export type { IBaseLLMConfig };
