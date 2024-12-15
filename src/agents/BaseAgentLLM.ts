/**
 * @file BaseAgentLLM.ts
 * @path src/agents/BaseAgentLLM.ts
 * @description LLM functionality for base agent implementation
 *
 * @module @agents
 */

import { ChatGroq, ChatGroqCallOptions } from '@langchain/groq';
import { ChatOpenAI, ChatOpenAICallOptions } from '@langchain/openai';
import { BaseMessage } from '@langchain/core/messages';
import { AIMessageChunk } from '@langchain/core/messages';
import { BaseLanguageModelInput } from '@langchain/core/language_models/base';
import { BaseChatModelCallOptions } from '@langchain/core/language_models/chat_models';
import { Callbacks } from '@langchain/core/callbacks/manager';
import { LLM_PROVIDER_enum, LLM_STATUS_enum } from '../types/common/commonEnums';
import { 
    LLMProviderTypeGuards,
    type LLMProviderConfig,
    type IGroqConfig,
    type IOpenAIConfig
} from '../types/llm/llmProviderTypes';
import { ILLMInstance, convertToBaseMessages } from '../types/llm/llmInstanceTypes';
import { LLMResponse, IGroqResponse, IOpenAIResponse } from '../types/llm/llmResponseTypes';
import { IMessageHistory } from '../types/llm/message/messagingHistoryTypes';
import { ILLMConfig, IRuntimeLLMConfig, createProviderConfig, isRuntimeConfig } from '../types/llm/llmCommonTypes';
import { createError } from '../types/common/commonErrorTypes';
import { LLMMetricsCollector } from '../metrics/LLMMetricsCollector';

// ─── LLM Agent Base ─────────────────────────────────────────────────────────────

export abstract class BaseAgentLLM {
    public llmInstance: ILLMInstance | null = null;
    public llmConfig: IRuntimeLLMConfig;
    public llmSystemMessage: string | null = null;
    public forceFinalAnswer: boolean = false;
    public messageHistory: IMessageHistory;
    protected readonly metricsCollector: LLMMetricsCollector;

    constructor(
        config: {
            llmConfig: IRuntimeLLMConfig;
            messageHistory: IMessageHistory;
            metricsCollector: LLMMetricsCollector;
        }
    ) {
        this.llmConfig = config.llmConfig;
        this.messageHistory = config.messageHistory;
        this.metricsCollector = config.metricsCollector;
    }

    // ─── LLM Configuration ──────────────────────────────────────────────────────

    protected normalizeLlmConfig(llmConfig: IRuntimeLLMConfig): ILLMConfig {
        if (!isRuntimeConfig(llmConfig)) {
            const runId = `error_${Date.now()}`;
            const error = createError({
                message: 'Invalid runtime LLM configuration structure',
                type: 'ValidationError',
                context: {
                    component: this.constructor.name
                }
            });
            this.metricsCollector.handleLLMError(error, runId);
            throw error;
        }

        return createProviderConfig(llmConfig);
    }

    // ─── LLM Instance Creation ───────────────────────────────────────────────────

    protected createLLMInstance(): void {
        try {
            const normalizedConfig = this.normalizeLlmConfig(this.llmConfig);
            const instanceOptions = {
                ...normalizedConfig,
                callbacks: this.metricsCollector,
                maxConcurrentRequests: 1,
                retry: {
                    maxRetries: 3,
                    backoffFactor: 1.5
                },
                cache: false
            };

            switch (normalizedConfig.provider) {
                case LLM_PROVIDER_enum.GROQ:
                    this.createGroqInstance(normalizedConfig as IGroqConfig, instanceOptions);
                    break;
                case LLM_PROVIDER_enum.OPENAI:
                    this.createOpenAIInstance(normalizedConfig as IOpenAIConfig, instanceOptions);
                    break;
                default:
                    throw createError({
                        message: `Unsupported LLM provider: ${normalizedConfig.provider}`,
                        type: 'ValidationError',
                        context: {
                            component: this.constructor.name,
                            provider: normalizedConfig.provider
                        }
                    });
            }
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Unknown error during LLM instance creation');
            const runId = `error_${Date.now()}`;
            this.metricsCollector.handleLLMError(error, runId);
            throw createError({
                message: `Failed to create LLM instance: ${error.message}`,
                type: 'ValidationError',
                context: {
                    component: this.constructor.name,
                    config: this.llmConfig,
                    error: error
                }
            });
        }
    }

    private createGroqInstance(config: IGroqConfig, options: any): void {
        if (!LLMProviderTypeGuards.isGroqConfig(config)) {
            throw createError({
                message: 'Invalid Groq configuration',
                type: 'ValidationError',
                context: { component: this.constructor.name }
            });
        }

        const model = new ChatGroq(options);
        this.llmInstance = {
            id: 'groq-instance',
            provider: LLM_PROVIDER_enum.GROQ,
            config,
            metrics: {
                resources: {
                    cpuUsage: 0,
                    memoryUsage: 0,
                    diskIO: { read: 0, write: 0 },
                    networkUsage: { upload: 0, download: 0 },
                    timestamp: Date.now()
                },
                performance: {
                    executionTime: { total: 0, average: 0, min: 0, max: 0 },
                    latency: { total: 0, average: 0, min: 0, max: 0 },
                    throughput: { operationsPerSecond: 0, dataProcessedPerSecond: 0 },
                    responseTime: { total: 0, average: 0, min: 0, max: 0 },
                    queueLength: 0,
                    errorRate: 0,
                    successRate: 1,
                    errorMetrics: { totalErrors: 0, errorRate: 0 },
                    resourceUtilization: {
                        cpuUsage: 0,
                        memoryUsage: 0,
                        diskIO: { read: 0, write: 0 },
                        networkUsage: { upload: 0, download: 0 },
                        timestamp: Date.now()
                    },
                    timestamp: Date.now()
                },
                usage: {
                    totalRequests: 0,
                    activeUsers: 0,
                    requestsPerSecond: 0,
                    averageResponseSize: 0,
                    peakMemoryUsage: 0,
                    uptime: 0,
                    rateLimit: {
                        current: 0,
                        limit: 0,
                        remaining: 0,
                        resetTime: 0
                    },
                    timestamp: Date.now()
                },
                timestamp: Date.now()
            },
            status: LLM_STATUS_enum.ACTIVE,
            lastUsed: Date.now(),
            errorCount: 0,
            async generate(
                messages: BaseLanguageModelInput,
                options?: ChatGroqCallOptions
            ): Promise<LLMResponse> {
                const baseMessages = convertToBaseMessages(messages);
                const result = await model.invoke(baseMessages, options);
                const response: IGroqResponse = {
                    provider: LLM_PROVIDER_enum.GROQ,
                    model: config.model,
                    message: result,
                    generations: [[{ text: String(result.content), generationInfo: {} }]],
                    llmOutput: {
                        tokenUsage: {
                            promptTokens: 0,
                            completionTokens: 0,
                            totalTokens: 0
                        },
                        modelOutput: {
                            contextWindow: config.contextWindow || 0,
                            streamingLatency: config.streamingLatency || 0
                        }
                    },
                    metrics: {
                        resources: {
                            cpuUsage: 0,
                            memoryUsage: 0,
                            diskIO: { read: 0, write: 0 },
                            networkUsage: { upload: 0, download: 0 },
                            timestamp: Date.now()
                        },
                        performance: {
                            executionTime: { total: 0, average: 0, min: 0, max: 0 },
                            latency: { total: 0, average: 0, min: 0, max: 0 },
                            throughput: { operationsPerSecond: 0, dataProcessedPerSecond: 0 },
                            responseTime: { total: 0, average: 0, min: 0, max: 0 },
                            queueLength: 0,
                            errorRate: 0,
                            successRate: 1,
                            errorMetrics: { totalErrors: 0, errorRate: 0 },
                            resourceUtilization: {
                                cpuUsage: 0,
                                memoryUsage: 0,
                                diskIO: { read: 0, write: 0 },
                                networkUsage: { upload: 0, download: 0 },
                                timestamp: Date.now()
                            },
                            timestamp: Date.now()
                        },
                        usage: {
                            totalRequests: 0,
                            activeUsers: 0,
                            requestsPerSecond: 0,
                            averageResponseSize: 0,
                            peakMemoryUsage: 0,
                            uptime: 0,
                            rateLimit: {
                                current: 0,
                                limit: 0,
                                remaining: 0,
                                resetTime: 0
                            },
                            timestamp: Date.now()
                        },
                        timestamp: Date.now()
                    },
                    streamingMetrics: {
                        firstTokenLatency: 0,
                        tokensPerSecond: 0,
                        totalStreamingTime: 0
                    }
                };
                return response;
            },
            async *generateStream(
                messages: BaseLanguageModelInput,
                options?: ChatGroqCallOptions
            ): AsyncGenerator<AIMessageChunk> {
                const baseMessages = convertToBaseMessages(messages);
                const stream = await model.stream(baseMessages, options);
                for await (const chunk of stream) {
                    yield chunk;
                }
            },
            async validateConfig(config: LLMProviderConfig) {
                return {
                    isValid: LLMProviderTypeGuards.isGroqConfig(config),
                    errors: [],
                    warnings: [],
                    metadata: {
                        timestamp: Date.now(),
                        component: 'LLMValidation',
                        operation: 'validateConfig',
                        validatedFields: ['provider', 'model', 'config']
                    }
                };
            },
            async cleanup(): Promise<void> {},
            async getMetrics() {
                return this.metrics;
            },
            async getStatus() {
                return LLM_STATUS_enum.ACTIVE;
            },
            async reset(): Promise<void> {}
        };
    }

    private createOpenAIInstance(config: IOpenAIConfig, options: any): void {
        if (!LLMProviderTypeGuards.isOpenAIConfig(config)) {
            throw createError({
                message: 'Invalid OpenAI configuration',
                type: 'ValidationError',
                context: { component: this.constructor.name }
            });
        }

        const model = new ChatOpenAI(options);
        this.llmInstance = {
            id: 'openai-instance',
            provider: LLM_PROVIDER_enum.OPENAI,
            config,
            metrics: {
                resources: {
                    cpuUsage: 0,
                    memoryUsage: 0,
                    diskIO: { read: 0, write: 0 },
                    networkUsage: { upload: 0, download: 0 },
                    timestamp: Date.now()
                },
                performance: {
                    executionTime: { total: 0, average: 0, min: 0, max: 0 },
                    latency: { total: 0, average: 0, min: 0, max: 0 },
                    throughput: { operationsPerSecond: 0, dataProcessedPerSecond: 0 },
                    responseTime: { total: 0, average: 0, min: 0, max: 0 },
                    queueLength: 0,
                    errorRate: 0,
                    successRate: 1,
                    errorMetrics: { totalErrors: 0, errorRate: 0 },
                    resourceUtilization: {
                        cpuUsage: 0,
                        memoryUsage: 0,
                        diskIO: { read: 0, write: 0 },
                        networkUsage: { upload: 0, download: 0 },
                        timestamp: Date.now()
                    },
                    timestamp: Date.now()
                },
                usage: {
                    totalRequests: 0,
                    activeUsers: 0,
                    requestsPerSecond: 0,
                    averageResponseSize: 0,
                    peakMemoryUsage: 0,
                    uptime: 0,
                    rateLimit: {
                        current: 0,
                        limit: 0,
                        remaining: 0,
                        resetTime: 0
                    },
                    timestamp: Date.now()
                },
                timestamp: Date.now()
            },
            status: LLM_STATUS_enum.ACTIVE,
            lastUsed: Date.now(),
            errorCount: 0,
            async generate(
                messages: BaseLanguageModelInput,
                options?: ChatOpenAICallOptions
            ): Promise<LLMResponse> {
                const baseMessages = convertToBaseMessages(messages);
                const result = await model.invoke(baseMessages, options);
                const response: IOpenAIResponse = {
                    provider: LLM_PROVIDER_enum.OPENAI,
                    model: config.model,
                    message: result,
                    generations: [[{ text: String(result.content), generationInfo: {} }]],
                    llmOutput: {
                        tokenUsage: {
                            promptTokens: 0,
                            completionTokens: 0,
                            totalTokens: 0
                        },
                        modelOutput: {
                            completionTokens: 0,
                            promptTokens: 0,
                            totalTokens: 0,
                            finishReason: 'stop'
                        }
                    },
                    metrics: {
                        resources: {
                            cpuUsage: 0,
                            memoryUsage: 0,
                            diskIO: { read: 0, write: 0 },
                            networkUsage: { upload: 0, download: 0 },
                            timestamp: Date.now()
                        },
                        performance: {
                            executionTime: { total: 0, average: 0, min: 0, max: 0 },
                            latency: { total: 0, average: 0, min: 0, max: 0 },
                            throughput: { operationsPerSecond: 0, dataProcessedPerSecond: 0 },
                            responseTime: { total: 0, average: 0, min: 0, max: 0 },
                            queueLength: 0,
                            errorRate: 0,
                            successRate: 1,
                            errorMetrics: { totalErrors: 0, errorRate: 0 },
                            resourceUtilization: {
                                cpuUsage: 0,
                                memoryUsage: 0,
                                diskIO: { read: 0, write: 0 },
                                networkUsage: { upload: 0, download: 0 },
                                timestamp: Date.now()
                            },
                            timestamp: Date.now()
                        },
                        usage: {
                            totalRequests: 0,
                            activeUsers: 0,
                            requestsPerSecond: 0,
                            averageResponseSize: 0,
                            peakMemoryUsage: 0,
                            uptime: 0,
                            rateLimit: {
                                current: 0,
                                limit: 0,
                                remaining: 0,
                                resetTime: 0
                            },
                            timestamp: Date.now()
                        },
                        timestamp: Date.now()
                    },
                    finishReason: 'stop'
                };
                return response;
            },
            async *generateStream(
                messages: BaseLanguageModelInput,
                options?: ChatOpenAICallOptions
            ): AsyncGenerator<AIMessageChunk> {
                const baseMessages = convertToBaseMessages(messages);
                const stream = await model.stream(baseMessages, options);
                for await (const chunk of stream) {
                    yield chunk;
                }
            },
            async validateConfig(config: LLMProviderConfig) {
                return {
                    isValid: LLMProviderTypeGuards.isOpenAIConfig(config),
                    errors: [],
                    warnings: [],
                    metadata: {
                        timestamp: Date.now(),
                        component: 'LLMValidation',
                        operation: 'validateConfig',
                        validatedFields: ['provider', 'model', 'config']
                    }
                };
            },
            async cleanup(): Promise<void> {},
            async getMetrics() {
                return this.metrics;
            },
            async getStatus() {
                return LLM_STATUS_enum.ACTIVE;
            },
            async reset(): Promise<void> {}
        };
    }
}
