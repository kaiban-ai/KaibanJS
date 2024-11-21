/**
 * @file llmResponseTypes.ts
 * @path KaibanJS/src/types/llm/llmResponseTypes.ts
 * @description Type definitions for LLM responses and related interfaces
 *
 * @module types/llm
 */

import { ILLMProvider } from "./llmCommonTypes";
import { IAgentType } from "../agent/agentBaseTypes";
import { ITaskType } from "../task/taskBaseTypes";
import { AGENT_STATUS_enum } from "../common/commonEnums";
import { IParserResult } from "../common/commonParserTypes";

// ─── Token Usage Types ────────────────────────────────────────────────────────

export interface ITokenUsage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
}

// ─── Response Types ───────────────────────────────────────────────────────────

export interface IResponseMetadata {
    model: string;
    provider: ILLMProvider;
    timestamp: number;
    latency: number;
    finishReason?: string;
    requestId?: string;
}

export interface IParsedOutput {
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

export interface IOutput extends IParsedOutput {
    llmOutput?: string;
    llmUsageStats?: ILLMUsageStats;
    generations?: Array<{
        message: {
            content: string;
            role?: string;
            usage_metadata?: ITokenUsage;
            functionCall?: {
                name: string;
                arguments: Record<string, unknown>;
            };
        };
    }>;
    modelInfo?: {
        name: string;
        provider: ILLMProvider;
        temperature: number;
        maxTokens?: number;
    };
}

export interface ILLMResponse<T = unknown> {
    content: string;
    rawOutput: T;
    usage: ITokenUsage;
    metadata: IResponseMetadata;
}

export interface ICompletionResponse {
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

// ─── Usage Statistics Types ──────────────────────────────────────────────────

export interface ILLMUsageStats {
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

// ─── Handler Parameter Types ─────────────────────────────────────────────────

export interface IParsingHandlerParams {
    agent: IAgentType;
    task: ITaskType;
    output: IOutput;
    llmOutput: string;
}

export interface IParseErrorHandlerParams extends IParsingHandlerParams {
    error?: Error;
    context?: {
        expectedFormat?: string;
        failurePoint?: string;
        partialResult?: unknown;
    };
}

// ─── Result Types ────────────────────────────────────────────────────────────

export interface IOutputProcessResult {
    actionType: keyof typeof AGENT_STATUS_enum;
    parsedOutput: IParsedOutput | null;
    feedback: string;
    shouldContinue: boolean;
}

export interface IOutputValidationResult {
    isValid: boolean;
    error?: Error;
    context?: Record<string, unknown>;
}

// ─── Type Guards ────────────────────────────────────────────────────────────

export function isParsingHandlerParams(value: unknown): value is IParsingHandlerParams {
    return (
        typeof value === 'object' &&
        value !== null &&
        'agent' in value &&
        'task' in value &&
        'output' in value &&
        'llmOutput' in value
    );
}

export const ParsingTypeGuards = {
    isParsingHandlerParams,
    isParseErrorHandlerParams: (value: unknown): value is IParseErrorHandlerParams => {
        return (
            typeof value === 'object' &&
            value !== null &&
            isParsingHandlerParams(value) &&
            ('error' in value || 'context' in value)
        );
    }
};
