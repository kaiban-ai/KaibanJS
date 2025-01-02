/**
 * @file providerAdapter.ts
 * @path src/managers/domain/llm/agent/providers/providerAdapter.ts
 * @description Provider-specific adapter implementations for LLM agents
 */

import { BaseMessage, AIMessageChunk } from '@langchain/core/messages';
import { BaseChatModelCallOptions } from '@langchain/core/language_models/chat_models';
import { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';
import { ChatGroq } from '@langchain/groq';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatMistralAI } from '@langchain/mistralai';
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
    ILLMProviderTypeGuards,
    type ILLMProviderConfig,
    type ILLMProviderMetrics,
    type IGroqMetrics,
    type IOpenAIMetrics,
    type IAnthropicMetrics,
    type IGoogleMetrics,
    type IMistralMetrics
} from '../../../../../types/llm/llmProviderTypes';
import { IValidationResult } from '../../../../../types/common/validationTypes';
import { createError, ERROR_KINDS } from '../../../../../types/common/errorTypes';
import { createBaseMetadata } from '../../../../../types/common/baseTypes';
import { MetricsAdapter } from '../../../../../metrics/MetricsAdapter';
import type { ILLMMetrics } from '../../../../../types/llm/llmMetricTypes';
import { HarmCategory } from '../../../../../types/llm/googleTypes';

type SupportedProvider = 
    | LLM_PROVIDER_enum.GROQ 
    | LLM_PROVIDER_enum.OPENAI 
    | LLM_PROVIDER_enum.ANTHROPIC 
    | LLM_PROVIDER_enum.GOOGLE 
    | LLM_PROVIDER_enum.MISTRAL;

type BaseCallOptions = Omit<BaseChatModelCallOptions, 'tool_choice'> & {
    callbacks?: CallbackManagerForLLMRun[];
};

const BASE_METRICS_FIELDS = {
    component: 'llm',
    category: 'provider',
    version: '1.0.0'
} as const;

const DEFAULT_SAFETY_RATINGS: Record<HarmCategory, number> = {
    [HarmCategory.HARM_CATEGORY_UNSPECIFIED]: 0,
    [HarmCategory.HARM_CATEGORY_HATE_SPEECH]: 0,
    [HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT]: 0,
    [HarmCategory.HARM_CATEGORY_HARASSMENT]: 0,
    [HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT]: 0
};

export interface IProviderAdapter {
    readonly provider: SupportedProvider;
    validateConfig(config: ILLMProviderConfig): Promise<IValidationResult>;
    getMetrics(): Promise<ILLMProviderMetrics>;
    call(messages: BaseMessage[], options: BaseCallOptions, runManager?: CallbackManagerForLLMRun): Promise<string>;
    streamCall(messages: BaseMessage[], options: BaseCallOptions, runManager?: CallbackManagerForLLMRun): AsyncGenerator<AIMessageChunk>;
}

abstract class BaseProviderAdapter implements IProviderAdapter {
    abstract readonly provider: SupportedProvider;
    protected config: ILLMProviderConfig;
    protected startTime: number;
    protected llmInstance: ChatGroq | ChatOpenAI | ChatAnthropic | ChatGoogleGenerativeAI | ChatMistralAI;

    constructor(config: ILLMProviderConfig) {
        this.config = config;
        this.startTime = Date.now();
        this.llmInstance = this.createLLMInstance();
    }

    protected abstract createLLMInstance(): ChatGroq | ChatOpenAI | ChatAnthropic | ChatGoogleGenerativeAI | ChatMistralAI;
    abstract validateConfig(config: ILLMProviderConfig): Promise<IValidationResult>;
    abstract call(messages: BaseMessage[], options: BaseCallOptions, runManager?: CallbackManagerForLLMRun): Promise<string>;
    abstract streamCall(messages: BaseMessage[], options: BaseCallOptions, runManager?: CallbackManagerForLLMRun): AsyncGenerator<AIMessageChunk>;

    protected createValidationMetadata(): IValidationResult {
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

    protected createProviderMetrics(baseMetrics: ILLMMetrics): ILLMProviderMetrics {
        const commonMetrics = {
            ...BASE_METRICS_FIELDS,
            provider: this.provider,
            model: this.config.model,
            latency: Date.now() - this.startTime,
            tokenUsage: {
                prompt: baseMetrics.usage.tokenDistribution.prompt,
                completion: baseMetrics.usage.tokenDistribution.completion,
                total: baseMetrics.usage.tokenDistribution.total
            },
            cost: {
                promptCost: 0,
                completionCost: 0,
                totalCost: 0,
                currency: 'USD'
            },
            resources: baseMetrics.resources,
            performance: baseMetrics.performance,
            usage: baseMetrics.usage,
            timestamp: Date.now()
        };

        switch (this.provider) {
            case LLM_PROVIDER_enum.GROQ:
                return {
                    ...commonMetrics,
                    provider: LLM_PROVIDER_enum.GROQ,
                    model: this.config.model as GROQ_MODEL_enum,
                    contextWindow: 0,
                    streamingLatency: 0,
                    gpuUtilization: 0,
                    timestamp: Date.now()
                } as IGroqMetrics;

            case LLM_PROVIDER_enum.OPENAI:
                return {
                    ...commonMetrics,
                    provider: LLM_PROVIDER_enum.OPENAI,
                    model: this.config.model as OPENAI_MODEL_enum,
                    promptTokens: baseMetrics.usage.tokenDistribution.prompt,
                    completionTokens: baseMetrics.usage.tokenDistribution.completion,
                    totalTokens: baseMetrics.usage.tokenDistribution.total,
                    requestOverhead: 0,
                    timestamp: Date.now()
                } as IOpenAIMetrics;

            case LLM_PROVIDER_enum.ANTHROPIC:
                return {
                    ...commonMetrics,
                    provider: LLM_PROVIDER_enum.ANTHROPIC,
                    model: this.config.model as ANTHROPIC_MODEL_enum,
                    contextUtilization: 0,
                    responseQuality: 0,
                    modelConfidence: 0,
                    timestamp: Date.now()
                } as IAnthropicMetrics;

            case LLM_PROVIDER_enum.GOOGLE:
                return {
                    ...commonMetrics,
                    provider: LLM_PROVIDER_enum.GOOGLE,
                    model: this.config.model as GOOGLE_MODEL_enum,
                    safetyRatings: DEFAULT_SAFETY_RATINGS,
                    modelLatency: 0,
                    apiOverhead: 0,
                    timestamp: Date.now()
                } as IGoogleMetrics;

            case LLM_PROVIDER_enum.MISTRAL:
                return {
                    ...commonMetrics,
                    provider: LLM_PROVIDER_enum.MISTRAL,
                    model: this.config.model as MISTRAL_MODEL_enum,
                    inferenceTime: 0,
                    throughput: 0,
                    gpuMemoryUsage: 0,
                    timestamp: Date.now()
                } as IMistralMetrics;

            default:
                throw createError({
                    message: `Unsupported provider: ${this.provider}`,
                    type: ERROR_KINDS.ValidationError,
                    context: {
                        component: this.constructor.name,
                        provider: this.provider
                    }
                });
        }
    }

    async getMetrics(): Promise<ILLMProviderMetrics> {
        const baseMetrics = MetricsAdapter.fromLangchainCallback(
            {},
            undefined,
            this.startTime,
            Date.now()
        );

        return this.createProviderMetrics(baseMetrics);
    }

    protected async handleError(error: unknown, operation: string): Promise<never> {
        const errorContext = {
            component: this.constructor.name,
            provider: this.provider,
            model: this.config.model,
            operation,
            timestamp: Date.now()
        };

        if (error instanceof Error) {
            throw createError({
                message: error.message,
                type: ERROR_KINDS.ExecutionError,
                context: errorContext,
                cause: error
            });
        }

        throw createError({
            message: 'Unknown provider error',
            type: ERROR_KINDS.ExecutionError,
            context: errorContext
        });
    }
}

class GroqAdapter extends BaseProviderAdapter {
    readonly provider = LLM_PROVIDER_enum.GROQ;

    protected createLLMInstance(): ChatGroq {
        if (!ILLMProviderTypeGuards.isGroqConfig(this.config)) {
            throw createError({
                message: 'Invalid Groq configuration',
                type: ERROR_KINDS.ValidationError,
                context: {
                    component: this.constructor.name,
                    provider: this.provider
                }
            });
        }

        return new ChatGroq({
            apiKey: this.config.apiKey,
            model: this.config.model,
            temperature: this.config.temperature,
            maxTokens: this.config.maxTokens,
            streaming: this.config.streaming
        });
    }

    async validateConfig(config: ILLMProviderConfig): Promise<IValidationResult> {
        return {
            ...this.createValidationMetadata(),
            isValid: ILLMProviderTypeGuards.isGroqConfig(config) && 
                EnumTypeGuards.isGroqModel(config.model)
        };
    }

    async call(
        messages: BaseMessage[],
        options: BaseCallOptions,
        runManager?: CallbackManagerForLLMRun
    ): Promise<string> {
        try {
            const response = await this.llmInstance.invoke(messages, {
                ...options,
                callbacks: runManager ? [runManager] : undefined
            });
            return typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
        } catch (error) {
            throw await this.handleError(error, 'call');
        }
    }

    async *streamCall(
        messages: BaseMessage[],
        options: BaseCallOptions,
        runManager?: CallbackManagerForLLMRun
    ): AsyncGenerator<AIMessageChunk> {
        try {
            const stream = await this.llmInstance.stream(messages, {
                ...options,
                callbacks: runManager ? [runManager] : undefined
            });

            for await (const chunk of stream) {
                if (chunk instanceof AIMessageChunk) {
                    yield chunk;
                }
            }
        } catch (error) {
            throw await this.handleError(error, 'streamCall');
        }
    }
}

class OpenAIAdapter extends BaseProviderAdapter {
    readonly provider = LLM_PROVIDER_enum.OPENAI;

    protected createLLMInstance(): ChatOpenAI {
        if (!ILLMProviderTypeGuards.isOpenAIConfig(this.config)) {
            throw createError({
                message: 'Invalid OpenAI configuration',
                type: ERROR_KINDS.ValidationError,
                context: {
                    component: this.constructor.name,
                    provider: this.provider
                }
            });
        }

        const config = {
            modelName: this.config.model,
            model: this.config.model,
            temperature: this.config.temperature ?? 0.7,
            maxTokens: this.config.maxTokens ?? 2048,
            streaming: this.config.streaming ?? false,
            frequencyPenalty: this.config.frequencyPenalty ?? 0,
            presencePenalty: this.config.presencePenalty ?? 0,
            topP: 1,
            n: 1,
            openAIApiKey: this.config.apiKey,
            organization: this.config.organization
        };

        return new ChatOpenAI(config);
    }

    async validateConfig(config: ILLMProviderConfig): Promise<IValidationResult> {
        return {
            ...this.createValidationMetadata(),
            isValid: ILLMProviderTypeGuards.isOpenAIConfig(config) && 
                EnumTypeGuards.isOpenAIModel(config.model)
        };
    }

    async call(
        messages: BaseMessage[],
        options: BaseCallOptions,
        runManager?: CallbackManagerForLLMRun
    ): Promise<string> {
        try {
            const response = await this.llmInstance.invoke(messages, {
                ...options,
                callbacks: runManager ? [runManager] : undefined
            });
            return typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
        } catch (error) {
            throw await this.handleError(error, 'call');
        }
    }

    async *streamCall(
        messages: BaseMessage[],
        options: BaseCallOptions,
        runManager?: CallbackManagerForLLMRun
    ): AsyncGenerator<AIMessageChunk> {
        try {
            const stream = await this.llmInstance.stream(messages, {
                ...options,
                callbacks: runManager ? [runManager] : undefined
            });

            for await (const chunk of stream) {
                if (chunk instanceof AIMessageChunk) {
                    yield chunk;
                }
            }
        } catch (error) {
            throw await this.handleError(error, 'streamCall');
        }
    }
}

class AnthropicAdapter extends BaseProviderAdapter {
    readonly provider = LLM_PROVIDER_enum.ANTHROPIC;

    protected createLLMInstance(): ChatAnthropic {
        if (!ILLMProviderTypeGuards.isAnthropicConfig(this.config)) {
            throw createError({
                message: 'Invalid Anthropic configuration',
                type: ERROR_KINDS.ValidationError,
                context: {
                    component: this.constructor.name,
                    provider: this.provider
                }
            });
        }

        return new ChatAnthropic({
            apiKey: this.config.apiKey,
            model: this.config.model,
            temperature: this.config.temperature,
            maxTokens: this.config.maxTokens,
            streaming: this.config.streaming,
            anthropicApiUrl: this.config.anthropicApiUrl
        });
    }

    async validateConfig(config: ILLMProviderConfig): Promise<IValidationResult> {
        return {
            ...this.createValidationMetadata(),
            isValid: ILLMProviderTypeGuards.isAnthropicConfig(config) && 
                EnumTypeGuards.isAnthropicModel(config.model)
        };
    }

    async call(
        messages: BaseMessage[],
        options: BaseCallOptions,
        runManager?: CallbackManagerForLLMRun
    ): Promise<string> {
        try {
            const response = await this.llmInstance.invoke(messages, {
                ...options,
                callbacks: runManager ? [runManager] : undefined
            });
            return typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
        } catch (error) {
            throw await this.handleError(error, 'call');
        }
    }

    async *streamCall(
        messages: BaseMessage[],
        options: BaseCallOptions,
        runManager?: CallbackManagerForLLMRun
    ): AsyncGenerator<AIMessageChunk> {
        try {
            const stream = await this.llmInstance.stream(messages, {
                ...options,
                callbacks: runManager ? [runManager] : undefined
            });

            for await (const chunk of stream) {
                if (chunk instanceof AIMessageChunk) {
                    yield chunk;
                }
            }
        } catch (error) {
            throw await this.handleError(error, 'streamCall');
        }
    }
}

class GoogleAdapter extends BaseProviderAdapter {
    readonly provider = LLM_PROVIDER_enum.GOOGLE;

    protected createLLMInstance(): ChatGoogleGenerativeAI {
        if (!ILLMProviderTypeGuards.isGoogleConfig(this.config)) {
            throw createError({
                message: 'Invalid Google configuration',
                type: ERROR_KINDS.ValidationError,
                context: {
                    component: this.constructor.name,
                    provider: this.provider
                }
            });
        }

        return new ChatGoogleGenerativeAI({
            apiKey: this.config.apiKey,
            modelName: this.config.model,
            temperature: this.config.temperature ?? 0.7,
            maxOutputTokens: this.config.maxTokens ?? 2048,
            streaming: this.config.streaming ?? false,
            safetySettings: this.config.safetySettings ?? [],
            baseUrl: this.config.baseUrl
        });
    }

    async validateConfig(config: ILLMProviderConfig): Promise<IValidationResult> {
        return {
            ...this.createValidationMetadata(),
            isValid: ILLMProviderTypeGuards.isGoogleConfig(config) && 
                EnumTypeGuards.isGoogleModel(config.model)
        };
    }

    async call(
        messages: BaseMessage[],
        options: BaseCallOptions,
        runManager?: CallbackManagerForLLMRun
    ): Promise<string> {
        try {
            const response = await this.llmInstance.invoke(messages, {
                ...options,
                callbacks: runManager ? [runManager] : undefined
            });
            return typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
        } catch (error) {
            throw await this.handleError(error, 'call');
        }
    }

    async *streamCall(
        messages: BaseMessage[],
        options: BaseCallOptions,
        runManager?: CallbackManagerForLLMRun
    ): AsyncGenerator<AIMessageChunk> {
        try {
            const stream = await this.llmInstance.stream(messages, {
                ...options,
                callbacks: runManager ? [runManager] : undefined
            });

            for await (const chunk of stream) {
                if (chunk instanceof AIMessageChunk) {
                    yield chunk;
                }
            }
        } catch (error) {
            throw await this.handleError(error, 'streamCall');
        }
    }
}

class MistralAdapter extends BaseProviderAdapter {
    readonly provider = LLM_PROVIDER_enum.MISTRAL;

    protected createLLMInstance(): ChatMistralAI {
        if (!ILLMProviderTypeGuards.isMistralConfig(this.config)) {
            throw createError({
                message: 'Invalid Mistral configuration',
                type: ERROR_KINDS.ValidationError,
                context: {
                    component: this.constructor.name,
                    provider: this.provider
                }
            });
        }

        return new ChatMistralAI({
            apiKey: this.config.apiKey,
            modelName: this.config.model,
            temperature: this.config.temperature ?? 0.7,
            maxTokens: this.config.maxTokens ?? 2048,
            streaming: this.config.streaming ?? false,
            endpoint: this.config.endpoint
        });
    }

    async validateConfig(config: ILLMProviderConfig): Promise<IValidationResult> {
        return {
            ...this.createValidationMetadata(),
            isValid: ILLMProviderTypeGuards.isMistralConfig(config) && 
                EnumTypeGuards.isMistralModel(config.model)
        };
    }

    async call(
        messages: BaseMessage[],
        options: BaseCallOptions,
        runManager?: CallbackManagerForLLMRun
    ): Promise<string> {
        try {
            const response = await this.llmInstance.invoke(messages, {
                ...options,
                callbacks: runManager ? [runManager] : undefined
            });
            return typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
        } catch (error) {
            throw await this.handleError(error, 'call');
        }
    }

    async *streamCall(
        messages: BaseMessage[],
        options: BaseCallOptions,
        runManager?: CallbackManagerForLLMRun
    ): AsyncGenerator<AIMessageChunk> {
        try {
            const stream = await this.llmInstance.stream(messages, {
                ...options,
                callbacks: runManager ? [runManager] : undefined
            });

            for await (const chunk of stream) {
                if (chunk instanceof AIMessageChunk) {
                    yield chunk;
                }
            }
        } catch (error) {
            throw await this.handleError(error, 'streamCall');
        }
    }
}

export class ProviderAdapterFactory {
    private static instance: ProviderAdapterFactory;
    private adapters: Map<SupportedProvider, new (config: ILLMProviderConfig) => IProviderAdapter>;

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

    public registerAdapter(provider: SupportedProvider, adapter: new (config: ILLMProviderConfig) => IProviderAdapter): void {
        this.adapters.set(provider, adapter);
    }

    public createAdapter(config: ILLMProviderConfig): IProviderAdapter {
        const AdapterClass = this.adapters.get(config.provider as SupportedProvider);
        if (!AdapterClass) {
            throw createError({
                message: `No adapter registered for provider: ${config.provider}`,
                type: ERROR_KINDS.ValidationError,
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
