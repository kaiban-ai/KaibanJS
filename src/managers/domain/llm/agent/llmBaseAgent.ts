/**
 * @file llmBaseAgent.ts
 * @path src/managers/domain/llm/agent/llmBaseAgent.ts
 * @description Base LLM agent implementation using Langchain's message handling
 */

import { BaseChatModel, BaseChatModelCallOptions } from '@langchain/core/language_models/chat_models';
import { BaseMessage, AIMessage, AIMessageChunk } from '@langchain/core/messages';
import { ChatResult, ChatGenerationChunk } from '@langchain/core/outputs';
import { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';
import { LLM_PROVIDER_enum, LLM_STATUS_enum } from '../../../../types/common/commonEnums';
import { 
    LLMProviderTypeGuards,
    type LLMProviderConfig,
    type LLMProviderMetrics,
    createProviderConfig
} from '../../../../types/llm/llmProviderTypes';
import { IMessageHistory } from '../../../../types/llm/message/messagingHistoryTypes';
import { IRuntimeLLMConfig, isRuntimeConfig } from '../../../../types/llm/llmCommonTypes';
import { createError } from '../../../../types/common/commonErrorTypes';
import { LLMMetricsCollector } from '../../../../metrics/LLMMetricsCollector';
import { IBaseValidationResult } from '../../../../types/common/commonBaseTypes';
import { createBaseMetadata } from '../../../../types/common/commonMetadataTypes';
import { IProviderAdapter, providerAdapterFactory } from './providers/providerAdapter';

/**
 * Base LLM agent implementation
 * Extends Langchain's BaseChatModel for core functionality
 */
export abstract class LLMBaseAgent extends BaseChatModel {
    protected readonly metricsCollector: LLMMetricsCollector;
    protected readonly messageHistory: IMessageHistory;
    protected readonly runtimeConfig: IRuntimeLLMConfig;
    protected readonly providerAdapter: IProviderAdapter;
    protected status: LLM_STATUS_enum = LLM_STATUS_enum.INITIALIZING;
    protected lastUsed: number = Date.now();
    protected errorCount: number = 0;

    constructor(
        config: {
            llmConfig: IRuntimeLLMConfig;
            messageHistory: IMessageHistory;
            metricsCollector: LLMMetricsCollector;
        }
    ) {
        super({});
        this.runtimeConfig = config.llmConfig;
        this.messageHistory = config.messageHistory;
        this.metricsCollector = config.metricsCollector;

        const providerConfig = this.normalizeLlmConfig(config.llmConfig);
        this.providerAdapter = providerAdapterFactory.createAdapter(providerConfig);
    }

    // ─── Required Abstract Methods ──────────────────────────────────────────────

    /**
     * Get the identifying string for this LLM type
     */
    _llmType(): string {
        return `${this.runtimeConfig.provider.toLowerCase()}-agent`;
    }

    /**
     * Get provider-specific metrics
     */
    async getMetrics(): Promise<LLMProviderMetrics> {
        return this.providerAdapter.getMetrics();
    }

    /**
     * Validate provider-specific configuration
     */
    async validateConfig(config: LLMProviderConfig): Promise<IBaseValidationResult> {
        return this.providerAdapter.validateConfig(config);
    }

    // ─── Base Implementation ─────────────────────────────────────────────────────

    /**
     * Core method for generating responses
     */
    public async _generate(
        messages: BaseMessage[],
        options: this["ParsedCallOptions"],
        runManager?: CallbackManagerForLLMRun
    ): Promise<ChatResult> {
        try {
            const response = await this.providerAdapter.call(messages, options, runManager);
            const message = new AIMessage(response);
            return {
                generations: [{
                    message,
                    text: typeof message.content === 'string' ? message.content : JSON.stringify(message.content),
                    generationInfo: {}
                }]
            };
        } catch (error) {
            this.errorCount += 1;
            this.status = LLM_STATUS_enum.ERROR;
            throw error;
        }
    }

    /**
     * Core method for streaming responses
     */
    public async *_streamResponseChunks(
        messages: BaseMessage[],
        options: this["ParsedCallOptions"],
        runManager?: CallbackManagerForLLMRun
    ): AsyncGenerator<ChatGenerationChunk> {
        try {
            const stream = await this.providerAdapter.streamCall(messages, options, runManager);
            for await (const chunk of stream) {
                const text = typeof chunk.content === 'string' ? chunk.content : JSON.stringify(chunk.content);
                const generationChunk: ChatGenerationChunk = {
                    message: chunk,
                    text,
                    generationInfo: {},
                    concat: (other: ChatGenerationChunk): ChatGenerationChunk => ({
                        message: chunk,
                        text: text + other.text,
                        generationInfo: { ...other.generationInfo },
                        concat: (next: ChatGenerationChunk): ChatGenerationChunk => generationChunk.concat(next)
                    })
                };
                yield generationChunk;
            }
        } catch (error) {
            this.errorCount += 1;
            this.status = LLM_STATUS_enum.ERROR;
            throw error;
        }
    }

    // ─── Protected Helper Methods ─────────────────────────────────────────────────

    /**
     * Normalize runtime configuration
     */
    protected normalizeLlmConfig(llmConfig: IRuntimeLLMConfig): LLMProviderConfig {
        if (!isRuntimeConfig(llmConfig)) {
            throw createError({
                message: 'Invalid runtime LLM configuration structure',
                type: 'ValidationError',
                context: {
                    component: this.constructor.name
                }
            });
        }

        try {
            return createProviderConfig(llmConfig);
        } catch (error) {
            throw createError({
                message: 'Failed to create provider configuration',
                type: 'ValidationError',
                context: {
                    component: this.constructor.name,
                    provider: llmConfig.provider,
                    model: llmConfig.model,
                    error
                }
            });
        }
    }

    // ─── Public Methods ───────────────────────────────────────────────────────────

    /**
     * Get current agent status
     */
    public async getStatus(): Promise<LLM_STATUS_enum> {
        return this.status;
    }

    /**
     * Reset agent state
     */
    public async reset(): Promise<void> {
        this.errorCount = 0;
        this.lastUsed = Date.now();
        this.status = LLM_STATUS_enum.READY;
    }

    /**
     * Clean up resources
     */
    public async cleanup(): Promise<void> {
        this.status = LLM_STATUS_enum.TERMINATED;
        this.metricsCollector.trackMetrics('cleanup', {
            component: this.constructor.name,
            timestamp: Date.now(),
            metadata: createBaseMetadata(this.constructor.name, 'cleanup')
        });
    }
}
