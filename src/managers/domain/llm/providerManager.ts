/**
 * @file providerManager.ts
 * @path src/utils/managers/domain/llm/providerManager.ts
 * @description LLM provider management implementation using service registry pattern
 *
 * @module @managers/domain/llm
 */

import CoreManager from '../../core/coreManager';
import { ChatGroq } from '@langchain/groq';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatMistralAI } from '@langchain/mistralai';

import type {
    LLMConfig,
    LLMProvider,
    LLMRuntimeOptions,
    ActiveLLMConfig
} from '@/utils/types/llm/common';

import type {
    GroqConfig,
    OpenAIConfig,
    AnthropicConfig,
    GoogleConfig,
    MistralConfig
} from '@/utils/types/llm/providers';

import type {
    LLMResponse,
    StreamingChunk,
    TokenUsage
} from '@/utils/types/llm/responses';

export class ProviderManager extends CoreManager {
    private static instance: ProviderManager;
    private readonly providers: Map<LLMProvider, any>;
    private readonly configs: Map<string, LLMConfig>;

    private constructor() {
        super();
        this.providers = new Map();
        this.configs = new Map();
        this.registerDomainManager('ProviderManager', this);
    }

    public static getInstance(): ProviderManager {
        if (!ProviderManager.instance) {
            ProviderManager.instance = new ProviderManager();
        }
        return ProviderManager.instance;
    }

    // ─── Provider Instance Management ───────────────────────────────────────────

    public async getProviderInstance(config: LLMConfig): Promise<any> {
        return await this.safeExecute(async () => {
            const provider = config.provider;
            
            if (this.providers.has(provider)) {
                return this.providers.get(provider);
            }

            const instance = await this.createProviderInstance(config);
            this.providers.set(provider, instance);
            this.configs.set(this.generateInstanceId(config), config);

            return instance;
        }, 'Failed to get provider instance');
    }

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

    // ─── Provider Instance Creation ────────────────────────────────────────────

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

    // ─── Configuration Management ─────────────────────────────────────────────

    public async validateProviderConfig(config: LLMConfig): Promise<void> {
        return await this.safeExecute(async () => {
            if (config.provider === 'none') return;

            const requiredFields: Partial<Record<LLMProvider, (keyof ActiveLLMConfig)[]>> = {
                groq: ['model', 'apiKey'],
                openai: ['model', 'apiKey'],
                anthropic: ['model', 'apiKey'],
                google: ['model', 'apiKey'],
                mistral: ['model', 'apiKey']
            };

            const required = requiredFields[config.provider];
            if (required) {
                const missingFields = required.filter(field => !(field in config));
                if (missingFields.length > 0) {
                    throw new Error(
                        `Missing required fields for ${config.provider}: ${missingFields.join(', ')}`
                    );
                }
            }

            // Validate token limits
            await this.validateTokenLimits(config);
        }, 'Configuration validation failed');
    }

    private async validateTokenLimits(config: LLMConfig): Promise<void> {
        const maxTokens = {
            groq: 8192,
            openai: 8192,
            anthropic: 100000,
            google: 32768,
            mistral: 32768
        }[config.provider];

        const configuredMax = this.getConfiguredMaxTokens(config);
        if (configuredMax && configuredMax > maxTokens) {
            throw new Error(
                `Token limit ${configuredMax} exceeds maximum of ${maxTokens} for ${config.provider}`
            );
        }
    }

    private getConfiguredMaxTokens(config: LLMConfig): number | undefined {
        if ('maxTokens' in config) return config.maxTokens;
        if ('maxOutputTokens' in config) return config.maxOutputTokens;
        if ('maxTokensToSample' in config) return config.maxTokensToSample;
        return undefined;
    }

    // ─── Provider Operations ──────────────────────────────────────────────────

    public async generateResponse(
        provider: LLMProvider,
        input: string,
        options?: LLMRuntimeOptions
    ): Promise<LLMResponse> {
        return await this.safeExecute(async () => {
            const instance = this.providers.get(provider);
            if (!instance) {
                throw new Error(`Provider not found: ${provider}`);
            }

            const result = await instance.generate([input], options);
            return {
                content: result.generations[0].text,
                rawOutput: result,
                usage: this.extractTokenUsage(result),
                metadata: {
                    model: instance.configuration.model,
                    provider: provider,
                    timestamp: Date.now(),
                    latency: 0,
                    requestId: result.id,
                    finishReason: result.generations[0].finishReason
                }
            };
        }, 'Response generation failed');
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
            this.handleError(error as Error, 'Stream generation failed');
            throw error;
        }
    }

    // ─── Utility Methods ────────────────────────────────────────────────────

    private generateInstanceId(config: LLMConfig): string {
        return `${config.provider}-${config.model}-${Date.now()}`;
    }

    private extractTokenUsage(result: any): TokenUsage {
        return {
            promptTokens: result.usage?.prompt_tokens || 0,
            completionTokens: result.usage?.completion_tokens || 0,
            totalTokens: result.usage?.total_tokens || 0
        };
    }

    public async cleanup(): Promise<void> {
        await this.safeExecute(async () => {
            this.providers.clear();
            this.configs.clear();
        }, 'Provider cleanup failed');
    }
}

export default ProviderManager.getInstance();