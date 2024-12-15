/**
 * @file llmResponseTypes.ts
 * @path src/types/llm/llmResponseTypes.ts
 * @description LLM response type definitions using Langchain
 */

import { BaseMessage, AIMessage } from '@langchain/core/messages';
import { LLMResult, Generation } from '@langchain/core/outputs';
import { LLM_PROVIDER_enum } from '../common/commonEnums';
import type { IBaseMetrics } from '../metrics/base/baseMetrics';
import type { IValidationResult } from '../common/commonValidationTypes';

// ─── Token Usage Types ────────────────────────────────────────────────────────

/**
 * Token usage metrics for LLM responses
 */
export interface ITokenUsage {
    /** Number of tokens in the prompt */
    promptTokens: number;
    /** Number of tokens in the completion/response */
    completionTokens: number;
    /** Total number of tokens (prompt + completion) */
    totalTokens: number;
}

// ─── Base Response Types ────────────────────────────────────────────────────────

/**
 * Base LLM response extending Langchain's LLMResult with KaibanJS-specific fields
 */
export interface IBaseLLMResponse extends Omit<LLMResult, 'generations'> {
    provider: LLM_PROVIDER_enum;
    model: string;
    metrics: IBaseMetrics;
    message: AIMessage;
    generations: Generation[][];
    llmOutput: {
        tokenUsage: ITokenUsage;
    };
    performance?: {
        inferenceTime: number;
        throughput: number;
        gpuMemoryPeak: number;
    };
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
    generations: Generation[][];
    llmOutput: {
        tokenUsage: ITokenUsage;
        modelOutput?: {
            contextWindow: number;
            streamingLatency: number;
        };
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
    generations: Generation[][];
    llmOutput: {
        tokenUsage: ITokenUsage;
        modelOutput?: {
            completionTokens: number;
            promptTokens: number;
            totalTokens: number;
            finishReason: string;
        };
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
    generations: Generation[][];
    llmOutput: {
        tokenUsage: ITokenUsage;
        modelOutput?: {
            stopReason: string;
            modelVersion: string;
            contextUtilization: number;
        };
    };
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
    generations: Generation[][];
    llmOutput: {
        tokenUsage: ITokenUsage;
        modelOutput?: {
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
        };
    };
}

export interface IMistralResponse extends IBaseLLMResponse {
    provider: LLM_PROVIDER_enum.MISTRAL;
    responseQuality?: {
        coherence: number;
        relevance: number;
        toxicity: number;
    };
    generations: Generation[][];
    llmOutput: {
        tokenUsage: ITokenUsage;
        modelOutput?: {
            responseQuality: {
                coherence: number;
                relevance: number;
                toxicity: number;
            };
            inferenceStats: {
                tokensPerSecond: number;
                gpuMemoryUsage: number;
            };
        };
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
    validateResponse: (response: LLMResponse): IValidationResult => {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Common validation
        if (!response.generations || !response.generations.length) {
            errors.push('Response must have generations');
        }

        if (!response.provider || !response.model) {
            errors.push('Response must have provider and model');
        }

        if (!response.llmOutput?.tokenUsage || 
            response.llmOutput.tokenUsage.totalTokens < 0 || 
            response.llmOutput.tokenUsage.promptTokens < 0 ||
            response.llmOutput.tokenUsage.completionTokens < 0) {
            errors.push('Token usage cannot be negative');
        }

        // Provider-specific validation
        switch (response.provider) {
            case LLM_PROVIDER_enum.GROQ:
                const groqResp = response as IGroqResponse;
                if (groqResp.streamingMetrics) {
                    if (groqResp.streamingMetrics.firstTokenLatency < 0) {
                        errors.push('First token latency cannot be negative');
                    }
                    if (groqResp.streamingMetrics.tokensPerSecond < 0) {
                        errors.push('Tokens per second cannot be negative');
                    }
                }
                break;

            case LLM_PROVIDER_enum.OPENAI:
                const openaiResp = response as IOpenAIResponse;
                if (!['stop', 'length', 'content_filter', null].includes(openaiResp.finishReason)) {
                    errors.push('Invalid finish reason');
                }
                break;

            case LLM_PROVIDER_enum.ANTHROPIC:
                const anthropicResp = response as IAnthropicResponse;
                if (!['end_turn', 'max_tokens', 'stop_sequence'].includes(anthropicResp.stopReason)) {
                    errors.push('Invalid stop reason');
                }
                break;

            case LLM_PROVIDER_enum.GOOGLE:
                const googleResp = response as IGoogleResponse;
                if (!Array.isArray(googleResp.safetyRatings)) {
                    errors.push('Safety ratings must be an array');
                } else {
                    googleResp.safetyRatings.forEach((rating, index) => {
                        if (typeof rating.category !== 'string') {
                            errors.push(`Safety rating ${index} category must be a string`);
                        }
                        if (typeof rating.probability !== 'number' || rating.probability < 0 || rating.probability > 1) {
                            errors.push(`Safety rating ${index} probability must be between 0 and 1`);
                        }
                    });
                }
                break;

            case LLM_PROVIDER_enum.MISTRAL:
                const mistralResp = response as IMistralResponse;
                if (mistralResp.responseQuality) {
                    if (mistralResp.responseQuality.coherence < 0 || mistralResp.responseQuality.coherence > 1) {
                        errors.push('Coherence score must be between 0 and 1');
                    }
                    if (mistralResp.responseQuality.relevance < 0 || mistralResp.responseQuality.relevance > 1) {
                        errors.push('Relevance score must be between 0 and 1');
                    }
                }
                break;

            default:
                errors.push('Invalid provider');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            metadata: {
                timestamp: Date.now(),
                component: 'LLMResponseValidation',
                operation: 'validateResponse',
                validatedFields: ['generations', 'provider', 'model', 'llmOutput']
            }
        };
    }
};
