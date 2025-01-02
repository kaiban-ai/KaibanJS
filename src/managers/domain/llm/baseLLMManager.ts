/**
 * @file baseLLMManager.ts
 * @path src/managers/domain/llm/baseLLMManager.ts
 * @description Base LLM manager providing core functionality and Langchain integration
 */

// External dependencies
import { BaseChatModel, type BaseChatModelCallOptions } from '@langchain/core/language_models/chat_models';
import { type MessageContent, type MessageContentComplex, AIMessageChunk, AIMessage } from '@langchain/core/messages';
import { BaseLanguageModelInput } from '@langchain/core/language_models/base';

// Core dependencies
import { CoreManager } from '../../core/coreManager';
import { convertToBaseMessages } from '../../../utils/llm/messageConverter';

// Type imports - Common
import { LLM_PROVIDER_enum, MANAGER_CATEGORY_enum, LLM_STATUS_enum } from '../../../types/common/enumTypes';
import { ERROR_KINDS, ERROR_SEVERITY_enum, type IErrorKind, type IErrorSeverity } from '../../../types/common/errorTypes';

// Type imports - LLM specific
import { HarmCategory } from '../../../types/llm/googleTypes';
import {
    type ILLMProviderConfig,
    type ILLMProviderMetrics,
    type IGroqMetrics,
    type IOpenAIMetrics,
    type IAnthropicMetrics,
    type IGoogleMetrics,
    type IMistralMetrics,
    type IBaseProviderMetrics
} from '../../../types/llm/llmProviderTypes';
import { type LLMResponse, type ITokenUsage } from '../../../types/llm/llmResponseTypes';
import type { ILLMResourceMetrics } from '../../../types/llm/llmResourceTypes';
import { isLLMInstance, type ILLMInstance } from '../../../types/llm/llmInstanceTypes';

// Local imports
import { MessageMetricsManager } from './messageMetricsManager';

type SupportedProvider = Exclude<LLM_PROVIDER_enum, LLM_PROVIDER_enum.UNKNOWN>;

type ValidInstance = ILLMInstance & {
    provider: SupportedProvider;
    metrics: ILLMProviderMetrics;
};

interface IBaseLLMResponse {
    provider: SupportedProvider;
    model: string;
    message: AIMessage;
    metrics: IBaseProviderMetrics;
    generations: Array<Array<{ text: string; generationInfo: Record<string, unknown> }>>;
    llmOutput: {
        tokenUsage: ITokenUsage;
        modelOutput: Record<string, unknown>;
    };
}

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
    private readonly modelInstances: Map<string, BaseChatModel>;
    private readonly configs: Map<string, ILLMProviderConfig>;
    public readonly category = MANAGER_CATEGORY_enum.RESOURCE;

    protected constructor() {
        super();
        this.instances = new Map();
        this.modelInstances = new Map();
        this.configs = new Map();
        this.registerDomainManager('BaseLLMManager', this);
    }

    public createErrorTypeRecord(): Record<IErrorKind, number> {
        return Object.values(ERROR_KINDS).reduce((acc, kind) => ({
            ...acc,
            [kind]: 0
        }), {} as Record<IErrorKind, number>);
    }

    public createErrorSeverityRecord(): Record<IErrorSeverity, number> {
        return Object.values(ERROR_SEVERITY_enum).reduce((acc, severity) => ({
            ...acc,
            [severity]: 0
        }), {} as Record<IErrorSeverity, number>);
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
        baseResponse: IBaseLLMResponse
    ): LLMResponse {
        const baseMetrics = baseResponse.metrics;
        const generationInfo = {} as Record<string, unknown>;
        const llmOutput = {
            tokenUsage: baseResponse.llmOutput.tokenUsage,
            modelOutput: baseResponse.llmOutput.modelOutput
        };

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
                        utilization: baseMetrics.resources.memoryUsage / 100,
                        memoryUsed: baseMetrics.resources.memoryUsage,
                        temperature: 0
                    },
                    metrics: {
                        ...baseMetrics,
                        provider: LLM_PROVIDER_enum.GROQ,
                        model: baseResponse.model,
                        contextWindow: 0,
                        streamingLatency: 0,
                        gpuUtilization: baseMetrics.resources.memoryUsage / 100
                    } as IGroqMetrics,
                    generations: [[{ text: extractText(baseResponse.message.content), generationInfo }]],
                    llmOutput
                };

            case LLM_PROVIDER_enum.ANTHROPIC:
                return {
                    ...baseResponse,
                    provider: LLM_PROVIDER_enum.ANTHROPIC,
                    stopReason: 'end_turn',
                    modelVersion: '1.0',
                    intermediateResponses: [],
                    metrics: {
                        ...baseMetrics,
                        provider: LLM_PROVIDER_enum.ANTHROPIC,
                        model: baseResponse.model,
                        contextUtilization: 0,
                        responseQuality: (baseMetrics.performance as any).coherenceScore || 0,
                        modelConfidence: 1 - ((baseMetrics.performance as any).errorRate || 0)
                    } as IAnthropicMetrics,
                    generations: [[{ text: extractText(baseResponse.message.content), generationInfo }]],
                    llmOutput
                };

            case LLM_PROVIDER_enum.GOOGLE:
                return {
                    ...baseResponse,
                    provider: LLM_PROVIDER_enum.GOOGLE,
                    safetyRatings: this.createGoogleSafetyRatingsForResponse(),
                    citationMetadata: {
                        citations: []
                    },
                    metrics: {
                        ...baseMetrics,
                        provider: LLM_PROVIDER_enum.GOOGLE,
                        model: baseResponse.model,
                        safetyRatings: this.createGoogleSafetyRatingsForMetrics(),
                        modelLatency: baseMetrics.performance.responseTime.average,
                        apiOverhead: baseMetrics.performance.responseTime.max - baseMetrics.performance.responseTime.average
                    } as IGoogleMetrics,
                    generations: [[{ text: extractText(baseResponse.message.content), generationInfo }]],
                    llmOutput
                };

            case LLM_PROVIDER_enum.MISTRAL:
                return {
                    ...baseResponse,
                    provider: LLM_PROVIDER_enum.MISTRAL,
                    responseQuality: {
                        coherence: 1,
                        relevance: 1,
                        toxicity: 0
                    },
                    metrics: {
                        ...baseMetrics,
                        provider: LLM_PROVIDER_enum.MISTRAL,
                        model: baseResponse.model,
                        inferenceTime: baseMetrics.performance.responseTime.average,
                        throughput: (baseMetrics.performance as any).tokensPerSecond || 0,
                        gpuMemoryUsage: baseMetrics.resources.memoryUsage
                    } as IMistralMetrics,
                    generations: [[{ text: extractText(baseResponse.message.content), generationInfo }]],
                    llmOutput
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
                    },
                    metrics: {
                        ...baseMetrics,
                        provider: LLM_PROVIDER_enum.OPENAI,
                        model: baseResponse.model,
                        promptTokens: (baseMetrics.usage as any).tokenDistribution?.prompt || 0,
                        completionTokens: (baseMetrics.usage as any).tokenDistribution?.completion || 0,
                        totalTokens: (baseMetrics.usage as any).tokenDistribution?.total || 0,
                        requestOverhead: baseMetrics.performance.responseTime.max - baseMetrics.performance.responseTime.average
                    } as IOpenAIMetrics,
                    generations: [[{ text: extractText(baseResponse.message.content), generationInfo }]],
                    llmOutput
                };
        }
    }

    public async generate(
        instanceId: string,
        input: BaseLanguageModelInput,
        options?: BaseChatModelCallOptions
    ): Promise<LLMResponse> {
        const runId = this.generateRunId('generate');
        const instance = this.instances.get(instanceId);
        const config = this.configs.get(instanceId);

        await this.logInfo(`Starting generation with run ID: ${runId}`, { instanceId, runId });

        if (!instance || !config) {
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
        const result = await instance.model.invoke(messages, options);
        const metrics = await this.createProviderMetrics(instanceId, config);

        const baseResponse: IBaseLLMResponse = {
            provider: instance.provider,
            model: config.model,
            message: result,
            metrics,
            generations: [[{ 
                text: extractText(result.content), 
                generationInfo: {} as Record<string, unknown>
            }]],
            llmOutput: {
                tokenUsage: {
                    promptTokens: 0,
                    completionTokens: 0,
                    totalTokens: 0
                },
                modelOutput: {} as Record<string, unknown>
            }
        };

        return this.createProviderResponse(instance.provider, baseResponse);
    }

    private async createProviderMetrics(
        instanceId: string,
        config: ILLMProviderConfig
    ): Promise<ILLMProviderMetrics> {
        const metricsCollection = await MessageMetricsManager.getInstance().getMetrics(instanceId);
        if (!metricsCollection || 
            !metricsCollection.performance.length || 
            !metricsCollection.usage.length || 
            !metricsCollection.resources.length) {
            await this.handleError(
                new Error(`No metrics found for instance ${instanceId}`),
                'createProviderMetrics',
                ERROR_KINDS.StateError
            );
            throw new Error(`No metrics found for instance ${instanceId}`);
        }

        const now = Date.now();

        // Get the latest metrics from each collection
        const latestMetrics = metricsCollection.performance[metricsCollection.performance.length - 1];
        const latestUsage = metricsCollection.usage[metricsCollection.usage.length - 1];
        const latestResources: ILLMResourceMetrics = {
            component: this.constructor.name,
            category: 'RESOURCE',
            version: '1.0.0',
            timestamp: now,
            cpuUsage: 0,
            memoryUsage: 0,
            diskIO: { read: 0, write: 0 },
            networkUsage: { upload: 0, download: 0 },
            gpuMemoryUsage: 0,
            modelMemoryAllocation: {
                weights: 0,
                cache: 0,
                workspace: 0
            }
        };

        // Update resources if available
        if (metricsCollection.resources.length > 0) {
            const currentResources = metricsCollection.resources[metricsCollection.resources.length - 1];
            Object.assign(latestResources, {
                cpuUsage: currentResources.cpuUsage ?? latestResources.cpuUsage,
                memoryUsage: currentResources.memoryUsage ?? latestResources.memoryUsage,
                diskIO: currentResources.diskIO ?? latestResources.diskIO,
                networkUsage: currentResources.networkUsage ?? latestResources.networkUsage,
                gpuMemoryUsage: currentResources.gpuMemoryUsage ?? latestResources.gpuMemoryUsage,
                modelMemoryAllocation: currentResources.modelMemoryAllocation ?? latestResources.modelMemoryAllocation
            });
        }

        const commonMetrics: IBaseProviderMetrics = {
            component: this.constructor.name,
            category: 'PROVIDER',
            version: '1.0.0',
            provider: config.provider,
            model: config.model,
            latency: latestMetrics.responseTime.average,
            tokenUsage: latestUsage.tokenDistribution || {
                prompt: 0,
                completion: 0,
                total: 0
            },
            cost: {
                promptCost: 0,
                completionCost: 0,
                totalCost: 0,
                currency: 'USD'
            },
            resources: latestResources,
            performance: latestMetrics,
            usage: latestUsage,
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
                    gpuUtilization: latestResources.gpuMemoryUsage / 100
                } as IGroqMetrics;

            case LLM_PROVIDER_enum.ANTHROPIC:
                return {
                    ...commonMetrics,
                    provider: LLM_PROVIDER_enum.ANTHROPIC,
                    model: config.model,
                    contextUtilization: config.contextUtilization || 0,
                    responseQuality: latestMetrics.coherenceScore || 0,
                    modelConfidence: 1 - (latestMetrics.errorMetrics.rate || 0)
                } as IAnthropicMetrics;

            case LLM_PROVIDER_enum.GOOGLE:
                return {
                    ...commonMetrics,
                    provider: LLM_PROVIDER_enum.GOOGLE,
                    model: config.model,
                    safetyRatings: this.createGoogleSafetyRatingsForMetrics(),
                    modelLatency: latestMetrics.responseTime.average,
                    apiOverhead: latestMetrics.responseTime.max - latestMetrics.responseTime.average
                } as IGoogleMetrics;

            case LLM_PROVIDER_enum.MISTRAL:
                return {
                    ...commonMetrics,
                    provider: LLM_PROVIDER_enum.MISTRAL,
                    model: config.model,
                    inferenceTime: latestMetrics.responseTime.average,
                    throughput: latestMetrics.tokensPerSecond || 0,
                    gpuMemoryUsage: latestResources.gpuMemoryUsage
                } as IMistralMetrics;

            case LLM_PROVIDER_enum.OPENAI:
            default:
                // Default to OpenAI metrics for unknown providers
                return {
                    ...commonMetrics,
                    provider: LLM_PROVIDER_enum.OPENAI,
                    model: config.model,
                    promptTokens: latestUsage.tokenDistribution.prompt || 0,
                    completionTokens: latestUsage.tokenDistribution.completion || 0,
                    totalTokens: latestUsage.tokenDistribution.total || 0,
                    requestOverhead: latestMetrics.responseTime.max - latestMetrics.responseTime.average
                } as IOpenAIMetrics;
        }
    }

    public async createInstance(config: ILLMProviderConfig): Promise<string> {
        const instanceId = this.generateInstanceId(config);
        await this.logInfo(`Creating LLM instance: ${instanceId}`, { config });

        try {
            // Create provider-specific enhanced model instance
            let modelInstance;
            try {
                // Extract common config properties
                const { apiKey, temperature = 0.7, maxTokens } = config;
                const metricsManager = MessageMetricsManager.getInstance();

                switch (config.provider) {
                    case LLM_PROVIDER_enum.GROQ:
                        const { ChatGroq } = await import('@langchain/groq');
                        class EnhancedGroqChat extends ChatGroq {
                            private readonly metricsManager: MessageMetricsManager;
                            private readonly instanceId: string;

                            constructor(config: any, instanceId: string, metricsManager: MessageMetricsManager) {
                                super(config);
                                this.metricsManager = metricsManager;
                                this.instanceId = instanceId;
                            }

                            async invoke(messages: any, options?: any) {
                                const startTime = Date.now();
                                const result = await super.invoke(messages, options);
                                const elapsed = Date.now() - startTime;
                                const manager = BaseLLMManager.getInstance();
                                const errorTypeRecord = manager.createErrorTypeRecord();
                                const errorSeverityRecord = manager.createErrorSeverityRecord();

                                await this.metricsManager.collectLLMMetrics(this.instanceId, {
                                    timestamp: startTime,
                                    resources: {
                                        component: this.constructor.name,
                                        category: 'RESOURCE',
                                        version: '1.0.0',
                                        timestamp: startTime,
                                        cpuUsage: 0,
                                        memoryUsage: 0,
                                        diskIO: { read: 0, write: 0 },
                                        networkUsage: { upload: 0, download: 0 },
                                        gpuMemoryUsage: 0,
                                        modelMemoryAllocation: {
                                            weights: 0,
                                            cache: 0,
                                            workspace: 0
                                        }
                                    },
                                    performance: {
                                        component: this.constructor.name,
                                        category: 'PERFORMANCE',
                                        version: '1.0.0',
                                        timestamp: startTime,
                                        responseTime: {
                                            average: elapsed,
                                            max: elapsed,
                                            min: elapsed
                                        },
                                        throughput: {
                                            requestsPerSecond: 1,
                                            bytesPerSecond: 0
                                        },
                                        tokensPerSecond: 0,
                                        coherenceScore: 0,
                                        temperatureImpact: 0,
                                        errorMetrics: {
                                            count: 0,
                                            rate: 0,
                                            lastError: Date.now(),
                                            byType: errorTypeRecord,
                                            bySeverity: errorSeverityRecord,
                                            avgLatencyIncrease: 0,
                                            avgMemoryUsage: 0,
                                            avgCpuUsage: 0,
                                            hourlyErrors: new Array(24).fill(0)
                                        }
                                    },
                                    usage: {
                                        component: this.constructor.name,
                                        category: 'USAGE',
                                        version: '1.0.0',
                                        timestamp: startTime,
                                        totalRequests: 1,
                                        activeInstances: 1,
                                        activeUsers: 1,
                                        requestsPerSecond: 1,
                                        averageResponseSize: 0,
                                        peakMemoryUsage: 0,
                                        uptime: 0,
                                        rateLimit: {
                                            current: 0,
                                            limit: 1000,
                                            remaining: 1000,
                                            resetTime: Date.now() + 3600000
                                        },
                                        tokenDistribution: {
                                            prompt: 0,
                                            completion: 0,
                                            total: 0
                                        },
                                        modelDistribution: {
                                            gpt4: 0,
                                            gpt35: 0,
                                            other: 1
                                        }
                                    }
                                });
                                return result;
                            }
                        }

                        modelInstance = new EnhancedGroqChat({
                            apiKey,
                            temperature,
                            maxTokens,
                            modelName: config.model
                        }, instanceId, metricsManager);
                        break;

                    case LLM_PROVIDER_enum.ANTHROPIC:
                        const { ChatAnthropic } = await import('@langchain/anthropic');
                        class EnhancedAnthropicChat extends ChatAnthropic {
                            private readonly metricsManager: MessageMetricsManager;
                            private readonly instanceId: string;

                            constructor(config: any, instanceId: string, metricsManager: MessageMetricsManager) {
                                super(config);
                                this.metricsManager = metricsManager;
                                this.instanceId = instanceId;
                            }

                            async invoke(messages: any, options?: any) {
                                const startTime = Date.now();
                                const result = await super.invoke(messages, options);
                                const elapsed = Date.now() - startTime;
                                
                                await this.metricsManager.collectLLMMetrics(this.instanceId, {
                                    timestamp: startTime,
                                    resources: {
                                        component: this.constructor.name,
                                        category: 'RESOURCE',
                                        version: '1.0.0',
                                        timestamp: startTime,
                                        cpuUsage: 0,
                                        memoryUsage: 0,
                                        diskIO: { read: 0, write: 0 },
                                        networkUsage: { upload: 0, download: 0 },
                                        gpuMemoryUsage: 0,
                                        modelMemoryAllocation: {
                                            weights: 0,
                                            cache: 0,
                                            workspace: 0
                                        }
                                    },
                                    performance: {
                                        component: this.constructor.name,
                                        category: 'PERFORMANCE',
                                        version: '1.0.0',
                                        timestamp: startTime,
                                        responseTime: {
                                            average: elapsed,
                                            max: elapsed,
                                            min: elapsed
                                        },
                                        throughput: {
                                            requestsPerSecond: 1,
                                            bytesPerSecond: 0
                                        },
                                        tokensPerSecond: 0,
                                        coherenceScore: 0,
                                        temperatureImpact: 0,
                                        errorMetrics: {
                                            count: 0,
                                            rate: 0,
                                            lastError: Date.now(),
                                            byType: BaseLLMManager.getInstance().createErrorTypeRecord(),
                                            bySeverity: BaseLLMManager.getInstance().createErrorSeverityRecord(),
                                            avgLatencyIncrease: 0,
                                            avgMemoryUsage: 0,
                                            avgCpuUsage: 0,
                                            hourlyErrors: new Array(24).fill(0)
                                        }
                                    },
                                    usage: {
                                        component: this.constructor.name,
                                        category: 'USAGE',
                                        version: '1.0.0',
                                        timestamp: startTime,
                                        totalRequests: 1,
                                        activeUsers: 1,
                                        activeInstances: 1,
                                        requestsPerSecond: 1,
                                        averageResponseSize: 0,
                                        peakMemoryUsage: 0,
                                        uptime: 0,
                                        rateLimit: {
                                            current: 0,
                                            limit: 1000,
                                            remaining: 1000,
                                            resetTime: Date.now() + 3600000
                                        },
                                        tokenDistribution: {
                                            prompt: 0,
                                            completion: 0,
                                            total: 0
                                        },
                                        modelDistribution: {
                                            gpt4: 0,
                                            gpt35: 0,
                                            other: 1
                                        }
                                    }
                                });
                                return result;
                            }
                        }

                        modelInstance = new EnhancedAnthropicChat({
                            anthropicApiKey: apiKey,
                            temperature,
                            maxTokens,
                            modelName: config.model
                        }, instanceId, metricsManager);
                        break;

                    case LLM_PROVIDER_enum.GOOGLE:
                        const { ChatGoogleGenerativeAI } = await import('@langchain/google-genai');
                        class EnhancedGoogleChat extends ChatGoogleGenerativeAI {
                            private readonly metricsManager: MessageMetricsManager;
                            private readonly instanceId: string;

                            constructor(config: any, instanceId: string, metricsManager: MessageMetricsManager) {
                                super(config);
                                this.metricsManager = metricsManager;
                                this.instanceId = instanceId;
                            }

                            async invoke(messages: any, options?: any) {
                                const startTime = Date.now();
                                const result = await super.invoke(messages, options);
                                const elapsed = Date.now() - startTime;

                                const manager = BaseLLMManager.getInstance();
                                const errorTypeRecord = manager.createErrorTypeRecord();
                                const errorSeverityRecord = manager.createErrorSeverityRecord();

                                await this.metricsManager.collectLLMMetrics(this.instanceId, {
                                    timestamp: startTime,
                                    resources: {
                                        component: this.constructor.name,
                                        category: 'RESOURCE',
                                        version: '1.0.0',
                                        timestamp: startTime,
                                        cpuUsage: 0,
                                        memoryUsage: 0,
                                        diskIO: { read: 0, write: 0 },
                                        networkUsage: { upload: 0, download: 0 },
                                        gpuMemoryUsage: 0,
                                        modelMemoryAllocation: {
                                            weights: 0,
                                            cache: 0,
                                            workspace: 0
                                        }
                                    },
                                    performance: {
                                        component: this.constructor.name,
                                        category: 'PERFORMANCE',
                                        version: '1.0.0',
                                        timestamp: startTime,
                                        responseTime: {
                                            average: elapsed,
                                            max: elapsed,
                                            min: elapsed
                                        },
                                        throughput: {
                                            requestsPerSecond: 1,
                                            bytesPerSecond: 0
                                        },
                                        tokensPerSecond: 0,
                                        coherenceScore: 0,
                                        temperatureImpact: 0,
                                        errorMetrics: {
                                            count: 0,
                                            rate: 0,
                                            lastError: Date.now(),
                                            byType: errorTypeRecord,
                                            bySeverity: errorSeverityRecord,
                                            avgLatencyIncrease: 0,
                                            avgMemoryUsage: 0,
                                            avgCpuUsage: 0,
                                            hourlyErrors: new Array(24).fill(0)
                                        }
                                    },
                                    usage: {
                                        component: this.constructor.name,
                                        category: 'USAGE',
                                        version: '1.0.0',
                                        timestamp: startTime,
                                        totalRequests: 1,
                                        activeUsers: 1,
                                        activeInstances: 1,
                                        requestsPerSecond: 1,
                                        averageResponseSize: 0,
                                        peakMemoryUsage: 0,
                                        uptime: 0,
                                        rateLimit: {
                                            current: 0,
                                            limit: 1000,
                                            remaining: 1000,
                                            resetTime: Date.now() + 3600000
                                        },
                                        tokenDistribution: {
                                            prompt: 0,
                                            completion: 0,
                                            total: 0
                                        },
                                        modelDistribution: {
                                            gpt4: 0,
                                            gpt35: 0,
                                            other: 1
                                        }
                                    }
                                });
                                return result;
                            }
                        }

                        modelInstance = new EnhancedGoogleChat({
                            apiKey,
                            temperature,
                            maxOutputTokens: maxTokens,
                            modelName: config.model
                        }, instanceId, metricsManager);
                        break;

                    case LLM_PROVIDER_enum.MISTRAL:
                        const { ChatMistralAI } = await import('@langchain/mistralai');
                        class EnhancedMistralChat extends ChatMistralAI {
                            private readonly metricsManager: MessageMetricsManager;
                            private readonly instanceId: string;

                            constructor(config: any, instanceId: string, metricsManager: MessageMetricsManager) {
                                super(config);
                                this.metricsManager = metricsManager;
                                this.instanceId = instanceId;
                            }

                            async invoke(messages: any, options?: any) {
                                const startTime = Date.now();
                                const result = await super.invoke(messages, options);
                                const elapsed = Date.now() - startTime;

                                const manager = BaseLLMManager.getInstance();
                                const errorTypeRecord = manager.createErrorTypeRecord();
                                const errorSeverityRecord = manager.createErrorSeverityRecord();

                                await this.metricsManager.collectLLMMetrics(this.instanceId, {
                                    timestamp: startTime,
                                    resources: {
                                        component: this.constructor.name,
                                        category: 'RESOURCE',
                                        version: '1.0.0',
                                        timestamp: startTime,
                                        cpuUsage: 0,
                                        memoryUsage: 0,
                                        diskIO: { read: 0, write: 0 },
                                        networkUsage: { upload: 0, download: 0 },
                                        gpuMemoryUsage: 0,
                                        modelMemoryAllocation: {
                                            weights: 0,
                                            cache: 0,
                                            workspace: 0
                                        }
                                    },
                                    performance: {
                                        component: this.constructor.name,
                                        category: 'PERFORMANCE',
                                        version: '1.0.0',
                                        timestamp: startTime,
                                        responseTime: {
                                            average: elapsed,
                                            max: elapsed,
                                            min: elapsed
                                        },
                                        throughput: {
                                            requestsPerSecond: 1,
                                            bytesPerSecond: 0
                                        },
                                        tokensPerSecond: 0,
                                        coherenceScore: 0,
                                        temperatureImpact: 0,
                                        errorMetrics: {
                                            count: 0,
                                            rate: 0,
                                            lastError: Date.now(),
                                            byType: errorTypeRecord,
                                            bySeverity: errorSeverityRecord,
                                            avgLatencyIncrease: 0,
                                            avgMemoryUsage: 0,
                                            avgCpuUsage: 0,
                                            hourlyErrors: new Array(24).fill(0)
                                        }
                                    },
                                    usage: {
                                        component: this.constructor.name,
                                        category: 'USAGE',
                                        version: '1.0.0',
                                        timestamp: startTime,
                                        totalRequests: 1,
                                        activeUsers: 1,
                                        activeInstances: 1,
                                        requestsPerSecond: 1,
                                        averageResponseSize: 0,
                                        peakMemoryUsage: 0,
                                        uptime: 0,
                                        rateLimit: {
                                            current: 0,
                                            limit: 1000,
                                            remaining: 1000,
                                            resetTime: Date.now() + 3600000
                                        },
                                        tokenDistribution: {
                                            prompt: 0,
                                            completion: 0,
                                            total: 0
                                        },
                                        modelDistribution: {
                                            gpt4: 0,
                                            gpt35: 0,
                                            other: 1
                                        }
                                    }
                                });
                                return result;
                            }
                        }

                        modelInstance = new EnhancedMistralChat({
                            apiKey,
                            temperature,
                            maxTokens,
                            modelName: config.model
                        }, instanceId, metricsManager);
                        break;

                    case LLM_PROVIDER_enum.OPENAI:
                    default:
                        const { ChatOpenAI } = await import('@langchain/openai');
                        class EnhancedOpenAIChat extends ChatOpenAI {
                            private readonly metricsManager: MessageMetricsManager;
                            private readonly instanceId: string;

                            constructor(config: any, instanceId: string, metricsManager: MessageMetricsManager) {
                                super(config);
                                this.metricsManager = metricsManager;
                                this.instanceId = instanceId;
                            }

                            async invoke(messages: any, options?: any) {
                                const startTime = Date.now();
                                const result = await super.invoke(messages, options);
                                const elapsed = Date.now() - startTime;
                                await this.metricsManager.updatePerformanceMetrics(this.instanceId, {
                                    timestamp: startTime,
                                    responseTime: {
                                        average: elapsed,
                                        max: elapsed,
                                        min: elapsed
                                    },
                                    throughput: {
                                        requestsPerSecond: 1,
                                        bytesPerSecond: 0
                                    },
                                    errorMetrics: {
                                        count: 0,
                                        rate: 0,
                                        lastError: Date.now(),
                                        byType: BaseLLMManager.getInstance().createErrorTypeRecord(),
                                        bySeverity: BaseLLMManager.getInstance().createErrorSeverityRecord(),
                                        avgLatencyIncrease: 0,
                                        avgMemoryUsage: 0,
                                        avgCpuUsage: 0,
                                        hourlyErrors: new Array(24).fill(0)
                                    }
                                });
                                return result;
                            }
                        }

                        modelInstance = new EnhancedOpenAIChat({
                            openAIApiKey: apiKey,
                            temperature,
                            maxTokens,
                            modelName: config.model
                        }, instanceId, metricsManager);
                        break;
                }
            } catch (error) {
                await this.handleError(
                    error,
                    `Failed to initialize chat model for provider ${config.provider}`,
                    ERROR_KINDS.InitializationError
                );
                throw error;
            }

            // Create valid instance
            const instance: ValidInstance = {
                model: modelInstance,
                id: instanceId,
                provider: config.provider as SupportedProvider,
                config,
                metrics: await this.createProviderMetrics(instanceId, config),
                status: LLM_STATUS_enum.READY,
                lastUsed: Date.now(),
                errorCount: 0,

                generate: async (messages, options) => {
                    const manager = BaseLLMManager.getInstance();
                    return manager.generate(instanceId, messages, options);
                },

                async *generateStream(messages, options) {
                    const manager = BaseLLMManager.getInstance();
                    const result = await manager.generate(instanceId, messages, options);
                    const content = extractText(result.message.content);
                    const chunk = new AIMessageChunk({
                        content,
                        additional_kwargs: {},
                    });
                    // Set required properties from AIMessageChunk
                    chunk.lc_namespace = ["langchain_core", "messages"];
                    chunk.lc_serializable = true;
                    yield chunk;
                },

                validateConfig: async (configToValidate) => {
                    const isValid = Boolean(configToValidate.provider && configToValidate.model);
                    return {
                        isValid,
                        errors: isValid ? [] : ['Provider and model are required'],
                        warnings: [],
                        metadata: {
                            provider: configToValidate.provider,
                            model: configToValidate.model,
                            timestamp: Date.now()
                        }
                    };
                },

                cleanup: async () => {
                    const manager = BaseLLMManager.getInstance();
                    await manager.logInfo(`Cleaning up instance ${instanceId}`);
                },

                getMetrics: async () => BaseLLMManager.getInstance().createProviderMetrics(instanceId, config),

                getStatus: async () => instance.status,

                reset: async () => {
                    instance.errorCount = 0;
                    instance.status = LLM_STATUS_enum.READY;
                }
            };

            // Validate config before proceeding
            const validationResult = await instance.validateConfig(config);
            if (!validationResult.isValid) {
                throw new Error(`Invalid config: ${validationResult.errors.join(', ')}`);
            }

            // Store instance and config data
            this.instances.set(instanceId, instance);
            this.configs.set(instanceId, config);
            // Store the model instance with its enhanced metrics capabilities
            this.modelInstances.set(instanceId, modelInstance as unknown as BaseChatModel);

            await this.logInfo(`LLM instance created successfully: ${instanceId}`);
            return instanceId;
        } catch (error) {
            await this.handleError(error, `Failed to create LLM instance: ${instanceId}`, ERROR_KINDS.InitializationError);
            throw error;
        }
    }

    private generateInstanceId(config: ILLMProviderConfig): string {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 15);
        return `${LLM_PROVIDER_enum[config.provider]}_${config.model}_${timestamp}_${random}`;
    }

    private generateRunId(prefix: string = 'run'): string {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 15);
        return `${prefix}_${timestamp}_${random}`;
    }

}

export default BaseLLMManager.getInstance();
