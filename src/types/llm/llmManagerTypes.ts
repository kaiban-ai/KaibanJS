/**
 * @file llmManagerTypes.ts
 * @path src/types/llm/llmManagerTypes.ts
 * @description LLM manager type definitions using Langchain
 */

import { BaseChatModel, BaseChatModelCallOptions } from '@langchain/core/language_models/chat_models';
import { BaseMessageLike, AIMessageChunk } from '@langchain/core/messages';
import { Callbacks } from '@langchain/core/callbacks/manager';
import { LLM_PROVIDER_enum } from '../common/commonEnums';
import type { 
    LLMProviderConfig,
    IGroqConfig,
    IOpenAIConfig,
    IAnthropicConfig,
    IGoogleConfig,
    IMistralConfig,
    IBaseProviderMetrics
} from './llmProviderTypes';

import type { IRuntimeLLMConfig } from './llmCommonTypes';
import type { LLMResponse } from './llmResponseTypes';
import type { IBaseMetrics } from '../metrics/base/baseMetrics';
import type { IBaseHandlerMetadata } from '../common/commonMetadataTypes';

// ─── Handler Result Types ────────────────────────────────────────────────────

export interface IHandlerResult<T = unknown, M extends IBaseHandlerMetadata = IBaseHandlerMetadata> {
    success: boolean;
    error?: Error;
    data?: T;
    metadata: M;
}

/**
 * LLM-specific validation result interface.
 * 
 * This differs from the common IValidationResult because LLM provider validation:
 * 1. Uses simple string errors/warnings for provider-specific messages
 * 2. Has optional metadata specific to LLM handlers
 * 3. Focuses on external provider validation rather than internal system validation
 */
export interface ILLMValidationResult<T = unknown> {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    data?: T;
    metadata?: IBaseHandlerMetadata;
}

// ─── Manager Configuration ────────────────────────────────────────────────────

export interface ILLMManagerConfig {
    defaultProvider: LLM_PROVIDER_enum;
    providers: {
        [key in LLM_PROVIDER_enum]?: LLMProviderConfig;
    };
    metrics: {
        enabled: boolean;
        detailed: boolean;
        samplingRate: number;
    };
    validation: {
        strict: boolean;
        timeout: number;
        retryCount: number;
    };
}

// ─── Instance Types ──────────────────────────────────────────────────────────

export interface ILLMInstance {
    id: string;
    provider: LLM_PROVIDER_enum;
    config: LLMProviderConfig;
    metrics: IBaseProviderMetrics;
    status: 'active' | 'error' | 'terminated';
    lastUsed: number;
    errorCount: number;

    // Instance methods
    generate(
        messages: BaseMessageLike[][],
        options?: BaseChatModelCallOptions | string[],
        callbacks?: Callbacks
    ): Promise<LLMResponse>;

    generateStream(
        messages: BaseMessageLike[][],
        options?: BaseChatModelCallOptions | string[],
        callbacks?: Callbacks
    ): AsyncGenerator<AIMessageChunk>;

    validateConfig(config: LLMProviderConfig): Promise<ILLMValidationResult>;
    cleanup(): Promise<void>;
    getMetrics(): Promise<IBaseProviderMetrics>;
    getStatus(): Promise<string>;
    reset(): Promise<void>;
}

export interface IProviderInstance {
    groq?: BaseChatModel;    // ChatGroq instance
    openai?: BaseChatModel;  // ChatOpenAI instance
    anthropic?: BaseChatModel; // ChatAnthropic instance
    google?: BaseChatModel;  // ChatGoogleGenerativeAI instance
    mistral?: BaseChatModel; // ChatMistralAI instance
}

// ─── Request Types ───────────────────────────────────────────────────────────

export interface ILLMRequest {
    instanceId: string;
    messages: BaseMessageLike[][];
    options?: BaseChatModelCallOptions;
    callbacks?: Callbacks;
}

// ─── Handler Types ───────────────────────────────────────────────────────────

export interface ILLMHandler {
    handleRequest(request: ILLMRequest): Promise<IHandlerResult<LLMResponse>>;
    handleError(error: Error, callbacks?: Callbacks): void;
    handleMetrics(metrics: IBaseProviderMetrics): void;
}

// ─── Provider-Specific Handlers ─────────────────────────────────────────────────

export interface IGroqHandler extends ILLMHandler {
    config: IGroqConfig;
    handleRequest(request: ILLMRequest): Promise<IHandlerResult<LLMResponse>>;
}

export interface IOpenAIHandler extends ILLMHandler {
    config: IOpenAIConfig;
    handleRequest(request: ILLMRequest): Promise<IHandlerResult<LLMResponse>>;
}

export interface IAnthropicHandler extends ILLMHandler {
    config: IAnthropicConfig;
    handleRequest(request: ILLMRequest): Promise<IHandlerResult<LLMResponse>>;
}

export interface IGoogleHandler extends ILLMHandler {
    config: IGoogleConfig;
    handleRequest(request: ILLMRequest): Promise<IHandlerResult<LLMResponse>>;
}

export interface IMistralHandler extends ILLMHandler {
    config: IMistralConfig;
    handleRequest(request: ILLMRequest): Promise<IHandlerResult<LLMResponse>>;
}

// ─── Manager Interface ────────────────────────────────────────────────────────

export interface ILLMManager {
    /**
     * Create a new LLM instance with the specified configuration
     */
    createInstance(config: LLMProviderConfig): Promise<IHandlerResult<ILLMInstance>>;

    /**
     * Get an existing LLM instance by ID
     */
    getInstance(instanceId: string): Promise<IHandlerResult<ILLMInstance>>;

    /**
     * Send a request to an LLM instance
     */
    sendRequest(request: ILLMRequest): Promise<IHandlerResult<LLMResponse>>;

    /**
     * Validate an LLM configuration
     */
    validateConfig(config: LLMProviderConfig): Promise<ILLMValidationResult>;

    /**
     * Get metrics for an LLM instance
     */
    getMetrics(instanceId: string): Promise<IHandlerResult<IBaseProviderMetrics>>;

    /**
     * Terminate an LLM instance
     */
    terminateInstance(instanceId: string): Promise<IHandlerResult<void>>;
}

// ─── Factory Types ───────────────────────────────────────────────────────────

export interface ILLMFactory {
    createHandler(provider: LLM_PROVIDER_enum, config: LLMProviderConfig): Promise<ILLMHandler>;
    createProviderInstance(config: LLMProviderConfig): Promise<BaseChatModel>;
    validateProviderConfig(config: LLMProviderConfig): Promise<ILLMValidationResult>;
}

// ─── Utility Types ───────────────────────────────────────────────────────────

export type LLMHandler = 
    | IGroqHandler 
    | IOpenAIHandler 
    | IAnthropicHandler 
    | IGoogleHandler 
    | IMistralHandler;

// Provider handler mapping using string literal types
export type ProviderHandlerMap = Record<LLM_PROVIDER_enum, ILLMHandler>;
