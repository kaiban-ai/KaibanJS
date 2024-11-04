/**
 * @file responses.ts
 * @path src/types/llm/responses.ts
 * @description Type definitions for LLM responses and related interfaces
 *
 * @packageDocumentation
 * @module @types/llm
 */

import { LLMProvider } from "./common";

/**
 * Token usage statistics
 */
export interface TokenUsage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
}

/**
 * Response metadata
 */
export interface ResponseMetadata {
    model: string;
    provider: LLMProvider;
    timestamp: number;
    latency: number;
    finishReason?: string;
    requestId?: string;
}

/**
 * Enhanced parsed output from LLM responses
 * @breaking-change v2.0.0 Added metadata field with additional context
 */
export interface ParsedOutput {
    /** Reasoning or thought process */
    thought?: string;
    
    /** Action to take */
    action?: string;
    
    /** Input for the action */
    actionInput?: Record<string, unknown>;
    
    /** Observation from action */
    observation?: string;
    
    /** Final answer readiness flag */
    isFinalAnswerReady?: boolean;
    
    /** Final answer content */
    finalAnswer?: string | Record<string, unknown>;
    
    /** Enhanced metadata */
    metadata?: {
        /** Reasoning behind decisions */
        reasoning?: string;
        
        /** Confidence level (0-1) */
        confidence?: number;
        
        /** Alternative actions considered */
        alternativeActions?: string[];
        
        /** Processing metrics */
        metrics?: {
            /** Time taken to process */
            processingTime?: number;
            
            /** Number of tokens processed */
            tokenCount?: number;
            
            /** Memory usage */
            memoryUsage?: number;
        };
        
        /** Context information */
        context?: {
            /** Input context length */
            inputContextLength?: number;
            
            /** Key information used */
            keyFactors?: string[];
            
            /** Relevant constraints */
            constraints?: string[];
        };
    };
}

/**
 * Enhanced output with additional metadata
 */
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

/**
 * Core LLM response interface
 */
export interface LLMResponse<T = unknown> {
    content: string;
    rawOutput: T;
    usage: TokenUsage;
    metadata: ResponseMetadata;
}

/**
 * Detailed completion response structure
 */
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

/**
 * Streaming chunk interface
 */
export interface StreamingChunk {
    content: string;
    metadata?: Record<string, unknown>;
    finishReason?: string;
    done: boolean;
}

/**
 * LLM usage statistics
 */
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