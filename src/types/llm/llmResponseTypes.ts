/**
 * @file llmResponseTypes.ts
 * @path src/types/llm/llmResponseTypes.ts
 * @description LLM response type definitions for different providers
 *
 * @module @types/llm
 */

import { LLM_PROVIDER_enum } from '../common/commonEnums';
import type { IBaseMetrics } from '../metrics/base/baseMetrics';

// ─── Legacy Output Types ────────────────────────────────────────────────────────

export interface IOutput {
    content: string;
    usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    metadata: ILLMEventMetadata;
}

export interface IParsedOutput {
    thought?: string;
    action?: string;
    actionInput?: any;
    observation?: string;
    finalAnswer?: string;
}

export interface ILLMEventMetadata {
    timestamp: number;
    latency: number;
    requestId: string;
    provider: LLM_PROVIDER_enum;
    model: string;
    metrics?: IBaseMetrics;
    llm?: {
        name: string;
        version: string;
        config: {
            temperature: number;
            maxTokens: number;
            topP: number;
            topK: number;
            [key: string]: any;
        };
    };
}

// ─── Base Response Types ────────────────────────────────────────────────────────

export interface IBaseLLMResponse {
    content: string;
    provider: LLM_PROVIDER_enum;
    model: string;
    usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    metadata: {
        timestamp: number;
        latency: number;
        requestId: string;
    };
    metrics: IBaseMetrics;
}

// ─── Provider-Specific Response Types ──────────────────────────────────────────

export interface IGroqResponse extends IBaseLLMResponse {
    provider: LLM_PROVIDER_enum.GROQ;
    streamingMetrics?: {
        firstTokenLatency: number;
        tokensPerSecond: number;
        totalStreamingTime: number;
    };
    gpuMetrics?: {
        utilization: number;
        memoryUsed: number;
        temperature: number;
    };
}

export interface IOpenAIResponse extends IBaseLLMResponse {
    provider: LLM_PROVIDER_enum.OPENAI;
    finishReason: 'stop' | 'length' | 'content_filter' | null;
    systemFingerprint?: string;
    promptFilterResults?: {
        filtered: boolean;
        reason?: string;
    };
}

export interface IAnthropicResponse extends IBaseLLMResponse {
    provider: LLM_PROVIDER_enum.ANTHROPIC;
    stopReason: 'end_turn' | 'max_tokens' | 'stop_sequence';
    modelVersion: string;
    intermediateResponses?: {
        delta: string;
        usage: {
            inputTokens: number;
            outputTokens: number;
        };
    }[];
}

export interface IGoogleResponse extends IBaseLLMResponse {
    provider: LLM_PROVIDER_enum.GOOGLE;
    safetyRatings: Array<{
        category: string;
        probability: number;
        filtered: boolean;
    }>;
    citationMetadata?: {
        citations: Array<{
            startIndex: number;
            endIndex: number;
            url: string;
            title?: string;
        }>;
    };
}

export interface IMistralResponse extends IBaseLLMResponse {
    provider: LLM_PROVIDER_enum.MISTRAL;
    performance: {
        inferenceTime: number;
        throughput: number;
        gpuMemoryPeak: number;
    };
    responseQuality?: {
        coherence: number;
        relevance: number;
        toxicity: number;
    };
}

// ─── Response Type Union ────────────────────────────────────────────────────────

export type LLMResponse = 
    | IGroqResponse 
    | IOpenAIResponse 
    | IAnthropicResponse 
    | IGoogleResponse 
    | IMistralResponse;

// ─── Type Guards ────────────────────────────────────────────────────────────

export const LLMResponseTypeGuards = {
    isGroqResponse: (response: LLMResponse): response is IGroqResponse => {
        return response.provider === LLM_PROVIDER_enum.GROQ;
    },

    isOpenAIResponse: (response: LLMResponse): response is IOpenAIResponse => {
        return response.provider === LLM_PROVIDER_enum.OPENAI;
    },

    isAnthropicResponse: (response: LLMResponse): response is IAnthropicResponse => {
        return response.provider === LLM_PROVIDER_enum.ANTHROPIC;
    },

    isGoogleResponse: (response: LLMResponse): response is IGoogleResponse => {
        return response.provider === LLM_PROVIDER_enum.GOOGLE;
    },

    isMistralResponse: (response: LLMResponse): response is IMistralResponse => {
        return response.provider === LLM_PROVIDER_enum.MISTRAL;
    }
};

// ─── Response Validation ────────────────────────────────────────────────────────

export const LLMResponseValidation = {
    validateResponse: (response: LLMResponse): boolean => {
        // Common validation
        if (!response.content || !response.provider || !response.model) {
            return false;
        }

        if (response.usage.totalTokens < 0 || 
            response.metadata.latency < 0) {
            return false;
        }

        // Provider-specific validation
        switch (response.provider) {
            case LLM_PROVIDER_enum.GROQ:
                const groqResp = response as IGroqResponse;
                return !groqResp.streamingMetrics || (
                    groqResp.streamingMetrics.firstTokenLatency >= 0 &&
                    groqResp.streamingMetrics.tokensPerSecond >= 0
                );

            case LLM_PROVIDER_enum.OPENAI:
                const openaiResp = response as IOpenAIResponse;
                return ['stop', 'length', 'content_filter', null].includes(openaiResp.finishReason);

            case LLM_PROVIDER_enum.ANTHROPIC:
                const anthropicResp = response as IAnthropicResponse;
                return ['end_turn', 'max_tokens', 'stop_sequence'].includes(anthropicResp.stopReason);

            case LLM_PROVIDER_enum.GOOGLE:
                const googleResp = response as IGoogleResponse;
                return Array.isArray(googleResp.safetyRatings) &&
                    googleResp.safetyRatings.every(rating => 
                        typeof rating.category === 'string' &&
                        typeof rating.probability === 'number' &&
                        typeof rating.filtered === 'boolean'
                    );

            case LLM_PROVIDER_enum.MISTRAL:
                const mistralResp = response as IMistralResponse;
                return mistralResp.performance.inferenceTime >= 0 &&
                    mistralResp.performance.throughput >= 0;

            default:
                return false;
        }
    }
};
