/**
 * @file llmManagerTypes.ts
 * @path src/types/llm/llmManagerTypes.ts
 * @description LLM manager type definitions and interfaces
 *
 * @module @types/llm
 */

import { LLM_PROVIDER_enum } from '../common/commonEnums';
import type { 
    LLMProviderConfig,
    IGroqConfig,
    IOpenAIConfig,
    IAnthropicConfig,
    IGoogleConfig,
    IMistralConfig,
    IBaseLLMConfig,
    IRuntimeConfig
} from './llmProviderTypes';

import type {
    LLMResponse,
    IGroqResponse,
    IOpenAIResponse,
    IAnthropicResponse,
    IGoogleResponse,
    IMistralResponse,
    ILLMEventMetadata
} from './llmResponseTypes';

import type { IBaseMetrics } from '../metrics/base/baseMetrics';
import type { IHandlerResult } from '../common/commonHandlerTypes';
import type { IValidationResult } from '../common/commonValidationTypes';

// ─── Config Types ───────────────────────────────────────────────────────────

export interface ILLMConfig {
    provider: string;
    model: string;
    apiKey?: string;
    apiBaseUrl?: string;
    maxRetries?: number;
    timeout?: number;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    topK?: number;
    [key: string]: any;
}

// Active configuration with runtime flexibility
export interface IActiveLLMConfig extends IRuntimeConfig {
    tags?: string[];
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
    metrics: IBaseMetrics;
    status: 'active' | 'error' | 'terminated';
    lastUsed: number;
    errorCount: number;

    // Instance methods
    generate(input: string, options?: any): Promise<LLMResponse>;
    generateStream(input: string, options?: any): AsyncGenerator<any>;
    validateConfig(config: LLMProviderConfig): Promise<IValidationResult>;
    cleanup(): Promise<void>;
    getMetrics(): Promise<IBaseMetrics>;
    getStatus(): Promise<string>;
    reset(): Promise<void>;
}

export interface IProviderInstance {
    groq?: any;    // ChatGroq instance
    openai?: any;  // ChatOpenAI instance
    anthropic?: any; // ChatAnthropic instance
    google?: any;  // ChatGoogleGenerativeAI instance
    mistral?: any; // ChatMistralAI instance
}

// ─── Request Types ───────────────────────────────────────────────────────────

export interface ILLMRequest {
    instanceId: string;
    content: string;
    options?: {
        temperature?: number;
        maxTokens?: number;
        topP?: number;
        topK?: number;
        streaming?: boolean;
        timeout?: number;
    };
    metadata?: Record<string, any>;
}

// ─── Handler Types ───────────────────────────────────────────────────────────

export interface ILLMHandler {
    handleRequest(request: ILLMRequest): Promise<IHandlerResult<LLMResponse>>;
    handleError(error: Error, metadata: ILLMEventMetadata): void;
    handleMetrics(metrics: IBaseMetrics): void;
}

// ─── Provider-Specific Handlers ─────────────────────────────────────────────────

export interface IGroqHandler extends ILLMHandler {
    config: IGroqConfig;
    handleRequest(request: ILLMRequest): Promise<IHandlerResult<IGroqResponse>>;
}

export interface IOpenAIHandler extends ILLMHandler {
    config: IOpenAIConfig;
    handleRequest(request: ILLMRequest): Promise<IHandlerResult<IOpenAIResponse>>;
}

export interface IAnthropicHandler extends ILLMHandler {
    config: IAnthropicConfig;
    handleRequest(request: ILLMRequest): Promise<IHandlerResult<IAnthropicResponse>>;
}

export interface IGoogleHandler extends ILLMHandler {
    config: IGoogleConfig;
    handleRequest(request: ILLMRequest): Promise<IHandlerResult<IGoogleResponse>>;
}

export interface IMistralHandler extends ILLMHandler {
    config: IMistralConfig;
    handleRequest(request: ILLMRequest): Promise<IHandlerResult<IMistralResponse>>;
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
    validateConfig(config: LLMProviderConfig): Promise<IValidationResult>;

    /**
     * Get metrics for an LLM instance
     */
    getMetrics(instanceId: string): Promise<IHandlerResult<IBaseMetrics>>;

    /**
     * Terminate an LLM instance
     */
    terminateInstance(instanceId: string): Promise<IHandlerResult<void>>;

    /**
     * Normalize LLM configuration
     */
    normalizeConfig(config: ILLMConfig): IActiveLLMConfig;
}

// ─── Factory Types ───────────────────────────────────────────────────────────

export interface ILLMFactory {
    /**
     * Create a provider-specific handler
     */
    createHandler(provider: LLM_PROVIDER_enum, config: LLMProviderConfig): Promise<ILLMHandler>;

    /**
     * Create a provider-specific instance
     */
    createProviderInstance(config: LLMProviderConfig): Promise<any>;

    /**
     * Validate provider-specific configuration
     */
    validateProviderConfig(config: LLMProviderConfig): Promise<IValidationResult>;
}

// ─── Event Types ────────────────────────────────────────────────────────────

export interface ILLMEvent {
    type: 'request' | 'response' | 'error' | 'metrics';
    timestamp: number;
    instanceId: string;
    provider: LLM_PROVIDER_enum;
    metadata: ILLMEventMetadata;
    data?: any;
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

// Runtime configuration helpers
export const isValidProviderConfig = (config: unknown): config is LLMProviderConfig => {
    if (typeof config !== 'object' || config === null) return false;
    const c = config as LLMProviderConfig;
    return (
        typeof c.provider === 'string' &&
        typeof c.model === 'string' &&
        Object.values(LLM_PROVIDER_enum).includes(c.provider as LLM_PROVIDER_enum)
    );
};
