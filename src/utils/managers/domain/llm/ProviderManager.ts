/**
 * @file ProviderManager.ts
 * @path src/managers/domain/llm/ProviderManager.ts
 * @description LLM Provider management and configuration
 */

import { CoreManager } from '../../core/CoreManager';
import { configUtils } from '@/utils/helpers/config';
import { validateProviderConfig } from '@/utils/types/llm/providers';

// Import types from canonical locations
import type { 
    GroqConfig,
    OpenAIConfig,
    AnthropicConfig,
    GoogleConfig,
    MistralConfig,
    ChatFormat
} from '@/utils/types/llm/providers';

import type {
    LLMProvider,
    LLMConfig,
    LLMRuntimeOptions,
    BaseLLMConfig
} from '@/utils/types/llm/common';

import type {
    LLMResponse,
    StreamingChunk,
    TokenUsage
} from '@/utils/types/llm/responses';

// Provider-specific Chat Models
import { ChatGroq } from '@langchain/groq';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatMistralAI } from '@langchain/mistralai';

// ─── Provider Manager Implementation ───────────────────────────────────────────

export class ProviderManager extends CoreManager {
    private static instance: ProviderManager;
    private providers: Map<LLMProvider, any>;

    private constructor() {
        super();
        this.providers = new Map();
    }

    public static getInstance(): ProviderManager {
        if (!ProviderManager.instance) {
            ProviderManager.instance = new ProviderManager();
        }
        return ProviderManager.instance;
    }

    // ─── Provider Instance Management ────────────────────────────────────────────

    public async getProviderInstance(config: LLMConfig): Promise<any> {
        const provider = config.provider;
        
        if (this.providers.has(provider)) {
            return this.providers.get(provider);
        }

        const instance = await this.createProviderInstance(config);
        this.providers.set(provider, instance);
        return instance;
    }

    public async validateProviderConfig(config: LLMConfig): Promise<void> {
        validateProviderConfig(config);
        configUtils.validateApiKey(config);
        configUtils.validateTemperature(config.temperature);
        configUtils.validateStreaming(config.streaming, config.provider);
    }

    public async cleanupProvider(provider: LLMProvider): Promise<void> {
        const instance = this.providers.get(provider);
        if (instance?.cleanup) {
            await instance.cleanup();
        }
        this.providers.delete(provider);
    }

    // ─── Provider Creation ──────────────────────────────────────────────────────

    private async createProviderInstance(config: LLMConfig): Promise<any> {
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
                throw new Error(`Unsupported provider: ${config.provider}`);
        }
    }

    private createGroqInstance(config: GroqConfig): ChatGroq {
        return new ChatGroq({
            apiKey: config.apiKey,
            modelName: config.model,
            temperature: config.temperature,
            streaming: config.streaming,
            maxTokens: config.maxTokens,
            stopSequences: config.stop,
            ...config
        });
    }

    private createOpenAIInstance(config: OpenAIConfig): ChatOpenAI {
        return new ChatOpenAI({
            openAIApiKey: config.apiKey,
            modelName: config.model,
            temperature: config.temperature,
            streaming: config.streaming,
            maxTokens: config.maxTokens,
            presencePenalty: config.presencePenalty,
            frequencyPenalty: config.frequencyPenalty,
            topP: config.topP,
            n: config.n,
            stop: config.stop,
            organization: config.organization,
            ...config
        });
    }

    private createAnthropicInstance(config: AnthropicConfig): ChatAnthropic {
        return new ChatAnthropic({
            anthropicApiKey: config.apiKey,
            modelName: config.model,
            temperature: config.temperature,
            maxTokensToSample: config.maxTokensToSample,
            stopSequences: config.stopSequences,
            topK: config.topK,
            topP: config.topP,
            streaming: config.streaming,
            ...config
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
            safetySettings: config.safetySettings,
            ...config
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
            streaming: config.streaming,
            ...config
        });
    }

    // ─── Provider Configuration ───────────────────────────────────────────────────

    public getProviderConfig(provider: LLMProvider): BaseLLMConfig {
        const instance = this.providers.get(provider);
        if (!instance) {
            throw new Error(`No configuration found for provider: ${provider}`);
        }
        return instance.configuration;
    }

    public async updateProviderConfig(
        provider: LLMProvider, 
        config: Partial<LLMConfig>
    ): Promise<void> {
        const instance = this.providers.get(provider);
        if (!instance) {
            throw new Error(`Provider not found: ${provider}`);
        }

        // Update instance configuration
        if (instance.updateConfiguration) {
            await instance.updateConfiguration(config);
        }

        // Re-validate the updated configuration
        await this.validateProviderConfig({
            ...instance.configuration,
            ...config
        });
    }

    // ─── Runtime Operations ─────────────────────────────────────────────────────

    public async generateResponse(
        provider: LLMProvider,
        input: string,
        options?: LLMRuntimeOptions
    ): Promise<LLMResponse> {
        const instance = this.providers.get(provider);
        if (!instance) {
            throw new Error(`Provider not found: ${provider}`);
        }

        try {
            const result = await instance.generate([input], options);
            return {
                content: result.generations[0].text,
                rawOutput: result,
                usage: this.extractTokenUsage(result),
                metadata: {
                    model: instance.configuration.model,
                    provider: provider,
                    timestamp: Date.now(),
                    latency: 0, // Will be calculated by LLMManager
                    requestId: result.id,
                    finishReason: result.generations[0].finishReason
                }
            };
        } catch (error) {
            this.handleError(error as Error);
            throw error;
        }
    }

    public async *generateStream(
        provider: LLMProvider,
        input: string,
        options?: LLMRuntimeOptions
    ): AsyncIterator<StreamingChunk> {
        const instance = this.providers.get(provider);
        if (!instance) {
            throw new Error(`Provider not found: ${provider}`);
        }

        if (!instance.configuration.streaming) {
            throw new Error('Streaming not enabled for this provider');
        }

        try {
            for await (const chunk of instance.stream(input, options)) {
                yield {
                    content: chunk.text,
                    metadata: {
                        timestamp: Date.now()
                    },
                    done: false
                };
            }
            
            yield {
                content: '',
                metadata: {
                    timestamp: Date.now()
                },
                done: true
            };
        } catch (error) {
            this.handleError(error as Error);
            throw error;
        }
    }

    // ─── Private Utility Methods ──────────────────────────────────────────────────

    private extractTokenUsage(result: any): TokenUsage {
        return {
            promptTokens: result.usage?.prompt_tokens || 0,
            completionTokens: result.usage?.completion_tokens || 0,
            totalTokens: result.usage?.total_tokens || 0
        };
    }
}

export default ProviderManager.getInstance();