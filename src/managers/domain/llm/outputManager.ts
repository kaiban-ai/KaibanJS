/**
 * @file outputManager.ts
 * @path src/managers/domain/llm/outputManager.ts
 * @description Manages LLM output processing and metrics collection
 */

import { BaseMessage } from '@langchain/core/messages';
import { ChatGenerationChunk } from '@langchain/core/outputs';
import { BaseCallbackHandler } from '@langchain/core/callbacks/base';

import { CoreManager } from '../../core/coreManager';
import { createBaseMetadata } from '../../../types/common/baseTypes';
import { 
    MANAGER_CATEGORY_enum, 
    LLM_PROVIDER_enum,
    LLM_STATUS_enum 
} from '../../../types/common/enumTypes';
import { MetricDomain, MetricType } from '../../../types/metrics/base/metricsManagerTypes';
import { MetricsAdapter } from '../../../metrics/MetricsAdapter';

import type { IHandlerResult } from '../../../types/common/baseTypes';

/**
 * Manages LLM output processing and metrics collection
 */
class OutputManager extends CoreManager {
    private static instance: OutputManager;
    private isInitialized = false;
    public readonly category = MANAGER_CATEGORY_enum.EXECUTION;

    private constructor() {
        super();
        this.registerDomainManager('OutputManager', this);
    }

    public static getInstance(): OutputManager {
        if (!OutputManager.instance) {
            OutputManager.instance = new OutputManager();
        }
        return OutputManager.instance;
    }

    /**
     * Initialize the output manager
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

            this.isInitialized = true;
            this.logInfo('Output Manager initialized successfully');
        }, 'Failed to initialize Output manager');

        if (!result.success) {
            throw result.metadata.error;
        }
    }

    /**
     * Process chat generation output
     */
    public async processChatGeneration(
        generation: ChatGenerationChunk,
        rawOutput: string
    ): Promise<IHandlerResult<string>> {
        const result = await this.safeExecute(async () => {
            if (!this.isInitialized) {
                await this.initialize();
            }

            const message = generation.message;
            const runId = `run_${Date.now()}`;
            const baseMetadata = createBaseMetadata(this.constructor.name, 'generation');
            const metrics = MetricsAdapter.fromLangchainCallback({}, undefined, Date.now(), Date.now());

            // Track generation metrics
            const event = {
                type: 'request.end',
                timestamp: Date.now(),
                runId,
                metadata: {
                    ...baseMetadata,
                    provider: LLM_PROVIDER_enum.GROQ,
                    model: generation.generationInfo?.model_name || 'unknown',
                    metrics: MetricsAdapter.toBaseMetrics(metrics),
                    timestamp: Date.now(),
                    runId,
                    performance: metrics.performance,
                    rawOutput
                }
            } as Record<string, unknown>;

            await this.metricsManager.trackMetric({
                domain: MetricDomain.LLM,
                type: MetricType.PERFORMANCE,
                value: 1,
                timestamp: Date.now(),
                metadata: event
            });

            this.logDebug(`Processed generation: ${message.content}`);

            return {
                success: true,
                data: String(message.content),
                metadata: baseMetadata
            };
        }, 'Failed to process chat generation');

        if (!result.success || !result.data) {
            this.logError('Chat generation processing failed', result.metadata.error);
            throw result.metadata.error;
        }

        return result.data;
    }

    /**
     * Process a sequence of messages
     */
    public async processMessageSequence(
        messages: BaseMessage[],
        rawOutput: string
    ): Promise<IHandlerResult<string>> {
        const result = await this.safeExecute(async () => {
            if (!this.isInitialized) {
                await this.initialize();
            }

            await this.handleStatusTransition({
                entity: 'llm',
                entityId: this.constructor.name,
                currentStatus: LLM_STATUS_enum.READY,
                targetStatus: LLM_STATUS_enum.ACTIVE,
                context: {
                    component: this.constructor.name,
                    operation: 'processMessageSequence',
                    messageCount: messages.length
                }
            });

            const combinedContent = messages.map(msg => String(msg.content)).join('\n');
            const runId = `run_${Date.now()}`;
            const baseMetadata = createBaseMetadata(this.constructor.name, 'sequence');
            const metrics = MetricsAdapter.fromLangchainCallback({}, undefined, Date.now(), Date.now());

            // Track sequence metrics
            const event = {
                type: 'request.end',
                timestamp: Date.now(),
                runId,
                metadata: {
                    ...baseMetadata,
                    provider: LLM_PROVIDER_enum.GROQ,
                    model: 'unknown',
                    metrics: MetricsAdapter.toBaseMetrics(metrics),
                    timestamp: Date.now(),
                    runId,
                    performance: metrics.performance,
                    rawOutput
                }
            } as Record<string, unknown>;

            await this.metricsManager.trackMetric({
                domain: MetricDomain.LLM,
                type: MetricType.PERFORMANCE,
                value: 1,
                timestamp: Date.now(),
                metadata: event
            });

            await this.handleStatusTransition({
                entity: 'llm',
                entityId: this.constructor.name,
                currentStatus: LLM_STATUS_enum.ACTIVE,
                targetStatus: LLM_STATUS_enum.READY,
                context: {
                    component: this.constructor.name,
                    operation: 'processMessageSequence',
                    messageCount: messages.length,
                    success: true
                }
            });

            this.logDebug(`Processed message sequence: ${messages.length} messages`);

            return {
                success: true,
                data: combinedContent,
                metadata: baseMetadata
            };
        }, 'Failed to process message sequence');

        if (!result.success || !result.data) {
            this.logError('Message sequence processing failed', result.metadata.error);
            throw result.metadata.error;
        }

        return result.data;
    }

    /**
     * Create a streaming handler
     */
    public createStreamingHandler(onToken: (token: string) => void): BaseCallbackHandler {
        return new StreamingCallbackHandler(onToken, this.metricsManager);
    }

    /**
     * Clean up resources
     */
    public async cleanup(): Promise<void> {
        const result = await this.safeExecute(async () => {
            this.isInitialized = false;
            this.logInfo('Output Manager cleaned up successfully');
        }, 'Failed to cleanup Output manager');

        if (!result.success) {
            throw result.metadata.error;
        }
    }
}

/**
 * Callback handler for streaming responses
 */
class StreamingCallbackHandler extends BaseCallbackHandler {
    name = "streaming_handler";
    private readonly runId: string;

    constructor(
        private onToken: (token: string) => void,
        private readonly metricsManager: any // Type from CoreManager
    ) {
        super();
        this.runId = `run_${Date.now()}`;
    }

    async handleLLMNewToken(token: string): Promise<void> {
        try {
            this.onToken(token);
            const baseMetadata = createBaseMetadata('llm', 'token');
            const metrics = MetricsAdapter.fromLangchainCallback({}, undefined, Date.now(), Date.now());

            // Track token metrics
            const event = {
                type: 'token.received',
                timestamp: Date.now(),
                runId: this.runId,
                metadata: {
                    ...baseMetadata,
                    provider: LLM_PROVIDER_enum.GROQ,
                    model: 'unknown',
                    metrics: MetricsAdapter.toBaseMetrics(metrics),
                    timestamp: Date.now(),
                    runId: this.runId,
                    performance: metrics.performance
                }
            } as Record<string, unknown>;

            // Track metrics using CoreManager's metricsManager
            await this.metricsManager.trackMetric({
                domain: MetricDomain.LLM,
                type: MetricType.PERFORMANCE,
                value: 1,
                timestamp: Date.now(),
                metadata: event
            });

        } catch (error) {
            // Log error through metrics manager
            await this.metricsManager.trackMetric({
                domain: MetricDomain.LLM,
                type: MetricType.ERROR,
                value: 1,
                timestamp: Date.now(),
                metadata: { error }
            });
        }
    }
}

// Export singleton instance
export default OutputManager.getInstance();
