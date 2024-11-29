/**
 * @file providerManager.ts
 * @description LLM provider management implementation using service registry pattern
 */

import CoreManager from '../../core/coreManager';
import { ChatGroq } from '@langchain/groq';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatMistralAI } from '@langchain/mistralai';
import { LLM_PROVIDER_enum } from '../../../types/common/commonEnums';
import { createError } from '../../../types/common/commonErrorTypes';
import { MetadataFactory } from '../../../utils/factories/metadataFactory';
import { LLMProviderTypeGuards } from '../../../types/llm/llmProviderTypes';
import { SafetySetting } from '../../../types/llm/googleTypes';

import type { ILLMValidationResult } from '../../../types/llm/llmManagerTypes';
import type { 
    LLMProviderConfig,
    IGroqConfig,
    IOpenAIConfig,
    IAnthropicConfig,
    IGoogleConfig,
    IMistralConfig
} from '../../../types/llm/llmProviderTypes';
import type { IHandlerResult } from '../../../types/common/commonHandlerTypes';

type ProviderInstanceMap = {
    [LLM_PROVIDER_enum.GROQ]: ChatGroq;
    [LLM_PROVIDER_enum.OPENAI]: ChatOpenAI;
    [LLM_PROVIDER_enum.ANTHROPIC]: ChatAnthropic;
    [LLM_PROVIDER_enum.GOOGLE]: ChatGoogleGenerativeAI;
    [LLM_PROVIDER_enum.MISTRAL]: ChatMistralAI;
};

export class ProviderManager extends CoreManager {
    private static instance: ProviderManager;
    private readonly providers: Map<LLM_PROVIDER_enum, ProviderInstanceMap[LLM_PROVIDER_enum]>;
    private readonly configs: Map<string, LLMProviderConfig>;

    private constructor() {
        super();
        this.providers = new Map();
        this.configs = new Map();
        this.registerDomainManager('ProviderManager', this);
        
        // Register dependencies
        if (!this.hasDomainManager('OutputManager')) {
            const OutputManager = require('./outputManager').default;
            this.registerDomainManager('OutputManager', OutputManager);
        }
    }

    public static getInstance(): ProviderManager {
        if (!ProviderManager.instance) {
            ProviderManager.instance = new ProviderManager();
        }
        return ProviderManager.instance;
    }

    // ─── Provider Instance Management ───────────────────────────────────────────

    public async getProviderInstance(config: LLMProviderConfig): Promise<IHandlerResult<ProviderInstanceMap[LLM_PROVIDER_enum]>> {
        return await this.safeExecute(async () => {
            const instanceId = this.generateInstanceId(config);
            
            if (this.providers.has(config.provider)) {
                return this.providers.get(config.provider)!;
            }

            const instance = await this.createProviderInstance(config);
            this.providers.set(config.provider, instance);
            this.configs.set(instanceId, config);

            this.logInfo(`Created new provider instance: ${LLM_PROVIDER_enum[config.provider]}`, null, instanceId);
            return instance;
        }, 'Failed to get provider instance');
    }

    private async createProviderInstance(config: LLMProviderConfig): Promise<ProviderInstanceMap[LLM_PROVIDER_enum]> {
        try {
            if (LLMProviderTypeGuards.isGroqConfig(config)) {
                return this.createGroqInstance(config);
            }
            if (LLMProviderTypeGuards.isOpenAIConfig(config)) {
                return this.createOpenAIInstance(config);
            }
            if (LLMProviderTypeGuards.isAnthropicConfig(config)) {
                return this.createAnthropicInstance(config);
            }
            if (LLMProviderTypeGuards.isGoogleConfig(config)) {
                return this.createGoogleInstance(config);
            }
            if (LLMProviderTypeGuards.isMistralConfig(config)) {
                return this.createMistralInstance(config);
            }

            throw createError({
                message: '❌ Unsupported provider configuration',
                type: 'InitializationError',
                context: { providerType: config.provider }
            });
        } catch (error) {
            throw createError({
                message: '❌ Failed to create provider instance',
                type: 'InitializationError',
                context: { providerType: config.provider },
                cause: error instanceof Error ? error : undefined
            });
        }
    }

    // ─── Provider-Specific Instance Creation ───────────────────────────────────

    private createGroqInstance(config: IGroqConfig): ChatGroq {
        return new ChatGroq({
            apiKey: config.apiKey,
            modelName: config.model,
            streaming: config.streaming,
            maxRetries: config.maxRetries,
            temperature: config.temperature,
            maxTokens: config.maxTokens,
            stopSequences: config.stop
        });
    }

    private createOpenAIInstance(config: IOpenAIConfig): ChatOpenAI {
        return new ChatOpenAI({
            apiKey: config.apiKey,
            modelName: config.model,
            streaming: config.streaming,
            maxRetries: config.maxRetries,
            temperature: config.temperature,
            maxTokens: config.maxTokens,
            presencePenalty: config.presencePenalty,
            frequencyPenalty: config.frequencyPenalty
        });
    }

    private createAnthropicInstance(config: IAnthropicConfig): ChatAnthropic {
        return new ChatAnthropic({
            apiKey: config.apiKey,
            modelName: config.model,
            streaming: config.streaming,
            maxRetries: config.maxRetries,
            temperature: config.temperature,
            maxTokens: config.maxTokens
        });
    }

    private createGoogleInstance(config: IGoogleConfig): ChatGoogleGenerativeAI {
        return new ChatGoogleGenerativeAI({
            apiKey: config.apiKey,
            modelName: config.model,
            streaming: config.streaming,
            maxRetries: config.maxRetries,
            temperature: config.temperature,
            maxOutputTokens: config.maxTokens,
            safetySettings: config.safetySettings as SafetySetting[]
        });
    }

    private createMistralInstance(config: IMistralConfig): ChatMistralAI {
        return new ChatMistralAI({
            apiKey: config.apiKey,
            modelName: config.model,
            streaming: config.streaming,
            maxRetries: config.maxRetries,
            temperature: config.temperature,
            maxTokens: config.maxTokens,
            safeMode: config.inferenceOptions?.useGpu
        });
    }

    // ─── Utility Methods ────────────────────────────────────────────────────────

    private generateInstanceId(config: LLMProviderConfig): string {
        return `${LLM_PROVIDER_enum[config.provider]}_${config.model}_${Date.now()}`;
    }

    public getProviderConfig(instanceId: string): LLMProviderConfig | undefined {
        return this.configs.get(instanceId);
    }

    public hasProvider(provider: LLM_PROVIDER_enum): boolean {
        return this.providers.has(provider);
    }

    public clearProviders(): void {
        this.providers.clear();
        this.configs.clear();
        this.logInfo('Cleared all provider instances');
    }

    // ─── Validation Methods ────────────────────────────────────────────────────

    public validateConfig(config: LLMProviderConfig): ILLMValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Common validation
        if (!config.apiKey) {
            errors.push('❌ API key is required');
        }

        if (!config.model) {
            errors.push('❌ Model is required');
        }

        if (config.temperature && (config.temperature < 0 || config.temperature > 1)) {
            errors.push('❌ Temperature must be between 0 and 1');
        }

        if (config.maxTokens && config.maxTokens < 1) {
            errors.push('❌ Max tokens must be greater than 0');
        }

        if (config.maxRetries === undefined) {
            warnings.push('⚠️ No max retries specified, using default value');
        }

        // Provider-specific validation using type guards
        if (LLMProviderTypeGuards.isGroqConfig(config)) {
            this.validateGroqConfig(config, errors, warnings);
        } else if (LLMProviderTypeGuards.isOpenAIConfig(config)) {
            this.validateOpenAIConfig(config, errors, warnings);
        } else if (LLMProviderTypeGuards.isAnthropicConfig(config)) {
            this.validateAnthropicConfig(config, errors, warnings);
        } else if (LLMProviderTypeGuards.isGoogleConfig(config)) {
            this.validateGoogleConfig(config, errors, warnings);
        } else if (LLMProviderTypeGuards.isMistralConfig(config)) {
            this.validateMistralConfig(config, errors, warnings);
        } else {
            errors.push('❌ Unsupported provider configuration');
        }

        const metadata = MetadataFactory.createValidationMetadata({
            component: 'ProviderManager',
            operation: 'validateConfig',
            validatedFields: ['apiKey', 'model', 'temperature', 'maxTokens'],
            timestamp: Date.now()
        });

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            metadata
        };
    }

    private validateGroqConfig(config: IGroqConfig, errors: string[], warnings: string[]): void {
        if (config.streamingLatency !== undefined && config.streamingLatency < 0) {
            errors.push('❌ Streaming latency must be non-negative');
        }
        if (config.streamingLatency === undefined) {
            warnings.push('⚠️ No streaming latency specified, using default value');
        }
        if (config.contextWindow && config.contextWindow > 32768) {
            warnings.push('⚠️ Large context window may impact performance');
        }
    }

    private validateOpenAIConfig(config: IOpenAIConfig, errors: string[], warnings: string[]): void {
        if (config.presencePenalty !== undefined && (config.presencePenalty < -2 || config.presencePenalty > 2)) {
            errors.push('❌ Presence penalty must be between -2 and 2');
        }
        if (config.frequencyPenalty !== undefined && (config.frequencyPenalty < -2 || config.frequencyPenalty > 2)) {
            errors.push('❌ Frequency penalty must be between -2 and 2');
        }
        if (!config.organization) {
            warnings.push('⚠️ No organization ID specified, using default organization');
        }
        if (config.temperature && config.temperature > 0.8) {
            warnings.push('⚠️ High temperature may lead to less focused responses');
        }
    }

    private validateAnthropicConfig(config: IAnthropicConfig, errors: string[], warnings: string[]): void {
        if (config.contextUtilization !== undefined && (config.contextUtilization < 0 || config.contextUtilization > 1)) {
            errors.push('❌ Context utilization must be between 0 and 1');
        }
        if (!config.anthropicApiUrl) {
            warnings.push('⚠️ Using default API URL, consider specifying for better control');
        }
        if (config.maxTokens && config.maxTokens > 4096) {
            warnings.push('⚠️ Large token limit may increase latency and costs');
        }
    }

    private validateGoogleConfig(config: IGoogleConfig, errors: string[], warnings: string[]): void {
        if (!config.safetySettings || config.safetySettings.length === 0) {
            warnings.push('⚠️ No safety settings specified, using default safety settings');
        } else {
            config.safetySettings.forEach((setting, index) => {
                if (!Object.values(SafetySetting).includes(setting)) {
                    errors.push(`❌ Invalid safety setting at index ${index}`);
                }
            });
        }
        if (!config.baseUrl) {
            warnings.push('⚠️ Using default API endpoint, consider specifying for better control');
        }
    }

    private validateMistralConfig(config: IMistralConfig, errors: string[], warnings: string[]): void {
        if (config.inferenceOptions?.numThreads !== undefined && config.inferenceOptions.numThreads < 1) {
            errors.push('❌ Number of threads must be greater than 0');
        }
        if (!config.inferenceOptions) {
            warnings.push('⚠️ No inference options specified, using default settings');
        }
        if (config.inferenceOptions?.useGpu === undefined) {
            warnings.push('⚠️ GPU usage preference not specified, defaulting to CPU');
        }
        if (!config.endpoint) {
            warnings.push('⚠️ Using default API endpoint, consider specifying for better control');
        }
    }
}

export default ProviderManager.getInstance();
