/**
 * @file llmManager.ts
 * @path src/managers/domain/llm/llmManager.ts
 * @description Primary LLM orchestration manager coordinating specialized LLM managers
 */

import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { BaseMessage, AIMessage, AIMessageChunk } from '@langchain/core/messages';
import { ChatResult, ChatGeneration, ChatGenerationChunk } from '@langchain/core/outputs';
import { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';

import { CoreManager } from '../../../managers/core/coreManager';
import { convertToBaseMessages } from '../../../utils/llm/messageConverter';
import { 
    MANAGER_CATEGORY_enum, 
    LLM_STATUS_enum
} from '../../../types/common/enumTypes';
import { ERROR_KINDS } from '../../../types/common/errorTypes';
import { MetricDomain, MetricType } from '../../../types/metrics/base/metricsManagerTypes';

import { MessageManager } from './messageManager';
import { ProviderManager } from './providerManager';
import { OutputManager } from './outputManager';
import { StreamingManager } from './streamingManager';
import { LLMInitializationManager } from './llmInitializationManager';

import type { 
    ILLMProviderConfig,
    ProviderInstance,
    ILLMProviderMetrics
} from '../../../types/llm/llmProviderTypes';
import type { ILLMInstance } from '../../../types/llm/llmInstanceTypes';
import type { IHandlerResult } from '../../../types/common/baseTypes';

/**
 * Primary LLM orchestration manager that coordinates specialized managers
 */
class LLMManager extends CoreManager {
    private static instance: LLMManager;
    private readonly messageManager: MessageManager;
    private readonly providerManager: ProviderManager;
    private readonly outputManager: OutputManager;
    private readonly streamingManager: StreamingManager;
    private readonly initManager: LLMInitializationManager;
    private currentInstance?: ILLMInstance;
    public readonly category = MANAGER_CATEGORY_enum.RESOURCE;

    protected constructor() {
        super();
        this.messageManager = MessageManager.getInstance();
        this.providerManager = ProviderManager.getInstance();
        this.outputManager = OutputManager.getInstance();
        this.streamingManager = StreamingManager.getInstance();
        this.initManager = LLMInitializationManager.getInstance();
        this.registerDomainManager('LLMManager', this);
    }

    public static getInstance(): LLMManager {
        if (!LLMManager.instance) {
            LLMManager.instance = new LLMManager();
        }
        return LLMManager.instance;
    }

    /**
     * Initialize the LLM Manager and required services
     */
    public async initialize(params?: Record<string, unknown>): Promise<void> {
        await super.initialize(params);

        const result = await this.safeExecute(async () => {
            await this.handleStatusTransition({
                entity: 'llm',
                entityId: this.constructor.name,
                currentStatus: LLM_STATUS_enum.INITIALIZING,
                targetStatus: LLM_STATUS_enum.READY,
                context: {
                    component: this.constructor.name,
                    operation: 'initialize',
                    params
                }
            });

            this.logInfo('LLM Manager initialized successfully');
        }, 'Failed to initialize LLM manager');

        if (!result.success) {
            throw result.metadata.error;
        }
    }

    /**
     * Set the provider configuration and initialize an instance
     */
    public async setProvider(config: ILLMProviderConfig): Promise<void> {
        const result = await this.safeExecute(async () => {
            // Validate config
            await this.providerManager.validateProviderConfig(config);

            // Initialize instance
            const instanceResult = await this.initManager.initializeLangchainModel(config);
            if (!instanceResult.success || !instanceResult.data) {
                throw new Error('Failed to initialize LLM instance');
            }

            this.currentInstance = instanceResult.data;

            // Track provider metrics
            await this.metricsManager.trackMetric({
                domain: MetricDomain.LLM,
                type: MetricType.RESOURCE,
                value: 1,
                timestamp: Date.now(),
                metadata: {
                    provider: config.provider,
                    model: config.model,
                    component: this.constructor.name,
                    operation: 'setProvider'
                }
            });

        }, 'Failed to set provider');

        if (!result.success) {
            throw result.metadata.error;
        }
    }

    /**
     * Generate a response using the current instance
     */
    public async _generate(
        messages: BaseMessage[],
        options: BaseChatModel['ParsedCallOptions'],
        runManager?: CallbackManagerForLLMRun
    ): Promise<ChatResult> {
        const result = await this.safeExecute(async () => {
            if (!this.currentInstance) {
                throw new Error('No LLM instance configured');
            }

            const result = await this.currentInstance.generate(messages, options);
            const generation = result.generations[0][0];
            const messageChunk = new AIMessageChunk({
                content: generation.text,
                tool_calls: [],
                additional_kwargs: {}
            });

            const generationChunk = new ChatGenerationChunk({
                text: generation.text,
                message: messageChunk,
                generationInfo: generation.generationInfo ?? {}
            });

            const processedResult = await this.outputManager.processChatGeneration(
                generationChunk,
                generation.text
            );

            if (!processedResult.success) {
                throw new Error('Failed to process generation result');
            }

            const message = new AIMessage(processedResult.data);
            const chatGeneration: ChatGeneration = {
                text: processedResult.data,
                message,
                generationInfo: generation.generationInfo ?? {}
            };

            return {
                generations: [chatGeneration],
                llmOutput: result.llmOutput ?? {}
            } satisfies ChatResult;
        }, 'Failed to generate response');

        if (!result.success || !result.data) {
            throw result.metadata.error;
        }

        return result.data;
    }

    /**
     * Stream responses using the current instance
     */
    public async *_streamResponseChunks(
        messages: BaseMessage[],
        options: BaseChatModel['ParsedCallOptions'],
        runManager?: CallbackManagerForLLMRun
    ): AsyncGenerator<ChatGenerationChunk> {
        if (!this.currentInstance) {
            throw new Error('No LLM instance configured');
        }

        const streamingHandler = this.streamingManager.getCallbackHandler();
        const streamOptions = {
            ...options,
            callbacks: [streamingHandler]
        };

        try {
            const stream = await this.currentInstance.generateStream(messages, streamOptions);
            for await (const chunk of stream) {
                const content = typeof chunk.content === 'string' ? chunk.content : JSON.stringify(chunk.content);
                const messageChunk = new AIMessageChunk({
                    content,
                    tool_calls: [],
                    additional_kwargs: {}
                });

                yield new ChatGenerationChunk({
                    text: content,
                    message: messageChunk,
                    generationInfo: {}
                });
            }
        } catch (error) {
            // Let CoreManager's error handling handle this
            throw error;
        }
    }

    /**
     * Get the identifying string for this LLM type
     */
    _llmType(): string {
        return 'kaiban';
    }

    /**
     * Combine multiple LLM outputs into a single output
     */
    _combineLLMOutput(...llmOutputs: Record<string, unknown>[]): Record<string, unknown> {
        return llmOutputs.reduce((acc, output) => {
            const tokenUsage = output.tokenUsage as Record<string, number> | undefined;
            const accTokenUsage = acc.tokenUsage as Record<string, number> | undefined;
            
            return {
                ...acc,
                ...output,
                tokenUsage: {
                    totalTokens: (accTokenUsage?.totalTokens || 0) + (tokenUsage?.totalTokens || 0),
                    promptTokens: (accTokenUsage?.promptTokens || 0) + (tokenUsage?.promptTokens || 0),
                    completionTokens: (accTokenUsage?.completionTokens || 0) + (tokenUsage?.completionTokens || 0)
                }
            };
        }, {});
    }

    /**
     * Get metrics for the current instance
     */
    public async getMetrics(): Promise<ILLMProviderMetrics> {
        const result = await this.safeExecute(async () => {
            if (!this.currentInstance) {
                throw new Error('No LLM instance configured');
            }
            const metrics = await this.currentInstance.getMetrics();
            if (!metrics) {
                throw new Error('Failed to get metrics');
            }
            return metrics;
        }, 'Failed to get metrics');

        if (!result.success || !result.data) {
            throw result.metadata.error;
        }

        return result.data;
    }

    /**
     * Clean up resources for the current instance
     */
    public async cleanup(): Promise<void> {
        const result = await this.safeExecute(async () => {
            if (this.currentInstance) {
                await this.currentInstance.cleanup();
                this.currentInstance = undefined;
            }
        }, 'Failed to cleanup instance');

        if (!result.success) {
            throw result.metadata.error;
        }
    }
}

// Export singleton instance
const llmManager = LLMManager.getInstance();
export { llmManager as LLMManager };
