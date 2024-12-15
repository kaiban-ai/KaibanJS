/**
 * @file providerCallOptions.ts
 * @path src/types/llm/providerCallOptions.ts
 * @description DEPRECATED: This file is deprecated and will be removed.
 * 
 * Provider call options are now handled by Langchain's provider-specific packages:
 * - Use @langchain/openai for OpenAI options
 * - Use @langchain/anthropic for Anthropic options
 * - Use @langchain/google-genai for Google options
 * - Use @langchain/mistral for Mistral options
 * - Use @langchain/groq for Groq options
 * 
 * @deprecated Use Langchain's provider-specific options instead:
 * ```typescript
 * import { ChatOpenAI } from '@langchain/openai';
 * import { ChatAnthropic } from '@langchain/anthropic';
 * import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
 * import { ChatGroq } from '@langchain/groq';
 * ```
 */

import { BaseChatModelCallOptions } from '@langchain/core/language_models/chat_models';

/**
 * @deprecated Use provider-specific options from Langchain packages
 */
export interface IToolChoice {
    type: 'function';
    function: {
        name: string;
    };
}

/**
 * @deprecated Use ChatGroq from @langchain/groq
 */
export interface IGroqCallOptions extends BaseChatModelCallOptions {
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    stop?: string[];
}

/**
 * @deprecated Use ChatOpenAI from @langchain/openai
 */
export interface IOpenAICallOptions extends BaseChatModelCallOptions {
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    stop?: string[];
    tool_choice?: string | IToolChoice;
}

/**
 * @deprecated Use ChatAnthropic from @langchain/anthropic
 */
export interface IAnthropicCallOptions extends BaseChatModelCallOptions {
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    topK?: number;
    stop?: string[];
}

/**
 * @deprecated Use ChatGoogleGenerativeAI from @langchain/google-genai
 */
export interface IGoogleCallOptions extends BaseChatModelCallOptions {
    maxOutputTokens?: number;
    temperature?: number;
    topP?: number;
    topK?: number;
    stop?: string[];
    safetySettings?: Array<{
        category: string;
        threshold: number;
    }>;
}

/**
 * @deprecated Use ChatMistral from @langchain/mistral
 */
export interface IMistralCallOptions extends BaseChatModelCallOptions {
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    stop?: string[];
    safeMode?: boolean;
}

/**
 * @deprecated Use provider-specific options from Langchain packages
 */
export type ProviderCallOptions = 
    | IGroqCallOptions 
    | IOpenAICallOptions 
    | IAnthropicCallOptions 
    | IGoogleCallOptions 
    | IMistralCallOptions;
