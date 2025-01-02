/**
 * @file BaseAgentLLM.ts
 * @path src/agents/BaseAgentLLM.ts
 * @description LLM functionality for base agent implementation
 */

import { CoreManager } from '../managers/core/coreManager';
import { MetricsManager } from '../managers/core/metricsManager';
import { MessageMetricsManager } from '../managers/domain/llm/messageMetricsManager';
import { createError } from '../types/common/errorTypes';
import { LLM_PROVIDER_enum, MANAGER_CATEGORY_enum } from '../types/common/enumTypes';
import { type IRuntimeLLMConfig, isRuntimeConfig } from '../types/llm/llmCommonTypes';
import { type ILLMInstance } from '../types/llm/llmInstanceTypes';
import { type IMessageHistory } from '../types/llm/message/messagingBaseTypes';
import { 
    type ILLMProviderConfig,
    type IGroqConfig,
    type IOpenAIConfig,
    type IAnthropicConfig,
    type IGoogleConfig,
    type IMistralConfig,
    type IProviderManager,
    type IGroqCallOptions,
    type IOpenAICallOptions,
    type IAnthropicCallOptions,
    type IGoogleCallOptions,
    type IMistralCallOptions,
    ILLMProviderTypeGuards
} from '../types/llm/llmProviderTypes';

/**
 * Abstract class representing the base LLM agent.
 */
export abstract class BaseAgentLLM extends CoreManager {
    public readonly category = MANAGER_CATEGORY_enum.RESOURCE;
    public llmInstance: ILLMInstance | null = null;
    public llmConfig: IRuntimeLLMConfig;
    public llmSystemMessage: string | null = null;
    public forceFinalAnswer: boolean = false;
    public messageHistory: IMessageHistory;
    protected readonly metricsManager: MetricsManager;
    protected readonly messageMetricsManager: MessageMetricsManager;
    protected readonly providerManager: IProviderManager;

    constructor(
        config: {
            llmConfig: IRuntimeLLMConfig;
            messageHistory: IMessageHistory;
        }
    ) {
        super();
        this.llmConfig = config.llmConfig;
        this.messageHistory = config.messageHistory;
        this.metricsManager = MetricsManager.getInstance();
        this.messageMetricsManager = MessageMetricsManager.getInstance();
        this.providerManager = this.getDomainManager<IProviderManager>('ProviderManager');
    }

    // ─── Abstract Methods ────────────────────────────────────────────────────────

    protected abstract createGroqInstance(config: IGroqConfig, options: IGroqCallOptions): void;
    protected abstract createOpenAIInstance(config: IOpenAIConfig, options: IOpenAICallOptions): void;
    protected abstract createAnthropicInstance(config: IAnthropicConfig, options: IAnthropicCallOptions): void;
    protected abstract createGoogleInstance(config: IGoogleConfig, options: IGoogleCallOptions): void;
    protected abstract createMistralInstance(config: IMistralConfig, options: IMistralCallOptions): void;

    // ─── LLM Configuration ──────────────────────────────────────────────────────

    /**
     * Normalizes the LLM configuration.
     * @param llmConfig The runtime LLM configuration.
     * @returns The normalized provider configuration.
     */
    protected normalizeLlmConfig(llmConfig: IRuntimeLLMConfig): ILLMProviderConfig {
        if (!isRuntimeConfig(llmConfig)) {
            const error = createError({
                message: 'Invalid runtime LLM configuration structure',
                type: 'ValidationError',
                context: { component: this.constructor.name }
            });
            this.handleError(error, 'normalizeLlmConfig');
            throw error;
        }

        const config = this.providerManager.normalizeConfig(llmConfig);

        // Validate the normalized config using the same pattern as isRuntimeConfig
        if (
            !config ||
            typeof config !== 'object' ||
            !('provider' in config) ||
            !('model' in config) ||
            typeof config.provider !== 'string' ||
            typeof config.model !== 'string' ||
            !Object.values(LLM_PROVIDER_enum).includes(config.provider as LLM_PROVIDER_enum)
        ) {
            throw createError({
                message: 'Invalid provider configuration',
                type: 'ValidationError',
                context: { component: this.constructor.name }
            });
        }

        // At this point TypeScript knows this is a valid provider config
        return config as ILLMProviderConfig;
    }

    // ─── LLM Instance Creation ───────────────────────────────────────────────────

    /**
     * Creates the LLM instance based on the provider.
     */
    protected createLLMInstance(): void {
        try {
            const config = this.normalizeLlmConfig(this.llmConfig);
            const baseCallOptions = {
                callbacks: undefined,
                signal: undefined,
                timeout: config.timeout,
                tool_choice: undefined,
                functions: undefined
            };

            if (ILLMProviderTypeGuards.isGroqConfig(config)) {
                this.createGroqInstance(config, baseCallOptions as IGroqCallOptions);
            } else if (ILLMProviderTypeGuards.isOpenAIConfig(config)) {
                this.createOpenAIInstance(config, baseCallOptions as IOpenAICallOptions);
            } else if (ILLMProviderTypeGuards.isAnthropicConfig(config)) {
                this.createAnthropicInstance(config, baseCallOptions as IAnthropicCallOptions);
            } else if (ILLMProviderTypeGuards.isGoogleConfig(config)) {
                this.createGoogleInstance(config, {
                    ...baseCallOptions,
                    safetySettings: config.safetySettings
                } as IGoogleCallOptions);
            } else if (ILLMProviderTypeGuards.isMistralConfig(config)) {
                this.createMistralInstance(config, {
                    ...baseCallOptions,
                    safeMode: false
                } as IMistralCallOptions);
            } else {
                throw createError({
                    message: 'Unsupported LLM provider',
                    type: 'ValidationError',
                    context: { component: this.constructor.name }
                });
            }
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Unknown error during LLM instance creation');
            this.handleError(error, 'createLLMInstance');
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
}
