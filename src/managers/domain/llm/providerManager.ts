/**
 * @file providerManager.ts
 * @description LLM provider management implementation using Langchain integration
 */

import { CoreManager } from '../../core/coreManager';
import { ChatGroq } from '@langchain/groq';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatMistralAI } from '@langchain/mistralai';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import { 
    LLM_PROVIDER_enum,
    VALIDATION_ERROR_enum,
    VALIDATION_WARNING_enum,
    MANAGER_CATEGORY_enum
} from '../../../types/common/enumTypes';
import { createError } from '../../../types/common/errorTypes';
import { MetadataFactory } from '../../../utils/factories/metadataFactory';
import { ILLMProviderTypeGuards } from '../../../types/llm/llmProviderTypes';
import { HarmBlockThreshold, HarmCategory } from '../../../types/llm/googleTypes';
import { LLMMetricsCollector } from '../../../metrics/LLMMetricsCollector';

import type { ILLMValidationResult } from '../../../types/llm/llmManagerTypes';
import type { 
    ILLMProviderConfig,
    IGroqConfig,
    IOpenAIConfig,
    IAnthropicConfig,
    IGoogleConfig,
    IMistralConfig,
    ILLMProviderMetrics,
    IGroqMetrics,
    IOpenAIMetrics,
    IAnthropicMetrics,
    IGoogleMetrics,
    IMistralMetrics,
    SafetySetting,
    IProviderManager
} from '../../../types/llm/llmProviderTypes';
import type { IHandlerResult } from '../../../types/common/baseTypes';
import type { ILLMMetrics } from '../../../types/llm/llmMetricTypes';
import type { IBaseManagerMetadata } from '../../../types/agent/agentManagerTypes';

type ProviderMap = {
    [LLM_PROVIDER_enum.GROQ]: ChatGroq;
    [LLM_PROVIDER_enum.OPENAI]: ChatOpenAI;
    [LLM_PROVIDER_enum.ANTHROPIC]: ChatAnthropic;
    [LLM_PROVIDER_enum.GOOGLE]: ChatGoogleGenerativeAI;
    [LLM_PROVIDER_enum.MISTRAL]: ChatMistralAI;
};

type ProviderInstance = ProviderMap[keyof ProviderMap];

interface ProviderState {
    instance: ProviderInstance;
    config: ILLMProviderConfig;
    metricsCollector: LLMMetricsCollector;
    lastUsed: number;
    isActive: boolean;
    retryCount: number;
    status: 'idle' | 'busy' | 'error' | 'rate_limited';
}

interface ProviderErrorContext {
    providerType: LLM_PROVIDER_enum;
    [key: string]: unknown;
}

export class ProviderManager extends CoreManager implements IProviderManager {
    private static instance: ProviderManager;
    private readonly providers: Map<string, ProviderState>;
    private readonly stateCleanupInterval: NodeJS.Timeout;
    private readonly maxRetries: number = 3;
    private readonly stateCleanupTime: number = 30 * 60 * 1000; // 30 minutes

    public readonly category = MANAGER_CATEGORY_enum.RESOURCE;

    private constructor() {
        super();
        this.providers = new Map();
        this.registerDomainManager('ProviderManager', this);
        
        // Register dependencies
        if (!this.hasDomainManager('OutputManager')) {
            const OutputManager = require('./outputManager').default;
            this.registerDomainManager('OutputManager', OutputManager);
        }

        // Initialize state cleanup interval
        this.stateCleanupInterval = setInterval(() => {
            this.cleanupInactiveProviders();
        }, 5 * 60 * 1000); // Run every 5 minutes
    }

    public static getInstance(): ProviderManager {
        if (!ProviderManager.instance) {
            ProviderManager.instance = new ProviderManager();
        }
        return ProviderManager.instance;
    }

    // ─── IBaseManager Implementation ───────────────────────────────────────────

    public async validate(params: unknown): Promise<boolean> {
        if (typeof params !== 'object' || !params) {
            return false;
        }
        
        const config = params as ILLMProviderConfig;
        const validationResult = await this.validateConfig(config);
        return validationResult.isValid;
    }

    public getMetadata(): IBaseManagerMetadata {
        return {
            category: this.category,
            operation: 'base',
            duration: 0,
            status: 'success',
            agent: {
                id: '',
                name: '',
                role: '',
                status: ''
            },
            timestamp: Date.now(),
            component: this.constructor.name
        };
    }

    // ─── Provider Instance Management ───────────────────────────────────────────

    public async getProviderInstance<T extends ILLMProviderConfig>(
        config: T
    ): Promise<IHandlerResult<ProviderInstance>> {
        return await this.safeExecute(async () => {
            const instanceId = this.generateInstanceId(config);
            
            const existingState = this.providers.get(instanceId);
            if (existingState && existingState.isActive) {
                existingState.lastUsed = Date.now();
                return existingState.instance;
            }

            const metricsCollector = new LLMMetricsCollector();
            const callbacks = [metricsCollector];
            
            const instance = await this.createProviderInstance(config, callbacks);
            
            const providerState: ProviderState = {
                instance,
                config,
                metricsCollector,
                lastUsed: Date.now(),
                isActive: true,
                retryCount: 0,
                status: 'idle'
            };

            this.providers.set(instanceId, providerState);

            this.logInfo(`Created new provider instance: ${LLM_PROVIDER_enum[config.provider]}`, { instanceId });
            return instance;
        }, 'Failed to get provider instance');
    }

    private async createProviderInstance(
        config: ILLMProviderConfig, 
        callbacks: BaseCallbackHandler[]
    ): Promise<ProviderInstance> {
        try {
            const instance = await this.createProviderByType(config, callbacks);
            await this.validateProviderInstance(instance);
            return instance;
        } catch (error) {
            const context: ProviderErrorContext = {
                providerType: config.provider
            };
            throw createError({
                message: '❌ Failed to create provider instance',
                type: 'InitializationError',
                context,
                cause: error instanceof Error ? error : undefined
            });
        }
    }

    private async createProviderByType(
        config: ILLMProviderConfig,
        callbacks: BaseCallbackHandler[]
    ): Promise<ProviderInstance> {
        const context: ProviderErrorContext = {
            providerType: config.provider
        };

        if (ILLMProviderTypeGuards.isGroqConfig(config)) {
            return this.createGroqInstance(config, callbacks);
        }
        if (ILLMProviderTypeGuards.isOpenAIConfig(config)) {
            return this.createOpenAIInstance(config, callbacks);
        }
        if (ILLMProviderTypeGuards.isAnthropicConfig(config)) {
            return this.createAnthropicInstance(config, callbacks);
        }
        if (ILLMProviderTypeGuards.isGoogleConfig(config)) {
            return this.createGoogleInstance(config, callbacks);
        }
        if (ILLMProviderTypeGuards.isMistralConfig(config)) {
            return this.createMistralInstance(config, callbacks);
        }

        throw createError({
            message: '❌ Unsupported provider configuration',
            type: 'InitializationError',
            context
        });
    }

    private async validateProviderInstance(instance: ProviderInstance): Promise<void> {
        try {
            // Attempt a simple validation call
            await instance.invoke("Test connection");
        } catch (error) {
            throw createError({
                message: '❌ Provider instance validation failed',
                type: 'ValidationError',
                cause: error instanceof Error ? error : undefined
            });
        }
    }

    // ─── Provider-Specific Instance Creation ───────────────────────────────────

    private createGroqInstance(config: IGroqConfig, callbacks: BaseCallbackHandler[]): ChatGroq {
        return new ChatGroq({
            apiKey: config.apiKey,
            modelName: config.model,
            streaming: config.streaming,
            maxRetries: config.maxRetries,
            temperature: config.temperature,
            maxTokens: config.maxTokens,
            stopSequences: config.stop,
            callbacks
        });
    }

    private createOpenAIInstance(config: IOpenAIConfig, callbacks: BaseCallbackHandler[]): ChatOpenAI {
        return new ChatOpenAI({
            apiKey: config.apiKey,
            modelName: config.model,
            streaming: config.streaming,
            maxRetries: config.maxRetries,
            temperature: config.temperature,
            maxTokens: config.maxTokens,
            presencePenalty: config.presencePenalty,
            frequencyPenalty: config.frequencyPenalty,
            callbacks
        });
    }

    private createAnthropicInstance(config: IAnthropicConfig, callbacks: BaseCallbackHandler[]): ChatAnthropic {
        return new ChatAnthropic({
            apiKey: config.apiKey,
            modelName: config.model,
            streaming: config.streaming,
            maxRetries: config.maxRetries,
            temperature: config.temperature,
            maxTokens: config.maxTokens,
            callbacks
        });
    }

    private createGoogleInstance(config: IGoogleConfig, callbacks: BaseCallbackHandler[]): ChatGoogleGenerativeAI {
        return new ChatGoogleGenerativeAI({
            apiKey: config.apiKey,
            modelName: config.model,
            streaming: config.streaming,
            maxRetries: config.maxRetries,
            temperature: config.temperature,
            maxOutputTokens: config.maxTokens,
            safetySettings: config.safetySettings,
            callbacks
        });
    }

    private createMistralInstance(config: IMistralConfig, callbacks: BaseCallbackHandler[]): ChatMistralAI {
        return new ChatMistralAI({
            apiKey: config.apiKey,
            modelName: config.model,
            streaming: config.streaming,
            maxRetries: config.maxRetries,
            temperature: config.temperature,
            maxTokens: config.maxTokens,
            safeMode: config.inferenceOptions?.useGpu,
            callbacks
        });
    }

    // ─── Provider State Management ───────────────────────────────────────────

    private cleanupInactiveProviders(): void {
        const now = Date.now();
        for (const [instanceId, state] of this.providers.entries()) {
            if (now - state.lastUsed > this.stateCleanupTime) {
                this.deactivateProvider(instanceId);
            }
        }
    }

    private deactivateProvider(instanceId: string): void {
        const state = this.providers.get(instanceId);
        if (state) {
            state.isActive = false;
            state.status = 'idle';
            this.logInfo(`Deactivated provider instance: ${instanceId}`);
        }
    }

    public async retryProvider(instanceId: string): Promise<boolean> {
        const state = this.providers.get(instanceId);
        if (!state || state.retryCount >= this.maxRetries) {
            return false;
        }

        try {
            await this.validateProviderInstance(state.instance);
            state.status = 'idle';
            state.retryCount = 0;
            return true;
        } catch (error) {
            state.retryCount++;
            state.status = 'error';
            return false;
        }
    }

    // ─── Metrics Management ────────────────────────────────────────────────────

    public getProviderMetrics(instanceId: string): ILLMProviderMetrics | undefined {
        const state = this.providers.get(instanceId);
        if (!state) return undefined;

        const baseMetrics = state.metricsCollector.getMetrics();
        const timestamp = Date.now();

        // Create provider-specific metrics
        if (ILLMProviderTypeGuards.isGroqConfig(state.config)) {
            return this.createGroqMetrics(state.config, baseMetrics, timestamp);
        }
        if (ILLMProviderTypeGuards.isOpenAIConfig(state.config)) {
            return this.createOpenAIMetrics(state.config, baseMetrics, timestamp);
        }
        if (ILLMProviderTypeGuards.isAnthropicConfig(state.config)) {
            return this.createAnthropicMetrics(state.config, baseMetrics, timestamp);
        }
        if (ILLMProviderTypeGuards.isGoogleConfig(state.config)) {
            return this.createGoogleMetrics(state.config, baseMetrics, timestamp);
        }
        if (ILLMProviderTypeGuards.isMistralConfig(state.config)) {
            return this.createMistralMetrics(state.config, baseMetrics, timestamp);
        }

        return undefined;
    }

    private createGroqMetrics(config: IGroqConfig, baseMetrics: ILLMMetrics, timestamp: number): IGroqMetrics {
        return {
            provider: LLM_PROVIDER_enum.GROQ,
            model: config.model,
            latency: baseMetrics.performance.latency.average,
            tokenUsage: baseMetrics.usage.tokenDistribution,
            cost: {
                promptCost: 0,
                completionCost: 0,
                totalCost: 0,
                currency: 'USD'
            },
            resources: baseMetrics.resources,
            performance: baseMetrics.performance,
            usage: baseMetrics.usage,
            contextWindow: config.contextWindow || 0,
            streamingLatency: config.streamingLatency || 0,
            gpuUtilization: baseMetrics.resources.gpuMemoryUsage / 100,
            timestamp
        };
    }

    private createOpenAIMetrics(config: IOpenAIConfig, baseMetrics: ILLMMetrics, timestamp: number): IOpenAIMetrics {
        return {
            provider: LLM_PROVIDER_enum.OPENAI,
            model: config.model,
            latency: baseMetrics.performance.latency.average,
            tokenUsage: baseMetrics.usage.tokenDistribution,
            cost: {
                promptCost: 0,
                completionCost: 0,
                totalCost: 0,
                currency: 'USD'
            },
            resources: baseMetrics.resources,
            performance: baseMetrics.performance,
            usage: baseMetrics.usage,
            promptTokens: baseMetrics.usage.tokenDistribution.prompt,
            completionTokens: baseMetrics.usage.tokenDistribution.completion,
            totalTokens: baseMetrics.usage.tokenDistribution.total,
            requestOverhead: baseMetrics.performance.latency.average - baseMetrics.performance.executionTime.average,
            timestamp
        };
    }

    private createAnthropicMetrics(config: IAnthropicConfig, baseMetrics: ILLMMetrics, timestamp: number): IAnthropicMetrics {
        return {
            provider: LLM_PROVIDER_enum.ANTHROPIC,
            model: config.model,
            latency: baseMetrics.performance.latency.average,
            tokenUsage: baseMetrics.usage.tokenDistribution,
            cost: {
                promptCost: 0,
                completionCost: 0,
                totalCost: 0,
                currency: 'USD'
            },
            resources: baseMetrics.resources,
            performance: baseMetrics.performance,
            usage: baseMetrics.usage,
            contextUtilization: config.contextUtilization || 0,
            responseQuality: baseMetrics.performance.coherenceScore,
            modelConfidence: 1 - baseMetrics.performance.errorRate,
            timestamp
        };
    }

    private createGoogleMetrics(config: IGoogleConfig, baseMetrics: ILLMMetrics, timestamp: number): IGoogleMetrics {
        return {
            provider: LLM_PROVIDER_enum.GOOGLE,
            model: config.model,
            latency: baseMetrics.performance.latency.average,
            tokenUsage: baseMetrics.usage.tokenDistribution,
            cost: {
                promptCost: 0,
                completionCost: 0,
                totalCost: 0,
                currency: 'USD'
            },
            resources: baseMetrics.resources,
            performance: baseMetrics.performance,
            usage: baseMetrics.usage,
            safetyRatings: Object.values(HarmCategory).reduce((acc, category) => ({
                ...acc,
                [category]: 0
            }), {} as Record<HarmCategory, number>),
            modelLatency: baseMetrics.performance.executionTime.average,
            apiOverhead: baseMetrics.performance.latency.average - baseMetrics.performance.executionTime.average,
            timestamp
        };
    }

    private createMistralMetrics(config: IMistralConfig, baseMetrics: ILLMMetrics, timestamp: number): IMistralMetrics {
        return {
            provider: LLM_PROVIDER_enum.MISTRAL,
            model: config.model,
            latency: baseMetrics.performance.latency.average,
            tokenUsage: baseMetrics.usage.tokenDistribution,
            cost: {
                promptCost: 0,
                completionCost: 0,
                totalCost: 0,
                currency: 'USD'
            },
            resources: baseMetrics.resources,
            performance: baseMetrics.performance,
            usage: baseMetrics.usage,
            inferenceTime: baseMetrics.performance.executionTime.average,
            throughput: baseMetrics.performance.throughput.operationsPerSecond,
            gpuMemoryUsage: baseMetrics.resources.gpuMemoryUsage,
            timestamp
        };
    }

    // ─── Utility Methods ────────────────────────────────────────────────────────

    private generateInstanceId(config: ILLMProviderConfig): string {
        return `${LLM_PROVIDER_enum[config.provider]}_${config.model}_${Date.now()}`;
    }

    public getProviderState(instanceId: string): ProviderState | undefined {
        return this.providers.get(instanceId);
    }

    public hasProvider(provider: LLM_PROVIDER_enum): boolean {
        return Array.from(this.providers.values()).some(
            state => state.config.provider === provider && state.isActive
        );
    }

    public clearProviders(): void {
        clearInterval(this.stateCleanupInterval);
        this.providers.clear();
        this.logInfo('Cleared all provider instances');
    }

    // ─── Validation Methods ────────────────────────────────────────────────────

    public async validateProviderConfig(config: ILLMProviderConfig): Promise<void> {
        const validationResult = await this.validateConfig(config);
        if (!validationResult.isValid) {
            throw createError({
                message: 'Invalid provider configuration',
                type: 'ValidationError',
                context: {
                    component: this.constructor.name,
                    errors: validationResult.errors,
                    warnings: validationResult.warnings
                }
            });
        }
    }

    public validateConfig(config: ILLMProviderConfig): ILLMValidationResult {
        const errors: VALIDATION_ERROR_enum[] = [];
        const warnings: VALIDATION_WARNING_enum[] = [];

        // Common validation
        if (!config.apiKey) {
            errors.push(VALIDATION_ERROR_enum.FIELD_MISSING);
        }

        if (!config.model) {
            errors.push(VALIDATION_ERROR_enum.FIELD_MISSING);
        }

        if (config.temperature && (config.temperature < 0 || config.temperature > 1)) {
            errors.push(VALIDATION_ERROR_enum.VALUE_OUT_OF_RANGE);
        }

        if (config.maxTokens && config.maxTokens < 1) {
            errors.push(VALIDATION_ERROR_enum.VALUE_OUT_OF_RANGE);
        }

        if (config.maxRetries === undefined) {
            warnings.push(VALIDATION_WARNING_enum.OPTIONAL_FIELD_MISSING);
        }

        // Provider-specific validation using type guards
        if (ILLMProviderTypeGuards.isGroqConfig(config)) {
            this.validateGroqConfig(config, errors, warnings);
        } else if (ILLMProviderTypeGuards.isOpenAIConfig(config)) {
            this.validateOpenAIConfig(config, errors, warnings);
        } else if (ILLMProviderTypeGuards.isAnthropicConfig(config)) {
            this.validateAnthropicConfig(config, errors, warnings);
        } else if (ILLMProviderTypeGuards.isGoogleConfig(config)) {
            this.validateGoogleConfig(config, errors, warnings);
        } else if (ILLMProviderTypeGuards.isMistralConfig(config)) {
            this.validateMistralConfig(config, errors, warnings);
        } else {
            errors.push(VALIDATION_ERROR_enum.INVALID_CONFIG);
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

    private validateGroqConfig(
        config: IGroqConfig, 
        errors: VALIDATION_ERROR_enum[], 
        warnings: VALIDATION_WARNING_enum[]
    ): void {
        if (config.streamingLatency !== undefined && config.streamingLatency < 0) {
            errors.push(VALIDATION_ERROR_enum.VALUE_OUT_OF_RANGE);
        }
        if (config.streamingLatency === undefined) {
            warnings.push(VALIDATION_WARNING_enum.OPTIONAL_FIELD_MISSING);
        }
        if (config.contextWindow && config.contextWindow > 32768) {
            warnings.push(VALIDATION_WARNING_enum.PERFORMANCE_IMPACT);
        }
    }

    private validateOpenAIConfig(
        config: IOpenAIConfig, 
        errors: VALIDATION_ERROR_enum[], 
        warnings: VALIDATION_WARNING_enum[]
    ): void {
        if (config.presencePenalty !== undefined && (config.presencePenalty < -2 || config.presencePenalty > 2)) {
            errors.push(VALIDATION_ERROR_enum.VALUE_OUT_OF_RANGE);
        }
        if (config.frequencyPenalty !== undefined && (config.frequencyPenalty < -2 || config.frequencyPenalty > 2)) {
            errors.push(VALIDATION_ERROR_enum.VALUE_OUT_OF_RANGE);
        }
        if (!config.organization) {
            warnings.push(VALIDATION_WARNING_enum.OPTIONAL_FIELD_MISSING);
        }
        if (config.temperature && config.temperature > 0.8) {
            warnings.push(VALIDATION_WARNING_enum.PERFORMANCE_IMPACT);
        }
    }

    private validateAnthropicConfig(
        config: IAnthropicConfig, 
        errors: VALIDATION_ERROR_enum[], 
        warnings: VALIDATION_WARNING_enum[]
    ): void {
        if (config.contextUtilization !== undefined && (config.contextUtilization < 0 || config.contextUtilization > 1)) {
            errors.push(VALIDATION_ERROR_enum.VALUE_OUT_OF_RANGE);
        }
        if (!config.anthropicApiUrl) {
            warnings.push(VALIDATION_WARNING_enum.OPTIONAL_FIELD_MISSING);
        }
        if (config.maxTokens && config.maxTokens > 4096) {
            warnings.push(VALIDATION_WARNING_enum.PERFORMANCE_IMPACT);
        }
    }

    private validateGoogleConfig(
        config: IGoogleConfig, 
        errors: VALIDATION_ERROR_enum[], 
        warnings: VALIDATION_WARNING_enum[]
    ): void {
        if (!config.safetySettings || config.safetySettings.length === 0) {
            warnings.push(VALIDATION_WARNING_enum.OPTIONAL_FIELD_MISSING);
        } else {
            config.safetySettings.forEach((setting, index) => {
                if (!Object.values(HarmBlockThreshold).includes(setting.threshold)) {
                    errors.push(VALIDATION_ERROR_enum.FIELD_INVALID);
                }
                if (!Object.values(HarmCategory).includes(setting.category)) {
                    errors.push(VALIDATION_ERROR_enum.FIELD_INVALID);
                }
            });
        }
        if (!config.baseUrl) {
            warnings.push(VALIDATION_WARNING_enum.OPTIONAL_FIELD_MISSING);
        }
    }

    private validateMistralConfig(
        config: IMistralConfig, 
        errors: VALIDATION_ERROR_enum[], 
        warnings: VALIDATION_WARNING_enum[]
    ): void {
        if (config.inferenceOptions?.numThreads !== undefined && config.inferenceOptions.numThreads < 1) {
            errors.push(VALIDATION_ERROR_enum.VALUE_OUT_OF_RANGE);
        }
        if (!config.inferenceOptions) {
            warnings.push(VALIDATION_WARNING_enum.OPTIONAL_FIELD_MISSING);
        }
        if (config.inferenceOptions?.useGpu === undefined) {
            warnings.push(VALIDATION_WARNING_enum.OPTIONAL_FIELD_MISSING);
        }
        if (!config.endpoint) {
            warnings.push(VALIDATION_WARNING_enum.OPTIONAL_FIELD_MISSING);
        }
    }
}

export default ProviderManager.getInstance();
