/**
 * @file responses.ts
 * @path KaibanJS/src/types/llm/responses.ts
 * @description Type definitions for LLM responses and related interfaces
 *
 * @packageDocumentation
 * @module @types/llm
 */

import { LLMProvider } from "./common";

// Token usage statistics
export interface TokenUsage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
}

// Response metadata
export interface ResponseMetadata {
    model: string;
    provider: LLMProvider;
    timestamp: number;
    latency: number;
    finishReason?: string;
    requestId?: string;
}

// Enhanced parsed output from LLM responses
export interface ParsedOutput {
    thought?: string;
    action?: string;
    actionInput?: Record<string, unknown>;
    observation?: string;
    isFinalAnswerReady?: boolean;
    finalAnswer?: string | Record<string, unknown>;
    metadata?: {
        reasoning?: string;
        confidence?: number;
        alternativeActions?: string[];
        metrics?: {
            processingTime?: number;
            tokenCount?: number;
            memoryUsage?: number;
        };
        context?: {
            inputContextLength?: number;
            keyFactors?: string[];
            constraints?: string[];
        };
    };
}

// Enhanced output with additional metadata
export interface Output extends ParsedOutput {
    llmOutput?: string;
    llmUsageStats?: LLMUsageStats;
    generations?: Array<{
        message: {
            content: string;
            role?: string;
            usage_metadata?: TokenUsage;
            functionCall?: {
                name: string;
                arguments: Record<string, unknown>;
            };
        };
    }>;
    modelInfo?: {
        name: string;
        provider: LLMProvider;
        temperature: number;
        maxTokens?: number;
    };
}

// Core LLM response interface
export interface LLMResponse<T = unknown> {
    content: string;
    rawOutput: T;
    usage: TokenUsage;
    metadata: ResponseMetadata;
}

// Detailed completion response structure
export interface CompletionResponse {
    content?: string;
    usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
    };
    message?: {
        content: string;
        role?: string;
        function_call?: Record<string, unknown>;
        usage_metadata?: {
            input_tokens?: number;
            output_tokens?: number;
        };
    };
    generations?: Array<{
        message: {
            content: string;
            role?: string;
            usage_metadata?: {
                input_tokens?: number;
                output_tokens?: number;
            };
        };
    }>;
    finishReason?: 'stop' | 'length' | 'content_filter' | 'function_call' | null;
}

// Streaming chunk interface
export interface StreamingChunk {
    content: string;
    metadata?: Record<string, unknown>;
    finishReason?: string;
    done: boolean;
}

// LLM usage statistics
export interface LLMUsageStats {
    inputTokens: number;
    outputTokens: number;
    callsCount: number;
    callsErrorCount: number;
    parsingErrors: number;
    totalLatency: number;
    averageLatency: number;
    lastUsed: number;
    memoryUtilization: {
        peakMemoryUsage: number;
        averageMemoryUsage: number;
        cleanupEvents: number;
    };
    costBreakdown: {
        input: number;
        output: number;
        total: number;
        currency: string;
    };
}
