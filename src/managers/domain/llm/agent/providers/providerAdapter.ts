/**
 * @file providerAdapter.ts
 * @path src/managers/domain/llm/agent/providers/providerAdapter.ts
 * @description Provider-specific adapter implementations for LLM agents
 */

import { BaseMessage } from '@langchain/core/messages';
import { BaseChatModelCallOptions } from '@langchain/core/language_models/chat_models';
import { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';
import { 
    LLM_PROVIDER_enum,
    GROQ_MODEL_enum,
    OPENAI_MODEL_enum,
    ANTHROPIC_MODEL_enum,
    GOOGLE_MODEL_enum,
    MISTRAL_MODEL_enum,
    EnumTypeGuards
} from '../../../../../types/common/enumTypes';
import { 
    LLMProviderTypeGuards,
    type LLMProviderConfig,
    type LLMProviderMetrics,
    type IGroqConfig,
    type IOpenAIConfig,
    type IAnthropicConfig,
    type IGoogleConfig,
    type IMistralConfig
} from '../../../../../types/llm/llmProviderTypes';
import { IBaseValidationResult } from '../../../../../types/common/commonBaseTypes';
import { createError } from '../../../../../types/common/commonErrorTypes';
import { createBaseMetadata } from '../../../../../types/common/commonMetadataTypes';

/**
 * Provider adapter interface
 */
export interface IProviderAdapter {
    readonly provider: LLM_PROVIDER_enum;
    validateConfig(config: LLMProviderConfig): Promise<IBaseValidationResult>;
    getMetrics(): Promise<LLMProviderMetrics>;
    call(messages: BaseMessage[], options: BaseChatModelCallOptions, runManager?: CallbackManagerForLLMRun): Promise<string>;
    streamCall(messages: BaseMessage[], options: BaseChatModelCallOptions, runManager?: CallbackManagerForLLMRun): AsyncGenerator<any>;
}

/**
 * Base provider adapter implementation
 */
abstract class BaseProviderAdapter implements IProviderAdapter {
    abstract readonly provider: LLM_PROVIDER_enum;
    protected config: LLMProviderConfig;

    constructor(config: LLMProviderConfig) {
        this.config = config;
    }

    abstract validateConfig(config: LLMProviderConfig): Promise<IBaseValidationResult>;
    abstract getMetrics(): Promise<LLMProviderMetrics>;
    abstract call(messages: BaseMessage[], options: BaseChatModelCallOptions, runManager?: CallbackManagerForLLMRun): Promise<string>;
    abstract streamCall(messages: BaseMessage[], options: BaseChatModelCallOptions, runManager?: CallbackManagerForLLMRun): AsyncGenerator<any>;

    protected createValidationMetadata(): IBaseValidationResult {
        return {
            isValid: true,
            errors: [],
            warnings: [],
            metadata: {
                ...createBaseMetadata(this.constructor.name, 'validateConfig'),
                validatedFields: ['provider', 'model', 'config']
            }
        };
    }
}

/**
 * Groq provider adapter
 */
class GroqAdapter extends BaseProviderAdapter {
    readonly provider = LLM_PROVIDER_enum.GROQ;

    async validateConfig(config: LLMProviderConfig): Promise<IBaseValidationResult> {
        const metadata = this.createValidationMetadata();
        metadata.isValid = LLMProviderTypeGuards.isGroqConfig(config) && 
            EnumTypeGuards.isGroqModel(config.model);
        return metadata;
    }

    async getMetrics(): Promise<LLMProviderMetrics> {
        throw new Error('Not implemented');
    }

    async call(messages: BaseMessage[], options: BaseChatModelCallOptions, runManager?: CallbackManagerForLLMRun): Promise<string> {
        throw new Error('Not implemented');
    }

    async *streamCall(messages: BaseMessage[], options: BaseChatModelCallOptions, runManager?: CallbackManagerForLLMRun): AsyncGenerator<any> {
        throw new Error('Not implemented');
    }
}

/**
 * OpenAI provider adapter
 */
class OpenAIAdapter extends BaseProviderAdapter {
    readonly provider = LLM_PROVIDER_enum.OPENAI;

    async validateConfig(config: LLMProviderConfig): Promise<IBaseValidationResult> {
        const metadata = this.createValidationMetadata();
        metadata.isValid = LLMProviderTypeGuards.isOpenAIConfig(config) && 
            EnumTypeGuards.isOpenAIModel(config.model);
        return metadata;
    }

    async getMetrics(): Promise<LLMProviderMetrics> {
        throw new Error('Not implemented');
    }

    async call(messages: BaseMessage[], options: BaseChatModelCallOptions, runManager?: CallbackManagerForLLMRun): Promise<string> {
        throw new Error('Not implemented');
    }

    async *streamCall(messages: BaseMessage[], options: BaseChatModelCallOptions, runManager?: CallbackManagerForLLMRun): AsyncGenerator<any> {
        throw new Error('Not implemented');
    }
}

/**
 * Anthropic provider adapter
 */
class AnthropicAdapter extends BaseProviderAdapter {
    readonly provider = LLM_PROVIDER_enum.ANTHROPIC;

    async validateConfig(config: LLMProviderConfig): Promise<IBaseValidationResult> {
        const metadata = this.createValidationMetadata();
        metadata.isValid = LLMProviderTypeGuards.isAnthropicConfig(config) && 
            EnumTypeGuards.isAnthropicModel(config.model);
        return metadata;
    }

    async getMetrics(): Promise<LLMProviderMetrics> {
        throw new Error('Not implemented');
    }

    async call(messages: BaseMessage[], options: BaseChatModelCallOptions, runManager?: CallbackManagerForLLMRun): Promise<string> {
        throw new Error('Not implemented');
    }

    async *streamCall(messages: BaseMessage[], options: BaseChatModelCallOptions, runManager?: CallbackManagerForLLMRun): AsyncGenerator<any> {
        throw new Error('Not implemented');
    }
}

/**
 * Google provider adapter
 */
class GoogleAdapter extends BaseProviderAdapter {
    readonly provider = LLM_PROVIDER_enum.GOOGLE;

    async validateConfig(config: LLMProviderConfig): Promise<IBaseValidationResult> {
        const metadata = this.createValidationMetadata();
        metadata.isValid = LLMProviderTypeGuards.isGoogleConfig(config) && 
            EnumTypeGuards.isGoogleModel(config.model);
        return metadata;
    }

    async getMetrics(): Promise<LLMProviderMetrics> {
        throw new Error('Not implemented');
    }

    async call(messages: BaseMessage[], options: BaseChatModelCallOptions, runManager?: CallbackManagerForLLMRun): Promise<string> {
        throw new Error('Not implemented');
    }

    async *streamCall(messages: BaseMessage[], options: BaseChatModelCallOptions, runManager?: CallbackManagerForLLMRun): AsyncGenerator<any> {
        throw new Error('Not implemented');
    }
}

/**
 * Mistral provider adapter
 */
class MistralAdapter extends BaseProviderAdapter {
    readonly provider = LLM_PROVIDER_enum.MISTRAL;

    async validateConfig(config: LLMProviderConfig): Promise<IBaseValidationResult> {
        const metadata = this.createValidationMetadata();
        metadata.isValid = LLMProviderTypeGuards.isMistralConfig(config) && 
            EnumTypeGuards.isMistralModel(config.model);
        return metadata;
    }

    async getMetrics(): Promise<LLMProviderMetrics> {
        throw new Error('Not implemented');
    }

    async call(messages: BaseMessage[], options: BaseChatModelCallOptions, runManager?: CallbackManagerForLLMRun): Promise<string> {
        throw new Error('Not implemented');
    }

    async *streamCall(messages: BaseMessage[], options: BaseChatModelCallOptions, runManager?: CallbackManagerForLLMRun): AsyncGenerator<any> {
        throw new Error('Not implemented');
    }
}

/**
 * Provider adapter factory
 */
export class ProviderAdapterFactory {
    private static instance: ProviderAdapterFactory;
    private adapters: Map<LLM_PROVIDER_enum, new (config: LLMProviderConfig) => IProviderAdapter>;

    private constructor() {
        this.adapters = new Map();
        this.registerDefaultAdapters();
    }

    public static getInstance(): ProviderAdapterFactory {
        if (!ProviderAdapterFactory.instance) {
            ProviderAdapterFactory.instance = new ProviderAdapterFactory();
        }
        return ProviderAdapterFactory.instance;
    }

    private registerDefaultAdapters(): void {
        this.adapters.set(LLM_PROVIDER_enum.GROQ, GroqAdapter);
        this.adapters.set(LLM_PROVIDER_enum.OPENAI, OpenAIAdapter);
        this.adapters.set(LLM_PROVIDER_enum.ANTHROPIC, AnthropicAdapter);
        this.adapters.set(LLM_PROVIDER_enum.GOOGLE, GoogleAdapter);
        this.adapters.set(LLM_PROVIDER_enum.MISTRAL, MistralAdapter);
    }

    public registerAdapter(provider: LLM_PROVIDER_enum, adapter: new (config: LLMProviderConfig) => IProviderAdapter): void {
        this.adapters.set(provider, adapter);
    }

    public createAdapter(config: LLMProviderConfig): IProviderAdapter {
        const AdapterClass = this.adapters.get(config.provider);
        if (!AdapterClass) {
            throw createError({
                message: `No adapter registered for provider: ${config.provider}`,
                type: 'ValidationError',
                context: {
                    component: this.constructor.name,
                    provider: config.provider
                }
            });
        }
        return new AdapterClass(config);
    }
}

export const providerAdapterFactory = ProviderAdapterFactory.getInstance();
