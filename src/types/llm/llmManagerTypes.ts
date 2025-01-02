/**
* @file llmManagerTypes.ts
* @path src/types/llm/llmManagerTypes.ts
* @description LLM manager type definitions and interfaces for Langchain integration
*
* @module @llm
*/

import { BaseChatModel, BaseChatModelCallOptions } from '@langchain/core/language_models/chat_models';
import { Callbacks } from '@langchain/core/callbacks/manager';
import { BaseLanguageModelInput } from '@langchain/core/language_models/base';
import { LLM_PROVIDER_enum } from '../common/enumTypes';
import type { 
    ILLMProviderConfig,
    IGroqConfig,
    IOpenAIConfig,
    IAnthropicConfig,
    IGoogleConfig,
    IMistralConfig,
    IBaseProviderMetrics
} from './llmProviderTypes';
import type { 
    ILLMValidationResult, 
    ILLMValidationOptions 
} from './llmValidationTypes';
import type { LLMResponse } from './llmResponseTypes';
import type { IBaseHandlerMetadata } from '../common/baseTypes';
import type { ILLMInstance } from './llmInstanceTypes';

// ─── Handler Result Types ────────────────────────────────────────────────────

export interface IHandlerResult<T = unknown, M extends IBaseHandlerMetadata = IBaseHandlerMetadata> {
    success: boolean;
    error?: Error;
    data?: T;
    metadata: M;
}

// ─── Manager Configuration ────────────────────────────────────────────────────

export interface ILLMManagerConfig {
    defaultProvider: LLM_PROVIDER_enum;
    providers: {
        [key in LLM_PROVIDER_enum]?: ILLMProviderConfig;
    };
    metrics: {
        enabled: boolean;
        detailed: boolean;
        samplingRate: number;
    };
    validation: ILLMValidationOptions;
}

// ─── Instance Types ──────────────────────────────────────────────────────────

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
    messages: BaseLanguageModelInput;
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
    createInstance(config: ILLMProviderConfig): Promise<IHandlerResult<ILLMInstance>>;

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
    validateConfig(config: ILLMProviderConfig): Promise<ILLMValidationResult>;

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
    createHandler(provider: LLM_PROVIDER_enum, config: ILLMProviderConfig): Promise<ILLMHandler>;
    createProviderInstance(config: ILLMProviderConfig): Promise<BaseChatModel>;
    validateProviderConfig(config: ILLMProviderConfig): Promise<ILLMValidationResult>;
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
