/**
 * @file LLMManager.ts
 * @path src/managers/domain/llm/LLMManager.ts
 * @description Core LLM operations management and provider orchestration
 *
 * @module @managers/domain/llm
 */

import CoreManager from '../../core/CoreManager';
import { ErrorManager } from '../../core/ErrorManager';
import { LogManager } from '../../core/LogManager';
import { StreamingManager } from './StreamingManager';

// Import LangChain chat models
import { ChatGroq } from '@langchain/groq';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatMistralAI } from '@langchain/mistralai';

// Import types from canonical locations
import type { 
    LLMInstance, 
    LLMInstanceFactory 
} from '@/utils/types/llm/instance';

import type { 
    LLMConfig,
    LLMProvider,
    LLMRuntimeOptions,
    BaseLLMConfig,
    ActiveLLMConfig
} from '@/utils/types/llm/common';

import type {
    StreamingChunk,
    StreamingHandlerConfig
} from '@/utils/types/llm';

import type {
    GroqConfig,
    OpenAIConfig,
    AnthropicConfig,
    GoogleConfig,
    MistralConfig
} from '@/utils/types/llm/providers';

import type { LLMResponse } from '@/utils/types/llm/responses';

/**
 * Core LLM operations manager
 */
export class LLMManager extends CoreManager implements LLMInstanceFactory {
    private static instance: LLMManager;
    protected readonly errorManager: ErrorManager;
    protected readonly logManager: LogManager;
    private readonly streamingManager: StreamingManager;
    private readonly instances: Map<string, LLMInstance>;
    private readonly configs: Map<string, LLMConfig>;

    private constructor() {
        super();
        this.errorManager = ErrorManager.getInstance();
        this.logManager = LogManager.getInstance();
        this.streamingManager = StreamingManager.getInstance();
        this.instances = new Map();
        this.configs = new Map();
    }

    /**
     * Get singleton instance
     */
    public static getInstance(): LLMManager {
        if (!LLMManager.instance) {
            LLMManager.instance = new LLMManager();
        }
        return LLMManager.instance;
    }

    /**
     * Create LLM instance
     */
    public async createInstance(config: LLMConfig): Promise<LLMInstance> {
        try {
            const instanceId = this.generateInstanceId(config);

            // Check if the instance already exists to avoid redundant creation
            if (this.instances.has(instanceId)) {
                return this.instances.get(instanceId)!;
            }

            // Create the instance based on the specified provider
            const instance = await this.createInstanceByProvider(config);
            
            // Wrap the provider-specific instance with common LLM interface
            const wrappedInstance = this.wrapInstance(instance, config);
            
            // Cache the instance and its configuration for future use
            this.instances.set(instanceId, wrappedInstance);
            this.configs.set(instanceId, config);

            // Log the instance creation with the new format
            this.logManager.info(
                `LLM instance created - Provider: ${config.provider}, Model: ${config.model}, InstanceId: ${instanceId}`,
                'LLMManager',
                instanceId
            );

            // Return the fully configured LLM instance
            return wrappedInstance;

        } catch (error) {
            // Handle any errors with consistent error management and logging
            throw await this.errorManager.handleError({
                error: error instanceof Error ? error : new Error(String(error)),
                context: {
                    provider: config.provider,
                    model: config.model,
                    component: 'LLMManager'
                }
            });
        }
    }

    /**
     * Create provider-specific instance
     */
    private async createInstanceByProvider(config: LLMConfig): Promise<any> {
        switch (config.provider) {
            case 'groq':
                return this.createGroqInstance(config as GroqConfig);
            case 'openai':
                return this.createOpenAIInstance(config as OpenAIConfig);
            case 'anthropic':
                return this.createAnthropicInstance(config as AnthropicConfig);
            case 'google':
                return this.createGoogleInstance(config as GoogleConfig);
            case 'mistral':
                return this.createMistralInstance(config as MistralConfig);
            default:
                throw new Error(`Unsupported LLM provider: ${config.provider}`);
        }
    }

    /**
     * Create provider-specific instances
     */
    private createGroqInstance(config: GroqConfig): ChatGroq {
        return new ChatGroq({
            apiKey: config.apiKey,
            modelName: config.model,
            temperature: config.temperature,
            streaming: config.streaming,
            maxTokens: config.maxTokens,
            stopSequences: config.stop
        });
    }

    private createOpenAIInstance(config: OpenAIConfig): ChatOpenAI {
        return new ChatOpenAI({
            openAIApiKey: config.apiKey,
            modelName: config.model,
            temperature: config.temperature,
            streaming: config.streaming,
            maxTokens: config.maxTokens,
            frequencyPenalty: config.frequencyPenalty,
            presencePenalty: config.presencePenalty,
            topP: config.topP,
            stop: config.stop,
            organization: config.organization
        });
    }

    private createAnthropicInstance(config: AnthropicConfig): ChatAnthropic {
        return new ChatAnthropic({
            anthropicApiKey: config.apiKey,
            modelName: config.model,
            temperature: config.temperature,
            maxTokensToSample: config.maxTokensToSample,
            stopSequences: config.stopSequences,
            streaming: config.streaming,
            topK: config.topK,
            topP: config.topP
        });
    }

    private createGoogleInstance(config: GoogleConfig): ChatGoogleGenerativeAI {
        return new ChatGoogleGenerativeAI({
            apiKey: config.apiKey,
            modelName: config.model,
            maxOutputTokens: config.maxOutputTokens,
            temperature: config.temperature,
            topP: config.topP,
            topK: config.topK,
            streaming: config.streaming,
            safetySettings: config.safetySettings
        });
    }

    private createMistralInstance(config: MistralConfig): ChatMistralAI {
        return new ChatMistralAI({
            apiKey: config.apiKey,
            modelName: config.model,
            temperature: config.temperature,
            maxTokens: config.maxTokens,
            topP: config.topP,
            safeMode: config.safeMode,
            streaming: config.streaming
        });
    }

    /**
     * Wrap provider instance with common interface
     */
    private wrapInstance(instance: any, config: LLMConfig): LLMInstance {
        const instanceId = this.generateInstanceId(config);

        return {
            generate: async (input: string, options?: LLMRuntimeOptions): Promise<LLMResponse> => {
                try {
                    if (config.streaming) {
                        await this.streamingManager.initializeStream(instanceId, {
                            content: input,
                            metadata: options?.metadata
                        });
                    }

                    const response = await instance.generate([input], options);

                    if (config.streaming) {
                        await this.streamingManager.completeStream(instanceId);
                    }

                    return response;

                } catch (error) {
                    if (config.streaming) {
                        await this.streamingManager.abortStream(instanceId);
                    }
                    throw error;
                }
            },

            generateStream: async function* (input: string, options?: LLMRuntimeOptions): AsyncIterator<StreamingChunk> {
                if (!config.streaming) {
                    throw new Error('Streaming not enabled for this instance');
                }

                try {
                    await this.streamingManager.initializeStream(instanceId, {
                        content: input,
                        metadata: options?.metadata
                    });

                    for await (const chunk of instance.stream(input, options)) {
                        await this.streamingManager.processChunk(instanceId, chunk);
                        yield chunk;
                    }

                    await this.streamingManager.completeStream(instanceId);

                } catch (error) {
                    await this.streamingManager.abortStream(instanceId);
                    throw error;
                }
            },

            validateConfig: async (): Promise<void> => {
                await instance.validateEnvironment?.();
            },

            cleanup: async (): Promise<void> => {
                if (instance.cleanup) {
                    await instance.cleanup();
                }
                this.instances.delete(instanceId);
                this.configs.delete(instanceId);
            },

            getConfig: (): LLMConfig => config,

            updateConfig: (updates: Partial<LLMConfig>): void => {
                Object.assign(config, updates);
                if (instance.updateConfiguration) {
                    instance.updateConfiguration(updates);
                }
            },

            getProvider: (): LLMProvider => config.provider
        };
    }

    /**
     * Validate manager configuration
     */
    public async validateConfig(): Promise<void> {
        // Validate provider configurations
        for (const [instanceId, config] of this.configs.entries()) {
            try {
                const instance = this.instances.get(instanceId);
                if (instance) {
                    await instance.validateConfig();
                }
            } catch (error) {
                this.logManager.error(`Configuration validation failed for instance ${instanceId}`, {
                    error,
                    component: 'LLMManager'
                });
            }
        }
    }

    /**
     * Initialize manager
     */
    public async initialize(): Promise<void> {
        await this.streamingManager.initialize();
        this.logManager.info('LLMManager initialized', 'LLMManager', 'N/A');
    }

    /**
     * Cleanup resources
     */
    public async cleanup(): Promise<void> {
        // Cleanup all instances
        for (const instance of this.instances.values()) {
            await instance.cleanup();
        }

        this.instances.clear();
        this.configs.clear();

        await this.streamingManager.cleanup();

        this.logManager.info('LLMManager cleaned up', 'LLMManager', 'N/A');
    }

    // ─── Private Helper Methods ───────────────────────────────────────────────

    /**
     * Generate unique instance ID
     */
    private generateInstanceId(config: LLMConfig): string {
        return `${config.provider}-${config.model}-${Date.now()}`;
    }
}

export default LLMManager.getInstance();
