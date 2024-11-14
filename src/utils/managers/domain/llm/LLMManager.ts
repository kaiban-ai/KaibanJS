/**
 * @file LLMManager.ts
 * @path KaibanJS/src/managers/domain/llm/LLMManager.ts
 * @description LLM instance creation and management implementation
 */

// Core utilities
import { CoreManager } from '@/managers/core/CoreManager';

// Import LangChain chat models
import { ChatGroq } from '@langchain/groq';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatMistralAI } from '@langchain/mistralai';

// Import types from canonical locations
import type { LLMInstance, LLMInstanceFactory } from '@/utils/types/llm/common';
import type { LLMConfig } from '@/utils/types/llm/common';
import type { ModelParams } from '@/utils/types/llm/common';
import type {
    GroqConfig,
    OpenAIConfig,
    AnthropicConfig,
    GoogleConfig,
    MistralConfig
} from '@/utils/types/llm/providers';

// ─── LLM Manager Implementation ─────────────────────────────────────────────────

export class LLMManager extends CoreManager implements LLMInstanceFactory {
    private static instance: LLMManager;

    private constructor() {
        super();
    }

    public static getInstance(): LLMManager {
        if (!LLMManager.instance) {
            LLMManager.instance = new LLMManager();
        }
        return LLMManager.instance;
    }

    // ─── Instance Creation ──────────────────────────────────────────────────────

    public createInstance(config: LLMConfig): LLMInstance {
        try {
            const instance = this.createInstanceByProvider(config);
            return this.wrapInstance(instance, config);
        } catch (error) {
            this.handleError(
                error instanceof Error ? error : new Error(String(error)),
                JSON.stringify({ provider: config.provider })
            );
            throw error;
        }
    }

    // ─── Provider-Specific Instance Creation ─────────────────────────────────────

    private createInstanceByProvider(config: LLMConfig): any {
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
                this.handleError(
                    new Error(`Unsupported LLM provider: ${config.provider}`),
                    JSON.stringify({ provider: config.provider })
                );
                throw new Error(`Unsupported LLM provider: ${config.provider}`);
        }
    }

    // ─── Provider-Specific Implementations ───────────────────────────────────────

    private createGroqInstance(config: GroqConfig) {
        return new ChatGroq({
            apiKey: config.apiKey,
            modelName: config.model,
            temperature: config.temperature,
            streaming: config.streaming,
            maxTokens: config.maxTokens,
            stopSequences: config.stop
        });
    }

    private createOpenAIInstance(config: OpenAIConfig) {
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

    private createAnthropicInstance(config: AnthropicConfig) {
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

    private createGoogleInstance(config: GoogleConfig) {
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

    private createMistralInstance(config: MistralConfig) {
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

    // ─── Instance Wrapper ──────────────────────────────────────────────────────

    private wrapInstance(instance: any, config: LLMConfig): LLMInstance {
        return {
            generate: async (input: string, options?: any) => {
                try {
                    return await instance.generate([input], options);
                } catch (error) {
                    this.handleError(
                        error instanceof Error ? error : new Error(String(error)),
                        JSON.stringify({ input, provider: config.provider })
                    );
                    throw error;
                }
            },

            generateStream: async function* (input: string, options?: any) {
                try {
                    for await (const chunk of instance.stream(input, options)) {
                        yield chunk;
                    }
                } catch (error) {
                    this.handleError(
                        error instanceof Error ? error : new Error(String(error)),
                        JSON.stringify({ input, provider: config.provider })
                    );
                    throw error;
                }
            },

            validateConfig: async () => {
                try {
                    await instance.validateEnvironment();
                } catch (error) {
                    this.handleError(
                        error instanceof Error ? error : new Error(String(error)),
                        JSON.stringify({ provider: config.provider })
                    );
                    throw error;
                }
            },

            cleanup: async () => {
                try {
                    if (instance.cleanup) {
                        await instance.cleanup();
                    }
                } catch (error) {
                    this.log('Error during LLM instance cleanup: ' + error, 'warn');
                }
            },

            getConfig: () => config,

            updateConfig: (updates: Partial<LLMConfig>) => {
                Object.assign(config, updates);
                if (instance.updateConfiguration) {
                    instance.updateConfiguration(updates);
                }
            },

            getProvider: () => config.provider
        };
    }
}

export default LLMManager.getInstance();