/**
* @file llmResponseTypes.ts
* @path src/types/llm/llmResponseTypes.ts
* @description LLM response type definitions for all supported providers
*
* @module @types/llm
* @deprecated Provider-specific response interfaces and type guards in this module are deprecated.
* Use ILLMProviderMetrics and its provider-specific extensions (IGroqMetrics, IOpenAIMetrics, etc.) 
* from llmProviderTypes.ts instead. The deprecated interfaces and type guards will be removed in a future version.
* 
* Only LLMResponse, ITokenUsage, and IParsedOutput interfaces remain supported.
*/

import { BaseMessage } from "@langchain/core/messages";
import { ILLMProviderMetrics } from './llmProviderTypes';
import { LLM_PROVIDER_enum } from '../common/enumTypes';

// ─── Token Usage Types ──────────────────────────────────────────────────────

export interface ITokenUsage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
}

// ─── Base Response Types ──────────────────────────────────────────────────────

export interface LLMResponse {
    message: BaseMessage;
    model: string;
    provider: LLM_PROVIDER_enum;
    metrics: ILLMProviderMetrics;
    generations: Array<Array<{ text: string; generationInfo: Record<string, unknown> }>>;
    llmOutput: {
        tokenUsage: ITokenUsage;
        modelOutput: Record<string, unknown>;
    };
    // Provider-specific properties
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
    stopReason?: string;
    modelVersion?: string;
    intermediateResponses?: Array<unknown>;
    safetyRatings?: Array<{
        category: string;
        probability: number;
        filtered: boolean;
    }>;
    citationMetadata?: {
        citations: Array<Record<string, unknown>>;
    };
    responseQuality?: {
        coherence: number;
        relevance: number;
        toxicity: number;
    };
    finishReason?: string;
    systemFingerprint?: string;
    promptFilterResults?: {
        filtered: boolean;
    };
}

export interface IParsedOutput {
    thought?: string;
    action?: string;
    actionInput?: Record<string, unknown>;
    observation?: string;
    isFinalAnswerReady?: boolean;
    finalAnswer?: string;
    [key: string]: unknown;
}

// ─── Provider Response Types ───────────────────────────────────────────────────

/**
 * @deprecated Provider-specific response interfaces are deprecated.
 * Use ILLMProviderMetrics and its provider-specific extensions (IGroqMetrics, IOpenAIMetrics, etc.) from llmProviderTypes.ts instead.
 * These interfaces will be removed in a future version.
 */
export interface IGroqResponse extends LLMResponse {
    llmOutput: LLMResponse['llmOutput'] & {
        modelOutput: {
            contextWindow: number;
            streamingLatency: number;
        };
    };
    streamingMetrics: {
        firstTokenLatency: number;
        tokensPerSecond: number;
        totalStreamingTime: number;
    };
}

/**
 * @deprecated Provider-specific response interfaces are deprecated.
 * Use ILLMProviderMetrics and its provider-specific extensions (IGroqMetrics, IOpenAIMetrics, etc.) from llmProviderTypes.ts instead.
 * These interfaces will be removed in a future version.
 */
export interface IOpenAIResponse extends LLMResponse {
    llmOutput: LLMResponse['llmOutput'] & {
        modelOutput: {
            completionTokens: number;
            promptTokens: number;
            totalTokens: number;
            finishReason: string;
        };
    };
    finishReason: string;
}

/**
 * @deprecated Provider-specific response interfaces are deprecated.
 * Use ILLMProviderMetrics and its provider-specific extensions (IGroqMetrics, IOpenAIMetrics, etc.) from llmProviderTypes.ts instead.
 * These interfaces will be removed in a future version.
 */
export interface IAnthropicResponse extends LLMResponse {
    llmOutput: LLMResponse['llmOutput'] & {
        modelOutput: {
            stopReason: string;
            intermediateSteps?: Array<{
                thought: string;
                observation: string;
            }>;
        };
    };
    qualityMetrics: {
        coherence: number;
        relevance: number;
        toxicity: number;
        factuality: number;
    };
}

/**
 * @deprecated Provider-specific response interfaces are deprecated.
 * Use ILLMProviderMetrics and its provider-specific extensions (IGroqMetrics, IOpenAIMetrics, etc.) from llmProviderTypes.ts instead.
 * These interfaces will be removed in a future version.
 */
export interface IGoogleResponse extends LLMResponse {
    llmOutput: LLMResponse['llmOutput'] & {
        modelOutput: {
            safetyRatings: Array<{
                category: string;
                probability: number;
            }>;
            citationMetadata?: {
                citations: Array<Record<string, unknown>>;
            };
        };
    };
    safetyMetrics: {
        blocked: boolean;
        scores: Record<string, number>;
        categories: string[];
    };
}

/**
 * @deprecated Provider-specific response interfaces are deprecated.
 * Use ILLMProviderMetrics and its provider-specific extensions (IGroqMetrics, IOpenAIMetrics, etc.) from llmProviderTypes.ts instead.
 * These interfaces will be removed in a future version.
 */
export interface IMistralResponse extends LLMResponse {
    llmOutput: LLMResponse['llmOutput'] & {
        modelOutput: {
            stopReason: string;
            logprobs?: number[];
            attentionMaps?: Array<Record<string, number[]>>;
        };
    };
    performanceMetrics: {
        timeToFirstToken: number;
        tokensPerSecond: number;
        peakMemoryUsage: number;
        averageMemoryUsage: number;
    };
}

// ─── Type Guards ────────────────────────────────────────────────────────────

/**
 * @deprecated Provider-specific type guards are deprecated.
 * Use provider-specific metrics interfaces (IGroqMetrics, IOpenAIMetrics, etc.) from llmProviderTypes.ts instead.
 * These type guards will be removed in a future version.
 */
export function isGroqResponse(response: LLMResponse): response is IGroqResponse {
    return (
        response.provider === LLM_PROVIDER_enum.GROQ &&
        'streamingMetrics' in response &&
        response.llmOutput.modelOutput &&
        'contextWindow' in response.llmOutput.modelOutput
    );
}

/**
 * @deprecated Provider-specific type guards are deprecated.
 * Use provider-specific metrics interfaces (IGroqMetrics, IOpenAIMetrics, etc.) from llmProviderTypes.ts instead.
 * These type guards will be removed in a future version.
 */
export function isOpenAIResponse(response: LLMResponse): response is IOpenAIResponse {
    return (
        response.provider === LLM_PROVIDER_enum.OPENAI &&
        'finishReason' in response &&
        response.llmOutput.modelOutput &&
        'finishReason' in response.llmOutput.modelOutput
    );
}

/**
 * @deprecated Provider-specific type guards are deprecated.
 * Use provider-specific metrics interfaces (IGroqMetrics, IOpenAIMetrics, etc.) from llmProviderTypes.ts instead.
 * These type guards will be removed in a future version.
 */
export function isAnthropicResponse(response: LLMResponse): response is IAnthropicResponse {
    return (
        response.provider === LLM_PROVIDER_enum.ANTHROPIC &&
        'qualityMetrics' in response &&
        response.llmOutput.modelOutput &&
        'stopReason' in response.llmOutput.modelOutput
    );
}

/**
 * @deprecated Provider-specific type guards are deprecated.
 * Use provider-specific metrics interfaces (IGroqMetrics, IOpenAIMetrics, etc.) from llmProviderTypes.ts instead.
 * These type guards will be removed in a future version.
 */
export function isGoogleResponse(response: LLMResponse): response is IGoogleResponse {
    return (
        response.provider === LLM_PROVIDER_enum.GOOGLE &&
        'safetyMetrics' in response &&
        response.llmOutput.modelOutput &&
        'safetyRatings' in response.llmOutput.modelOutput
    );
}

/**
 * @deprecated Provider-specific type guards are deprecated.
 * Use provider-specific metrics interfaces (IGroqMetrics, IOpenAIMetrics, etc.) from llmProviderTypes.ts instead.
 * These type guards will be removed in a future version.
 */
export function isMistralResponse(response: LLMResponse): response is IMistralResponse {
    return (
        response.provider === LLM_PROVIDER_enum.MISTRAL &&
        'performanceMetrics' in response &&
        response.llmOutput.modelOutput &&
        'stopReason' in response.llmOutput.modelOutput
    );
}

export function isParsedOutput(value: unknown): value is IParsedOutput {
    if (typeof value !== 'object' || value === null) return false;
    const output = value as Partial<IParsedOutput>;
    return (
        (output.thought === undefined || typeof output.thought === 'string') &&
        (output.action === undefined || typeof output.action === 'string') &&
        (output.actionInput === undefined || (typeof output.actionInput === 'object' && output.actionInput !== null)) &&
        (output.observation === undefined || typeof output.observation === 'string') &&
        (output.isFinalAnswerReady === undefined || typeof output.isFinalAnswerReady === 'boolean') &&
        (output.finalAnswer === undefined || typeof output.finalAnswer === 'string')
    );
}

/**
 * @deprecated Provider-specific type guards are deprecated.
 * Use provider-specific metrics interfaces (IGroqMetrics, IOpenAIMetrics, etc.) from llmProviderTypes.ts instead.
 * These type guards will be removed in a future version.
 */
export const LLMResponseTypeGuards = {
    isGroqResponse,
    isOpenAIResponse,
    isAnthropicResponse,
    isGoogleResponse,
    isMistralResponse,
    isParsedOutput
};
