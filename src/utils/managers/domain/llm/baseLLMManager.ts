/**
 * @file baseLLMManager.ts
 * @path src/utils/managers/domain/llm/baseLLMManager.ts
 * @description Support manager providing core LLM functionality
 */

import type { AGENT_STATUS_enum } from '../../../../utils/types/common/enums';
import type { StatusTransitionContext } from '../../../../utils/types/common/status';

import type {
    LLMInstance,
    LLMInstanceOptions
} from '../../../../utils/types/llm/instance';

import type {
    LLMConfig,
    ActiveLLMConfig,
    LLMRuntimeOptions,
    StreamingChunk
} from '../../../../utils/types/llm/common';

import type {
    LLMResponse,
    Output,
    ParsedOutput,
    LLMUsageStats,
    ResponseMetadata
} from '../../../../utils/types/llm/responses';

import type {
    StreamingHandlerConfig,
    EventHandlerConfig
} from '../../../../utils/types/llm/callbacks';

// Domain manager types
interface StreamingManager {
    initializeStream(instanceId: string, config: StreamingHandlerConfig): Promise<void>;
    processChunk(instanceId: string, chunk: StreamingChunk): Promise<void>;
    completeStream(instanceId: string): Promise<void>;
    abortStream(instanceId: string): Promise<void>;
    initialize?(): Promise<void>;
    cleanup?(): Promise<void>;
}

interface ProviderManager {
    validateProviderConfig(config: ActiveLLMConfig): Promise<void>;
}

interface DomainManager {
    initialize?(): Promise<void>;
    cleanup?(): Promise<void>;
}

/**
 * Support manager providing core LLM functionality
 * Used by LLMManager but not inherited from
 */
export class BaseLLMManager implements DomainManager {
    private readonly instances: Map<string, LLMInstance>;
    private readonly configs: Map<string, LLMConfig>;
    private readonly metrics: Map<string, LLMUsageStats>;
    private readonly parentManager: any;

    public constructor(parentManager: any) {
        this.parentManager = parentManager;
        this.instances = new Map();
        this.configs = new Map();
        this.metrics = new Map();
    }

    // ─── Core LLM Operations ─────────────────────────────────────────────────────

    /**
     * Generate LLM response
     */
    public async generate(
        instanceId: string,
        input: string,
        options?: LLMRuntimeOptions
    ): Promise<LLMResponse> {
        const instance = this.getInstance(instanceId);
        if (!instance) {
            throw new Error(`No LLM instance found for ID: ${instanceId}`);
        }

        await this.updateAgentStatus({
            currentStatus: 'THINKING' as AGENT_STATUS_enum,
            targetStatus: 'THINKING_END' as AGENT_STATUS_enum,
            entity: 'agent',
            entityId: instanceId,
            metadata: { input, options }
        });

        const response = await instance.generate(input, options);
        if (!response) {
            throw new Error('LLM instance returned null response');
        }
        
        await this.updateMetrics(instanceId, response);
        return response;
    }

    /**
     * Generate streaming response
     */
    public async *generateStream(
        instanceId: string,
        input: string,
        config: StreamingHandlerConfig
    ): AsyncGenerator<StreamingChunk> {
        const instance = this.getInstance(instanceId);
        if (!instance) {
            throw new Error(`No LLM instance found for ID: ${instanceId}`);
        }

        const streamingManager = await this.getDomainManager<StreamingManager>('StreamingManager');
        await streamingManager.initializeStream(instanceId, config);

        try {
            const iterator = instance.generateStream(input);
            for await (const chunk of iterator) {
                await streamingManager.processChunk(instanceId, chunk);
                yield chunk;
            }

            await streamingManager.completeStream(instanceId);

        } catch (error) {
            await streamingManager.abortStream(instanceId);
            throw error;
        }
    }

    /**
     * Create new LLM instance
     */
    public async createInstance(config: ActiveLLMConfig, instance: any): Promise<LLMInstance> {
        const instanceId = this.generateInstanceId(config);
        
        if (this.instances.has(instanceId)) {
            const existingInstance = this.instances.get(instanceId);
            if (!existingInstance) {
                throw new Error(`Invalid instance state for ID: ${instanceId}`);
            }
            return existingInstance;
        }

        const wrappedInstance = this.wrapInstance(instance, config);
        this.instances.set(instanceId, wrappedInstance);
        this.configs.set(instanceId, config);
        this.metrics.set(instanceId, this.createDefaultMetrics());

        return wrappedInstance;
    }

    /**
     * Clean up resources
     */
    public async cleanup(): Promise<void> {
        for (const instance of this.instances.values()) {
            await instance.cleanup();
        }
        this.instances.clear();
        this.configs.clear();
        this.metrics.clear();
    }

    // ─── Protected Utility Methods ───────────────────────────────────────────────

    /**
     * Get existing LLM instance
     */
    private getInstance(instanceId: string): LLMInstance | undefined {
        return this.instances.get(instanceId);
    }

    /**
     * Update metrics for instance
     */
    private async updateMetrics(
        instanceId: string,
        response: LLMResponse
    ): Promise<void> {
        const metrics = this.metrics.get(instanceId);
        if (!metrics) return;

        // Update token counts
        metrics.inputTokens += response.usage.promptTokens;
        metrics.outputTokens += response.usage.completionTokens;
        metrics.callsCount++;

        // Update latency
        const latency = response.metadata.latency;
        metrics.totalLatency += latency;
        metrics.averageLatency = metrics.totalLatency / metrics.callsCount;

        // Update memory stats if available
        const memoryUsage = (response.metadata as ResponseMetadata & { memoryUsage?: number }).memoryUsage;
        if (memoryUsage !== undefined) {
            metrics.memoryUtilization.peakMemoryUsage = Math.max(
                metrics.memoryUtilization.peakMemoryUsage,
                memoryUsage
            );
        }

        this.metrics.set(instanceId, metrics);
    }

    /**
     * Generate unique instance ID
     */
    private generateInstanceId(config: LLMConfig): string {
        return `${config.provider}-${config.model}-${Date.now()}`;
    }

    /**
     * Create default metrics
     */
    private createDefaultMetrics(): LLMUsageStats {
        return {
            inputTokens: 0,
            outputTokens: 0,
            callsCount: 0,
            callsErrorCount: 0,
            parsingErrors: 0,
            totalLatency: 0,
            averageLatency: 0,
            lastUsed: Date.now(),
            memoryUtilization: {
                peakMemoryUsage: 0,
                averageMemoryUsage: 0,
                cleanupEvents: 0
            },
            costBreakdown: {
                input: 0,
                output: 0,
                total: 0,
                currency: 'USD'
            }
        };
    }

    /**
     * Update agent status through parent manager
     */
    private async updateAgentStatus(context: StatusTransitionContext): Promise<void> {
        await this.parentManager.handleStatusTransition(context);
    }

    /**
     * Get domain manager through parent manager
     */
    public async getDomainManager<T>(name: string): Promise<T> {
        return await this.parentManager.getDomainManager(name);
    }

    /**
     * Wrap raw LLM instance
     */
    private wrapInstance(instance: any, config: ActiveLLMConfig): LLMInstance {
        const instanceId = this.generateInstanceId(config);

        return {
            generate: async (input: string, options?: LLMRuntimeOptions) => {
                return this.generate(instanceId, input, options);
            },

            generateStream: (input: string, options?: LLMRuntimeOptions) => {
                const iterator = this.generateStream(instanceId, input, {
                    ...options,
                    onChunk: () => {},
                    onComplete: () => {},
                    onError: () => {}
                });
                return {
                    [Symbol.asyncIterator]() {
                        return iterator;
                    }
                };
            },

            cleanup: async () => {
                const instance = this.instances.get(instanceId);
                if (instance) {
                    await instance.cleanup();
                }
                this.instances.delete(instanceId);
                this.configs.delete(instanceId);
                this.metrics.delete(instanceId);
            },

            validateConfig: async () => {
                const providerManager = await this.getDomainManager<ProviderManager>('ProviderManager');
                await providerManager.validateProviderConfig(config);
            },

            getConfig: () => config,
            
            updateConfig: (updates: Partial<ActiveLLMConfig>) => {
                Object.assign(config, updates);
            },

            getProvider: () => config.provider
        };
    }
}

export default BaseLLMManager;
