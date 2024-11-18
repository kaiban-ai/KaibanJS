/**
 * @file llmManager.ts
 * @path src/utils/managers/domain/llm/llmManager.ts
 * @description Primary LLM domain manager implementing provider-specific functionality
 */

import { ChatGroq } from '@langchain/groq';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatMistralAI } from '@langchain/mistralai';

import CoreManager from '../../core/coreManager';
import BaseLLMManager from './baseLLMManager';

import type { 
    LLMInstance, 
    LLMInstanceFactory
} from '../../../../utils/types/llm/instance';

import type { 
    LLMConfig, 
    LLMRuntimeOptions,
    ActiveLLMConfig,
    StreamingChunk
} from '../../../../utils/types/llm/common';

import type { LLMResponse } from '../../../../utils/types/llm/responses';
import type { StreamingHandlerConfig } from '../../../../utils/types/llm/callbacks';
import type { OutputManager } from './outputManager';
import type { ProviderManager } from './providerManager';
import type { StreamingManager } from './streamingManager';

interface DomainManager {
    initialize?(): Promise<void>;
    cleanup?(): Promise<void>;
}

/**
 * Primary Domain Manager for LLM functionality
 * Extends CoreManager directly and uses BaseLLMManager for core LLM operations
 */
export class LLMManager extends CoreManager implements LLMInstanceFactory {
    private static instance: LLMManager;
    private readonly baseLLM: BaseLLMManager;
    private readonly domainManagers: Map<string, DomainManager>;

    private constructor() {
        super();
        this.domainManagers = new Map();
        this.baseLLM = new BaseLLMManager(this);
        this.domainManagers.set('LLMManager', this);
    }

    public static getInstance(): LLMManager {
        if (!LLMManager.instance) {
            LLMManager.instance = new LLMManager();
        }
        return LLMManager.instance;
    }

    /**
     * Create new LLM instance
     */
    public async createInstance(config: ActiveLLMConfig): Promise<LLMInstance> {
        const result = await this.safeExecute(async () => {
            const providerManager = await this.getDomainManager<ProviderManager>('ProviderManager');
            await providerManager.validateProviderConfig(config);

            const instance = await this.createProviderInstance(config);
            return await this.baseLLM.createInstance(config, instance);
        }, 'Failed to create LLM instance');

        if (!result) {
            throw new Error('Failed to create LLM instance');
        }

        return result;
    }

    /**
     * Create provider-specific instance
     */
    private async createProviderInstance(config: ActiveLLMConfig): Promise<any> {
        const providerManager = await this.getDomainManager<ProviderManager>('ProviderManager');
        return await providerManager.getProviderInstance(config);
    }

    /**
     * Generate LLM response
     */
    public async generate(
        instanceId: string,
        input: string,
        options?: LLMRuntimeOptions
    ): Promise<LLMResponse> {
        return await this.baseLLM.generate(instanceId, input, options);
    }

    /**
     * Generate streaming response
     */
    public async *generateStream(
        instanceId: string,
        input: string,
        options?: LLMRuntimeOptions
    ): AsyncGenerator<StreamingChunk> {
        yield* this.baseLLM.generateStream(instanceId, input, {
            content: input,
            metadata: options?.metadata,
            onToken: () => {},
            onComplete: () => {},
            onError: () => {}
        });
    }

    /**
     * Initialize LLM manager
     */
    public async initialize(): Promise<void> {
        const streamingManager = await this.getDomainManager<StreamingManager>('StreamingManager');
        if (streamingManager.initialize) {
            await streamingManager.initialize();
        }
        this.logManager.info('LLMManager initialized');
    }

    /**
     * Clean up all resources
     */
    public async cleanup(): Promise<void> {
        await this.safeExecute(async () => {
            await this.baseLLM.cleanup();

            const streamingManager = await this.getDomainManager<StreamingManager>('StreamingManager');
            if (streamingManager.cleanup) {
                await streamingManager.cleanup();
            }
            
            this.logManager.info('LLMManager cleaned up');
        }, 'LLM cleanup failed');
    }

    /**
     * Register domain manager
     */
    public registerDomainManager(name: string, manager: DomainManager): void {
        this.domainManagers.set(name, manager);
    }

    /**
     * Get domain manager with type safety
     */
    public async getDomainManager<T extends DomainManager>(name: string): Promise<T> {
        const manager = this.domainManagers.get(name);
        if (!manager) {
            throw new Error(`Domain manager not found: ${name}`);
        }
        return manager as T;
    }
}

export default LLMManager.getInstance();
