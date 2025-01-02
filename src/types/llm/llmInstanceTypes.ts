/**
 * @file llmInstanceTypes.ts
 * @path src/types/llm/llmInstanceTypes.ts
 * @description LLM instance type definitions and type guards
 *
 * @module @types/llm
 */

import { BaseChatModelCallOptions } from '@langchain/core/language_models/chat_models';
import { AIMessageChunk } from '@langchain/core/messages';
import { Callbacks } from '@langchain/core/callbacks/manager';
import { BaseLanguageModelInput } from '@langchain/core/language_models/base';
import { LLM_PROVIDER_enum, LLM_STATUS_enum } from '../common/enumTypes';
import type { ILLMProviderConfig, ILLMProviderMetrics } from './llmProviderTypes';
import type { IValidationResult } from '../common/validationTypes';
import type { LLMResponse } from './llmResponseTypes';

// ─── Instance Types ──────────────────────────────────────────────────────────────

/**
 * Options for LLM instance configuration extending Langchain's base options
 */
export interface ILLMInstanceOptions extends BaseChatModelCallOptions {
    callbacks?: Callbacks;
    parentRunId?: string;
    tags?: string[];
}

/**
 * Core LLM instance interface integrating with Langchain's base models
 */
export interface ILLMInstance {
    id: string;
    provider: LLM_PROVIDER_enum;
    config: ILLMProviderConfig;
    metrics: ILLMProviderMetrics;
    status: LLM_STATUS_enum;
    lastUsed: number;
    errorCount: number;
    model?: any;  // Underlying Langchain model instance
    
    // Core methods using Langchain's types
    generate(messages: BaseLanguageModelInput, options?: BaseChatModelCallOptions): Promise<LLMResponse>;
    generateStream(messages: BaseLanguageModelInput, options?: BaseChatModelCallOptions): AsyncGenerator<AIMessageChunk, void, unknown>;
    validateConfig(config: ILLMProviderConfig): Promise<IValidationResult>;
    cleanup(): Promise<void>;
    getMetrics(): Promise<ILLMProviderMetrics>;
    getStatus(): Promise<LLM_STATUS_enum>;
    reset(): Promise<void>;
}

/**
 * Result type for agentic loop operations
 */
export interface IAgenticLoopResult {
    success: boolean;
    output: string;
    error?: Error;
    metrics?: ILLMProviderMetrics;
}

// ─── Type Guards ────────────────────────────────────────────────────────────────

export const isLLMInstance = (value: unknown): value is ILLMInstance => {
    if (typeof value !== 'object' || value === null) return false;
    const instance = value as Partial<ILLMInstance>;
    return (
        typeof instance.id === 'string' &&
        typeof instance.provider === 'string' &&
        typeof instance.config === 'object' &&
        typeof instance.metrics === 'object' &&
        typeof instance.status === 'string' &&
        typeof instance.lastUsed === 'number' &&
        typeof instance.errorCount === 'number' &&
        typeof instance.generate === 'function' &&
        typeof instance.generateStream === 'function' &&
        typeof instance.validateConfig === 'function' &&
        typeof instance.cleanup === 'function' &&
        typeof instance.getMetrics === 'function' &&
        typeof instance.getStatus === 'function' &&
        typeof instance.reset === 'function'
    );
};
