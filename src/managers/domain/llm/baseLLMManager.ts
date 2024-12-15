/**
 * @file baseLLMManager.ts
 * @path src/managers/domain/llm/baseLLMManager.ts
 * @description Base LLM manager providing core functionality and Langchain integration
 */

import { BaseChatModel, type BaseChatModelCallOptions } from '@langchain/core/language_models/chat_models';
import { BaseMessage, AIMessage, type MessageContent, type MessageContentComplex } from '@langchain/core/messages';
import { BaseLanguageModelInput } from '@langchain/core/language_models/base';
import { CallbackManager } from '@langchain/core/callbacks/manager';
import { Generation, LLMResult } from '@langchain/core/outputs';

import { CoreManager } from '../../core/coreManager';
import { LLM_PROVIDER_enum, MANAGER_CATEGORY_enum, LLM_STATUS_enum } from '../../../types/common/enumTypes';
import { ERROR_KINDS } from '../../../types/common/errorTypes';
import { createBaseMetadata } from '../../../types/common/baseTypes';
import { convertToBaseMessages } from '../../../utils/llm/messageConverter';
import { MetricDomain, MetricType } from '../../../types/metrics/base/metricsManagerTypes';
import { HarmCategory } from '../../../types/llm/googleTypes';

import {
    ILLMProviderTypeGuards,
    type ILLMProviderConfig,
    type ILLMProviderMetrics,
    type ProviderInstance,
    type IProviderManager,
    type IGroqMetrics,
    type IOpenAIMetrics,
    type IAnthropicMetrics,
    type IGoogleMetrics,
    type IMistralMetrics,
    type IBaseProviderMetrics
} from '../../../types/llm/llmProviderTypes';

import {
    type LLMResponse,
    type ITokenUsage,
    type IGroqResponse,
    type IOpenAIResponse,
    type IAnthropicResponse,
    type IGoogleResponse,
    type IMistralResponse,
    LLMResponseTypeGuards
} from '../../../types/llm/llmResponseTypes';

import { MessageMetricsManager } from './messageMetricsManager';
import { ProviderManager } from './providerManager';
import { LLMInitializationManager } from './llmInitializationManager';
import type { ILLMMetrics } from '../../../types/llm/llmMetricTypes';
import type { ILLMResourceMetrics } from '../../../types/llm/llmResourceTypes';
import { isLLMInstance, type ILLMInstance } from '../../../types/llm/llmInstanceTypes';
import type { IBaseMessageMetadata } from '../../../types/llm/message';

type SupportedProvider = Exclude<LLM_PROVIDER_enum, LLM_PROVIDER_enum.UNKNOWN>;

type ValidInstance = ILLMInstance & {
    provider: SupportedProvider;
    metrics: ILLMProviderMetrics;
};

function isValidInstance(instance: unknown): instance is ValidInstance {
    if (!isLLMInstance(instance)) return false;
    return Object.values(LLM_PROVIDER_enum).includes(instance.provider) && 
           instance.provider !== LLM_PROVIDER_enum.UNKNOWN;
}

function extractText(content: MessageContent): string {
    if (typeof content === 'string') {
        return content;
    }
    if (Array.isArray(content)) {
        return content.map(item => {
            if (typeof item === 'string') {
                return item;
            }
            if (typeof item === 'object' && item !== null && 'type' in item) {
                const complex = item as MessageContentComplex;
                if (complex.type === 'text' && typeof complex.text === 'string') {
                    return complex.text;
                }
            }
            return '';
        }).filter(Boolean).join(' ');
    }
    if (typeof content === 'object' && content !== null && 'type' in content) {
        const complex = content as MessageContentComplex;
        if (complex.type === 'text' && typeof complex.text === 'string') {
            return complex.text;
        }
    }
    return '';
}

export class BaseLLMManager extends CoreManager {
    private static instance: BaseLLMManager;
    private readonly instances: Map<string, ValidInstance>;
    private readonly models: Map<string, BaseChatModel>;
    private readonly configs: Map<string, ILLMProviderConfig>;
    private readonly callbackManagers: Map<string, CallbackManager>;
    private readonly providerManager: ProviderManager;
    private readonly initManager: LLMInitializationManager;
    public readonly category = MANAGER_CATEGORY_enum.RESOURCE;

    protected constructor() {
        super();
        this.instances = new Map();
        this.models = new Map();
        this.configs = new Map();
        this.callbackManagers = new Map();
        this.providerManager = ProviderManager.getInstance();
        this.initManager = LLMInitializationManager.getInstance();
        this.registerDomainManager('BaseLLMManager', this);
    }

    public static getInstance(): BaseLLMManager {
        if (!BaseLLMManager.instance) {
            BaseLLMManager.instance = new BaseLLMManager();
        }
        return BaseLLMManager.instance;
    }

    private createGoogleSafetyRatingsForResponse() {
        return Object.values(HarmCategory).map(category => ({
            category: category.toString(),
            probability: 0,
            filtered: false
        }));
    }

    private createGoogleSafetyRatingsForMetrics(): Record<HarmCategory, number> {
        return Object.values(HarmCategory).reduce((acc, category) => ({
            ...acc,
            [category]: 0
        }), {} as Record<HarmCategory, number>);
    }

    private createProviderResponse(
        provider: SupportedProvider,
        baseResponse: {
            provider: SupportedProvider;
            model: string;
            message: AIMessage;
            metrics: IBaseProviderMetrics;
            generations: Generation[][];
            llmOutput: { tokenUsage: ITokenUsage };
        }
    ): LLMResponse {
        const { metrics } = baseResponse;

        switch (provider) {
            case LLM_PROVIDER_enum.GROQ:
                return {
                    ...baseResponse,
                    provider: LLM_PROVIDER_enum.GROQ,
                    streamingMetrics: {
                        firstTokenLatency: 0,
                        tokensPerSecond: 0,
                        totalStreamingTime: 0
                    },
                    gpuMetrics: {
                        utilization: metrics.resources.memoryUsage / 100,
                        memoryUsed: metrics.resources.memoryUsage,
                        temperature: 0
                    }
                };

            case LLM_PROVIDER_enum.ANTHROPIC:
                return {
                    ...baseResponse,
                    provider: LLM_PROVIDER_enum.ANTHROPIC,
                    stopReason: 'end_turn',
                    modelVersion: '1.0',
                    intermediateResponses: []
                };

            case LLM_PROVIDER_enum.GOOGLE:
                return {
                    ...baseResponse,
                    provider: LLM_PROVIDER_enum.GOOGLE,
                    safetyRatings: this.createGoogleSafetyRatingsForResponse(),
                    citationMetadata: {
                        citations: []
                    }
                };

            case LLM_PROVIDER_enum.MISTRAL:
                return {
                    ...baseResponse,
                    provider: LLM_PROVIDER_enum.MISTRAL,
                    responseQuality: {
                        coherence: 1,
                        relevance: 1,
                        toxicity: 0
                    }
                };

            case LLM_PROVIDER_enum.OPENAI:
            default:
                // Default to OpenAI-style response for unknown providers
                return {
                    ...baseResponse,
                    provider: LLM_PROVIDER_enum.OPENAI,
                    finishReason: 'stop',
                    systemFingerprint: '',
                    promptFilterResults: {
                        filtered: false
                    }
                };
        }
    }

    public async generate(
        instanceId: string,
        input: BaseLanguageModelInput,
        options?: BaseChatModelCallOptions
    ): Promise<LLMResponse> {
        const instance = this.instances.get(instanceId);
        const model = this.models.get(instanceId);
        const config = this.configs.get(instanceId);

        if (!instance || !model || !config) {
            await this.handleError(
                new Error(`Invalid LLM instance state for ID: ${instanceId}`),
                'generate',
                ERROR_KINDS.StateError
            );
            throw new Error(`Invalid LLM instance state for ID: ${instanceId}`);
        }

        if (!isValidInstance(instance)) {
            await this.handleError(
                new Error('Invalid LLM instance'),
                'generate',
                ERROR_KINDS.ValidationError
            );
            throw new Error('Invalid LLM instance');
        }

        const messages = convertToBaseMessages(input);
        const result = await model.invoke(messages, options);
        const metrics = await instance.getMetrics();

        const baseResponse = {
            provider: instance.provider,
            model: config.model,
            message: result,
            metrics,
            generations: [[{ text: extractText(result.content), generationInfo: {} }]] as Generation[][],
            llmOutput: {
                tokenUsage: {
                    promptTokens: 0,
                    completionTokens: 0,
                    totalTokens: 0
                }
            }
        };

        return this.createProviderResponse(instance.provider, baseResponse);
    }

    private async createProviderMetrics(
        instanceId: string,
        config: ILLMProviderConfig
    ): Promise<ILLMProviderMetrics> {
        const metrics = await MessageMetricsManager.getInstance().getMetrics(instanceId);
        if (!metrics) {
            await this.handleError(
                new Error(`No metrics found for instance ${instanceId}`),
                'createProviderMetrics',
                ERROR_KINDS.StateError
            );
            throw new Error(`No metrics found for instance ${instanceId}`);
        }

        const now = Date.now();
        const baseMetrics = metrics.performance[metrics.performance.length - 1];

        const commonMetrics = {
            latency: baseMetrics.latency.average,
            tokenUsage: metrics.usage[metrics.usage.length - 1].tokenDistribution,
            cost: {
                promptCost: 0,
                completionCost: 0,
                totalCost: 0,
                currency: 'USD'
            },
            resources: baseMetrics.resourceUtilization as ILLMResourceMetrics,
            performance: baseMetrics,
            usage: metrics.usage[metrics.usage.length - 1],
            timestamp: now
        };

        switch (config.provider) {
            case LLM_PROVIDER_enum.GROQ:
                return {
                    ...commonMetrics,
                    provider: LLM_PROVIDER_enum.GROQ,
                    model: config.model,
                    contextWindow: config.contextWindow || 0,
                    streamingLatency: config.streamingLatency || 0,
                    gpuUtilization: baseMetrics.resourceUtilization.memoryUsage / 100
                } as IGroqMetrics;

            case LLM_PROVIDER_enum.ANTHROPIC:
                return {
                    ...commonMetrics,
                    provider: LLM_PROVIDER_enum.ANTHROPIC,
                    model: config.model,
                    contextUtilization: config.contextUtilization || 0,
                    responseQuality: baseMetrics.coherenceScore,
                    modelConfidence: 1 - baseMetrics.errorRate
                } as IAnthropicMetrics;

            case LLM_PROVIDER_enum.GOOGLE:
                return {
                    ...commonMetrics,
                    provider: LLM_PROVIDER_enum.GOOGLE,
                    model: config.model,
                    safetyRatings: this.createGoogleSafetyRatingsForMetrics(),
                    modelLatency: baseMetrics.executionTime.average,
                    apiOverhead: baseMetrics.latency.average - baseMetrics.executionTime.average
                } as IGoogleMetrics;

            case LLM_PROVIDER_enum.MISTRAL:
                return {
                    ...commonMetrics,
                    provider: LLM_PROVIDER_enum.MISTRAL,
                    model: config.model,
                    inferenceTime: baseMetrics.executionTime.average,
                    throughput: baseMetrics.throughput.operationsPerSecond,
                    gpuMemoryUsage: baseMetrics.resourceUtilization.memoryUsage
                } as IMistralMetrics;

            case LLM_PROVIDER_enum.OPENAI:
            default:
                // Default to OpenAI metrics for unknown providers
                return {
                    ...commonMetrics,
                    provider: LLM_PROVIDER_enum.OPENAI,
                    model: config.model,
                    promptTokens: metrics.usage[metrics.usage.length - 1].tokenDistribution.prompt,
                    completionTokens: metrics.usage[metrics.usage.length - 1].tokenDistribution.completion,
                    totalTokens: metrics.usage[metrics.usage.length - 1].tokenDistribution.total,
                    requestOverhead: baseMetrics.latency.average - baseMetrics.executionTime.average
                } as IOpenAIMetrics;
        }
    }

    private generateInstanceId(config: ILLMProviderConfig): string {
        return `${LLM_PROVIDER_enum[config.provider]}_${config.model}_${Date.now()}`;
    }

    private generateRunId(prefix: string = 'run'): string {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 15);
        return `${prefix}_${timestamp}_${random}`;
    }

    private createLLMResult(
        content: string | BaseMessage,
        tokenUsage: ITokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
    ): LLMResult {
        const text = typeof content === 'string' ? content : extractText(content.content);
        return {
            generations: [[{ text, generationInfo: {} }]],
            llmOutput: { tokenUsage },
        };
    }
}

export default BaseLLMManager.getInstance();
