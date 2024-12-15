/**
 * @file streamingManager.ts
 * @description Streaming management for LLM interactions using Langchain
 */

import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import { LLMResult } from '@langchain/core/outputs';
import { Serialized } from '@langchain/core/load/serializable';
import { NewTokenIndices, HandleLLMNewTokenCallbackFields } from '@langchain/core/callbacks/base';
import { CoreManager } from '../../core/coreManager';
import { LLM_PROVIDER_enum, MANAGER_CATEGORY_enum, LLM_STATUS_enum } from '../../../types/common/enumTypes';
import { ERROR_KINDS } from '../../../types/common/errorTypes';
import { MetricDomain, MetricType } from '../../../types/metrics/base/metricsManagerTypes';
import { AIMessageChunk } from '../../../types/llm/message/messageChunkTypes';
import { createStreamingError, IStreamingErrorDetails } from '../../../types/llm/streamingErrorTypes';
import { 
    createStreamingEvent, 
    IStreamStartEvent,
    IStreamTokenEvent,
    IStreamEndEvent,
    IStreamErrorEvent,
    IStreamingEventMetadata
} from '../../../types/llm/streamingEventTypes';
import { convertToLLMMetrics } from '../../../utils/metrics/llmMetricsConverter';
import type { ILLMMetrics } from '../../../types/llm/llmMetricTypes';

interface StreamingState {
    provider: LLM_PROVIDER_enum;
    model: string;
    tokens: string[];
    currentChunk: AIMessageChunk;
    metrics: ILLMMetrics;
    startTime: number;
    tokenUsage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    metadata: IStreamingEventMetadata;
}

class StreamingCallbackHandler extends BaseCallbackHandler {
    name = "StreamingCallbackHandler";
    streamManager: StreamingManager;

    constructor(streamManager: StreamingManager) {
        super();
        this.streamManager = streamManager;
    }

    get lc_namespace(): ["langchain_core", "callbacks", string] {
        return ["langchain_core", "callbacks", "streaming"];
    }

    async handleLLMStart(
        llm: Serialized,
        prompts: string[],
        runId: string,
        parentRunId?: string,
        extraParams?: Record<string, unknown>,
        tags?: string[],
        metadata?: Record<string, unknown>,
        runName?: string
    ): Promise<void> {
        await this.streamManager.handleLLMStart(
            llm, prompts, runId, parentRunId, extraParams, tags, metadata, runName
        );
    }

    async handleLLMNewToken(
        token: string,
        idx: NewTokenIndices,
        runId: string,
        parentRunId?: string,
        tags?: string[],
        fields?: HandleLLMNewTokenCallbackFields
    ): Promise<void> {
        await this.streamManager.handleLLMNewToken(
            token, idx, runId, parentRunId, tags, fields
        );
    }

    async handleLLMEnd(
        output: LLMResult,
        runId: string,
        parentRunId?: string,
        tags?: string[]
    ): Promise<void> {
        await this.streamManager.handleLLMEnd(output, runId, parentRunId, tags);
    }

    async handleLLMError(
        error: Error,
        runId: string,
        parentRunId?: string,
        tags?: string[]
    ): Promise<void> {
        await this.streamManager.handleLLMError(error, runId, parentRunId, tags);
    }
}

export class StreamingManager extends CoreManager {
    private static instance: StreamingManager;
    private readonly streamStates: Map<string, StreamingState>;
    private readonly metricsUpdateInterval: NodeJS.Timeout;
    private readonly callbackHandler: BaseCallbackHandler;
    public readonly category = MANAGER_CATEGORY_enum.RESOURCE;

    private constructor() {
        super();
        this.streamStates = new Map();
        this.registerDomainManager('StreamingManager', this);

        this.metricsUpdateInterval = setInterval(() => {
            this.updateMetrics();
        }, 1000);

        this.callbackHandler = new StreamingCallbackHandler(this);
    }

    public static getInstance(): StreamingManager {
        if (!StreamingManager.instance) {
            StreamingManager.instance = new StreamingManager();
        }
        return StreamingManager.instance;
    }

    public async initialize(): Promise<void> {
        await super.initialize();
        await this.handleStatusTransition({
            entity: 'llm',
            entityId: this.constructor.name,
            currentStatus: LLM_STATUS_enum.INITIALIZING,
            targetStatus: LLM_STATUS_enum.READY,
            context: {
                component: this.constructor.name,
                operation: 'initialize'
            }
        });
    }

    // ─── Streaming Management ────────────────────────────────────────────────────

    public async handleLLMStart(
        llm: Serialized,
        prompts: string[],
        runId: string,
        parentRunId?: string,
        extraParams?: Record<string, unknown>,
        tags?: string[],
        metadata?: Record<string, unknown>,
        runName?: string
    ): Promise<void> {
        const result = await this.safeExecute(async () => {
            const resourceMetrics = await this.getMetricsManager().getInitialResourceMetrics();
            const performanceMetrics = await this.getMetricsManager().getInitialPerformanceMetrics();
            const metrics = convertToLLMMetrics(resourceMetrics, performanceMetrics);

            const state: StreamingState = {
                provider: LLM_PROVIDER_enum.UNKNOWN,
                model: llm.id?.[0] || 'unknown',
                tokens: [],
                currentChunk: new AIMessageChunk({ content: '' }),
                metrics,
                startTime: Date.now(),
                tokenUsage: {
                    promptTokens: this.estimateTokenCount(prompts.join('')),
                    completionTokens: 0,
                    totalTokens: 0
                },
                metadata: {
                    streamId: runId,
                    provider: LLM_PROVIDER_enum.UNKNOWN,
                    model: llm.id?.[0] || 'unknown',
                    metrics,
                    timestamp: Date.now(),
                    component: 'StreamingManager',
                    operation: 'handleLLMStart',
                    performance: metrics.performance,
                    context: {
                        source: 'StreamingManager',
                        target: 'handleLLMStart',
                        correlationId: runId,
                        causationId: parentRunId || runId
                    },
                    validation: {
                        isValid: true,
                        errors: [],
                        warnings: []
                    }
                }
            };

            this.streamStates.set(runId, state);

            const event = createStreamingEvent<IStreamStartEvent>(
                'llm_stream_start',
                {
                    streamId: runId,
                    provider: state.provider,
                    model: state.model,
                    metrics: state.metrics
                },
                { prompts, runId, parentRunId, tags }
            );

            await this.emitEvent(event);
            return state;
        }, 'handleLLMStart');

        if (!result.success) {
            await this.handleError(
                result.metadata.error,
                'Failed to start LLM stream',
                ERROR_KINDS.ExecutionError
            );
        }
    }

    public async handleLLMNewToken(
        token: string,
        idx: NewTokenIndices,
        runId: string,
        parentRunId?: string,
        tags?: string[],
        fields?: HandleLLMNewTokenCallbackFields
    ): Promise<void> {
        const result = await this.safeExecute(async () => {
            const state = this.streamStates.get(runId);
            if (!state) {
                const streamDetails: IStreamingErrorDetails = {
                    streamId: runId,
                    tokenIndex: idx.prompt,
                    streamState: {
                        totalTokens: 0,
                        completedTokens: 0,
                        failedTokens: 1
                    }
                };

                throw createStreamingError({
                    message: '❌ No stream state found',
                    streamDetails
                });
            }

            state.tokens.push(token);
            state.tokenUsage.completionTokens++;
            state.tokenUsage.totalTokens = 
                state.tokenUsage.promptTokens + state.tokenUsage.completionTokens;

            // Create new chunk and concatenate with current
            const newChunk = new AIMessageChunk({ content: token });
            state.currentChunk = state.currentChunk.concat(newChunk);

            const event = createStreamingEvent<IStreamTokenEvent>(
                'llm_stream_token',
                {
                    streamId: runId,
                    provider: state.provider,
                    model: state.model,
                    metrics: state.metrics
                },
                { token, idx, runId, parentRunId, tags, fields }
            );

            await this.updateStateMetrics(state);
            await this.emitEvent(event);

            await this.getMetricsManager().trackMetric({
                domain: MetricDomain.LLM,
                type: MetricType.PERFORMANCE,
                value: 1,
                timestamp: Date.now(),
                metadata: {
                    runId,
                    tokenCount: state.tokenUsage.totalTokens,
                    component: this.constructor.name
                }
            });

            return state;
        }, 'handleLLMNewToken');

        if (!result.success) {
            await this.handleError(
                result.metadata.error,
                'Failed to handle new token',
                ERROR_KINDS.ExecutionError
            );
        }
    }

    public async handleLLMEnd(
        output: LLMResult,
        runId: string,
        parentRunId?: string,
        tags?: string[]
    ): Promise<void> {
        const result = await this.safeExecute(async () => {
            const state = this.streamStates.get(runId);
            if (!state) return;

            const event = createStreamingEvent<IStreamEndEvent>(
                'llm_stream_end',
                {
                    streamId: runId,
                    provider: state.provider,
                    model: state.model,
                    metrics: state.metrics
                },
                { result: output, runId, parentRunId, tags }
            );

            await this.emitEvent(event);
            this.cleanup(runId);

            return state;
        }, 'handleLLMEnd');

        if (!result.success) {
            await this.handleError(
                result.metadata.error,
                'Failed to end LLM stream',
                ERROR_KINDS.ExecutionError
            );
        }
    }

    public async handleLLMError(
        error: Error,
        runId: string,
        parentRunId?: string,
        tags?: string[]
    ): Promise<void> {
        const state = this.streamStates.get(runId);
        if (!state) return;

        const streamDetails: IStreamingErrorDetails = {
            streamId: runId,
            streamState: {
                totalTokens: state.tokenUsage.totalTokens,
                completedTokens: state.tokens.length,
                failedTokens: state.tokenUsage.totalTokens - state.tokens.length,
                lastSuccessfulToken: state.tokens[state.tokens.length - 1]
            }
        };

        const streamingError = createStreamingError({
            message: error.message,
            streamDetails
        });

        const event = createStreamingEvent<IStreamErrorEvent>(
            'llm_stream_error',
            {
                streamId: runId,
                provider: state.provider,
                model: state.model,
                metrics: state.metrics
            },
            { error: streamingError, runId, parentRunId, tags }
        );

        await this.handleError(streamingError, 'Stream error', ERROR_KINDS.ExecutionError);
        await this.emitEvent(event);
        this.cleanup(runId);
    }

    // ─── Metrics Management ────────────────────────────────────────────────────

    private async updateStateMetrics(state: StreamingState): Promise<void> {
        const elapsedSeconds = (Date.now() - state.startTime) / 1000;
        const resourceMetrics = await this.getMetricsManager().getInitialResourceMetrics();
        const performanceMetrics = await this.getMetricsManager().getInitialPerformanceMetrics();
        const baseMetrics = convertToLLMMetrics(resourceMetrics, performanceMetrics);

        const newMetrics = {
            ...baseMetrics,
            performance: {
                ...baseMetrics.performance,
                tokensPerSecond: state.tokenUsage.totalTokens / Math.max(elapsedSeconds, 1)
            },
            usage: {
                ...baseMetrics.usage,
                tokenDistribution: {
                    prompt: state.tokenUsage.promptTokens,
                    completion: state.tokenUsage.completionTokens,
                    total: state.tokenUsage.totalTokens
                }
            }
        };

        state.metrics = newMetrics;

        await this.getMetricsManager().trackMetric({
            domain: MetricDomain.LLM,
            type: MetricType.PERFORMANCE,
            value: elapsedSeconds,
            timestamp: Date.now(),
            metadata: {
                metrics: newMetrics,
                component: this.constructor.name
            }
        });
    }

    private async updateMetrics(): Promise<void> {
        for (const [runId, state] of this.streamStates.entries()) {
            await this.updateStateMetrics(state);
        }
    }

    public getMetrics(runId: string): ILLMMetrics | undefined {
        return this.streamStates.get(runId)?.metrics;
    }

    // ─── Cleanup Management ────────────────────────────────────────────────────

    private cleanup(runId: string): void {
        this.streamStates.delete(runId);
    }

    public destroy(): void {
        clearInterval(this.metricsUpdateInterval);
        this.streamStates.clear();
        this.logInfo('StreamingManager destroyed');
    }

    // ─── Helper Methods ────────────────────────────────────────────────────────

    private estimateTokenCount(text: string): number {
        return Math.ceil(text.split(/\s+/).length * 1.3);
    }

    // ─── Public Interface ────────────────────────────────────────────────────

    public getCallbackHandler(): BaseCallbackHandler {
        return this.callbackHandler;
    }

    public getCurrentChunk(runId: string): AIMessageChunk | undefined {
        return this.streamStates.get(runId)?.currentChunk;
    }
}

export default StreamingManager.getInstance();
