/**
 * @file llmManager.ts
 * @path src/managers/domain/llm/llmManager.ts
 * @description Primary LLM domain manager implementing provider-specific functionality
 */

import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { BaseMessage, AIMessage, AIMessageChunk } from '@langchain/core/messages';
import { LLMResult, Generation } from '@langchain/core/outputs';
import { ChatGroq } from '@langchain/groq';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatMistralAI } from '@langchain/mistralai';

import CoreManager from '../../core/coreManager';
import { LLM_PROVIDER_enum } from '../../../types/common/commonEnums';
import { EnumTypeGuards } from '../../../types/common/commonEnums';
import { convertToBaseMessage } from '../../../utils/llm/messageUtils';

import type { 
    ILLMManager,
    ILLMInstance,
    ILLMRequest,
    IHandlerResult,
    IValidationResult
} from '../../../types/llm/llmManagerTypes';

import type {
    LLMProviderConfig,
    IBaseProviderMetrics,
    LLMProviderTypeGuards
} from '../../../types/llm/llmProviderTypes';

import type {
    IBaseLLMResponse,
    LLMResponse,
    LLMResponseTypeGuards,
    LLMResponseValidation
} from '../../../types/llm/llmResponseTypes';

/**
 * Primary Domain Manager for LLM functionality
 * Implements ILLMManager interface and extends CoreManager
 */
export class LLMManager extends CoreManager implements ILLMManager {
    private static instance: LLMManager;
    private readonly instances: Map<string, BaseChatModel>;
    private readonly metrics: Map<string, IBaseProviderMetrics>;

    private constructor() {
        super();
        this.instances = new Map();
        this.metrics = new Map();
    }

    public static getInstance(): LLMManager {
        if (!LLMManager.instance) {
            LLMManager.instance = new LLMManager();
        }
        return LLMManager.instance;
    }

    /**
     * Create new LLM instance with Langchain integration
     */
    public async createInstance(config: LLMProviderConfig): Promise<IHandlerResult<ILLMInstance>> {
        return await this.safeExecute(async () => {
            const model = await this.createProviderInstance(config);
            const instanceId = `${config.provider}-${config.model}-${Date.now()}`;
            
            this.instances.set(instanceId, model);
            this.metrics.set(instanceId, this.createDefaultMetrics(config));

            return {
                id: instanceId,
                provider: config.provider,
                config,
                metrics: this.metrics.get(instanceId)!,
                status: 'active',
                lastUsed: Date.now(),
                errorCount: 0,

                generate: async (messages, options, callbacks) => {
                    const baseMessages = messages.flat().map(convertToBaseMessage);
                    const result = await model.invoke(baseMessages, { callbacks });
                    const llmResult = this.createLLMResult(result);
                    return this.formatProviderResponse(llmResult, config, instanceId);
                },

                generateStream: async function*(messages, options, callbacks) {
                    const baseMessages = messages.flat().map(convertToBaseMessage);
                    const stream = await model.stream(baseMessages, { callbacks });
                    for await (const chunk of stream) {
                        yield chunk;
                    }
                },

                validateConfig: async (config) => {
                    return await this.validateConfig(config);
                },

                cleanup: async () => {
                    await this.terminateInstance(instanceId);
                },

                getMetrics: async () => {
                    return this.metrics.get(instanceId)!;
                },

                getStatus: async () => {
                    return 'active';
                },

                reset: async () => {
                    // Reset instance state if needed
                }
            };
        }, 'Failed to create LLM instance');
    }

    /**
     * Get an existing LLM instance
     */
    public async getInstance(instanceId: string): Promise<IHandlerResult<ILLMInstance>> {
        return await this.safeExecute(async () => {
            const model = this.instances.get(instanceId);
            if (!model) {
                throw new Error(`No LLM instance found for ID: ${instanceId}`);
            }

            const metrics = this.metrics.get(instanceId)!;
            const config = model.invocationParams() as LLMProviderConfig;

            return {
                id: instanceId,
                provider: metrics.provider,
                config,
                metrics,
                status: 'active',
                lastUsed: Date.now(),
                errorCount: 0,
                generate: async (messages, options, callbacks) => {
                    const baseMessages = messages.flat().map(convertToBaseMessage);
                    const result = await model.invoke(baseMessages, { callbacks });
                    const llmResult = this.createLLMResult(result);
                    return this.formatProviderResponse(llmResult, config, instanceId);
                },
                generateStream: async function*(messages, options, callbacks) {
                    const baseMessages = messages.flat().map(convertToBaseMessage);
                    const stream = await model.stream(baseMessages, { callbacks });
                    for await (const chunk of stream) {
                        yield chunk;
                    }
                },
                validateConfig: this.validateConfig.bind(this),
                cleanup: async () => {
                    await this.terminateInstance(instanceId);
                },
                getMetrics: async () => metrics,
                getStatus: async () => 'active',
                reset: async () => {}
            };
        }, 'Failed to get LLM instance');
    }

    /**
     * Send a request to an LLM instance
     */
    public async sendRequest(request: ILLMRequest): Promise<IHandlerResult<LLMResponse>> {
        return await this.safeExecute(async () => {
            const instanceResult = await this.getInstance(request.instanceId);
            if (!instanceResult.success || !instanceResult.data) {
                throw new Error(`Invalid instance result for ID: ${request.instanceId}`);
            }
            return await instanceResult.data.generate(request.messages, request.options, request.callbacks);
        }, 'Failed to send LLM request');
    }

    /**
     * Validate an LLM configuration
     */
    public async validateConfig(config: LLMProviderConfig): Promise<IValidationResult> {
        if (!EnumTypeGuards.isLLMProvider(config.provider)) {
            return {
                isValid: false,
                errors: ['Invalid provider'],
                warnings: []
            };
        }

        if (!EnumTypeGuards.isValidModelForProvider(config.model, config.provider)) {
            return {
                isValid: false,
                errors: [`Invalid model for provider ${config.provider}`],
                warnings: []
            };
        }

        return {
            isValid: true,
            errors: [],
            warnings: []
        };
    }

    /**
     * Get metrics for an LLM instance
     */
    public async getMetrics(instanceId: string): Promise<IHandlerResult<IBaseProviderMetrics>> {
        return await this.safeExecute(async () => {
            const metrics = this.metrics.get(instanceId);
            if (!metrics) {
                throw new Error(`No metrics found for instance ID: ${instanceId}`);
            }
            return metrics;
        }, 'Failed to get LLM metrics');
    }

    /**
     * Terminate an LLM instance
     */
    public async terminateInstance(instanceId: string): Promise<IHandlerResult<void>> {
        return await this.safeExecute(async () => {
            this.instances.delete(instanceId);
            this.metrics.delete(instanceId);
        }, 'Failed to terminate LLM instance');
    }

    /**
     * Initialize LLM manager
     */
    public async initialize(): Promise<void> {
        this.logManager.info('LLMManager initialized');
    }

    /**
     * Clean up all resources
     */
    public async cleanup(): Promise<void> {
        await this.safeExecute(async () => {
            this.instances.clear();
            this.metrics.clear();
            this.logManager.info('LLMManager cleaned up');
        }, 'LLM cleanup failed');
    }

    // ─── Private Helper Methods ──────────────────────────────────────────────────

    /**
     * Create provider-specific instance using Langchain
     */
    private async createProviderInstance(config: LLMProviderConfig): Promise<BaseChatModel> {
        const baseConfig = {
            modelName: config.model,
            temperature: config.temperature,
            maxTokens: config.maxTokens,
            topP: config.topP,
            apiKey: config.apiKey,
            maxRetries: config.maxRetries
        };

        const provider = config.provider as LLM_PROVIDER_enum;
        switch (provider) {
            case LLM_PROVIDER_enum.GROQ:
                return new ChatGroq(baseConfig);
            case LLM_PROVIDER_enum.OPENAI:
                return new ChatOpenAI(baseConfig);
            case LLM_PROVIDER_enum.ANTHROPIC:
                return new ChatAnthropic(baseConfig) as unknown as BaseChatModel;
            case LLM_PROVIDER_enum.GOOGLE:
                return new ChatGoogleGenerativeAI(baseConfig) as unknown as BaseChatModel;
            case LLM_PROVIDER_enum.MISTRAL:
                return new ChatMistralAI(baseConfig) as unknown as BaseChatModel;
            default:
                throw new Error(`Unsupported provider: ${config.provider}`);
        }
    }

    /**
     * Create LLMResult from AIMessage
     */
    private createLLMResult(message: AIMessage | AIMessageChunk): LLMResult {
        const generation: Generation = {
            text: message.content as string,
            generationInfo: {
                ...message.additional_kwargs
            }
        };
        return {
            generations: [[generation]],
            llmOutput: {
                tokenUsage: {
                    promptTokens: 0,
                    completionTokens: 0,
                    totalTokens: 0
                }
            }
        };
    }

    /**
     * Format provider-specific response
     */
    private formatProviderResponse(result: LLMResult, config: LLMProviderConfig, instanceId: string): LLMResponse {
        const metrics = this.metrics.get(instanceId)!;
        const baseResponse: IBaseLLMResponse = {
            ...result,
            provider: config.provider,
            model: config.model,
            metrics: {
                resource: metrics.resource,
                performance: metrics.performance,
                usage: metrics.usage,
                timestamp: metrics.timestamp
            },
            message: new AIMessage(result.generations[0][0].text)
        };

        const provider = config.provider as LLM_PROVIDER_enum;
        switch (provider) {
            case LLM_PROVIDER_enum.GROQ:
                return {
                    ...baseResponse,
                    provider: LLM_PROVIDER_enum.GROQ,
                    streamingMetrics: {
                        firstTokenLatency: result.llmOutput?.firstTokenLatency || 0,
                        tokensPerSecond: result.llmOutput?.tokensPerSecond || 0,
                        totalStreamingTime: result.llmOutput?.totalStreamingTime || 0
                    }
                };

            case LLM_PROVIDER_enum.OPENAI:
                return {
                    ...baseResponse,
                    provider: LLM_PROVIDER_enum.OPENAI,
                    finishReason: result.generations[0][0].generationInfo?.finishReason || null,
                    systemFingerprint: result.llmOutput?.systemFingerprint
                };

            case LLM_PROVIDER_enum.ANTHROPIC:
                return {
                    ...baseResponse,
                    provider: LLM_PROVIDER_enum.ANTHROPIC,
                    stopReason: result.generations[0][0].generationInfo?.stopReason || 'end_turn',
                    modelVersion: result.llmOutput?.modelVersion || config.model
                };

            case LLM_PROVIDER_enum.GOOGLE:
                return {
                    ...baseResponse,
                    provider: LLM_PROVIDER_enum.GOOGLE,
                    safetyRatings: result.llmOutput?.safetyRatings || []
                };

            case LLM_PROVIDER_enum.MISTRAL:
                return {
                    ...baseResponse,
                    provider: LLM_PROVIDER_enum.MISTRAL,
                    responseQuality: {
                        coherence: result.llmOutput?.quality?.coherence || 1,
                        relevance: result.llmOutput?.quality?.relevance || 1,
                        toxicity: result.llmOutput?.quality?.toxicity || 0
                    }
                };

            default:
                throw new Error(`Unsupported provider: ${config.provider}`);
        }
    }

    /**
     * Create default metrics
     */
    private createDefaultMetrics(config: LLMProviderConfig): IBaseProviderMetrics {
        const now = Date.now();
        const resourceMetrics = {
            cpuUsage: 0,
            memoryUsage: process.memoryUsage().heapUsed,
            diskIO: { read: 0, write: 0 },
            networkUsage: { upload: 0, download: 0 },
            timestamp: now
        };

        const performance = {
            executionTime: {
                total: 0,
                average: 0,
                min: 0,
                max: 0
            },
            latency: {
                total: 0,
                average: 0,
                min: 0,
                max: 0
            },
            throughput: {
                operationsPerSecond: 0,
                dataProcessedPerSecond: 0
            },
            responseTime: {
                total: 0,
                average: 0,
                min: 0,
                max: 0
            },
            queueLength: 0,
            errorRate: 0,
            successRate: 1,
            errorMetrics: {
                totalErrors: 0,
                errorRate: 0
            },
            resourceUtilization: resourceMetrics,
            timestamp: now
        };

        const usage = {
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
                resetTime: now
            },
            timestamp: now
        };

        return {
            provider: config.provider,
            model: config.model,
            latency: 0,
            tokenUsage: {
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
            resource: resourceMetrics,
            resources: resourceMetrics,
            performance,
            usage,
            timestamp: now
        };
    }
}

export default LLMManager.getInstance();
