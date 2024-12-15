/**
 * @file outputManager.ts
 * @path src/managers/domain/llm/outputManager.ts
 * @description LLM output handling and processing using Langchain with enhanced metrics
 */

import { CoreManager } from '../../core/coreManager';
import { createError } from '../../../types/common/commonErrorTypes';
import { MetadataFactory } from '../../../utils/factories/metadataFactory';
import { 
    BaseMessage, 
    HumanMessage, 
    AIMessage, 
    SystemMessage, 
    FunctionMessage 
} from '@langchain/core/messages';
import { 
    ChatGenerationChunk, 
    GenerationChunk, 
    LLMResult 
} from '@langchain/core/outputs';
import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import { LLMMetricsCollector } from '../../../metrics/LLMMetricsCollector';
import { createBaseMetadata } from '../../../types/common/commonMetadataTypes';

import type { IHandlerResult } from '../../../types/common/commonHandlerTypes';
import type { ILLMMetrics } from '../../../types/llm/llmMetricTypes';
import type { ILLMEvent, ILLMEventMetadata } from '../../../types/llm/llmCallbacksTypes';
import type { IBaseMetrics } from '../../../types/metrics/base/baseMetrics';
import { LLM_PROVIDER_enum } from '../../../types/common/commonEnums';

// ─── Metrics Adapter ────────────────────────────────────────────────────────

/**
 * Adapt LLM metrics to base metrics interface
 */
function adaptMetricsToBase(llmMetrics: ILLMMetrics): IBaseMetrics {
    return {
        resources: {
            cpuUsage: llmMetrics.resources.cpuUsage,
            memoryUsage: llmMetrics.resources.memoryUsage,
            diskIO: llmMetrics.resources.diskIO,
            networkUsage: llmMetrics.resources.networkUsage,
            timestamp: llmMetrics.timestamp
        },
        performance: llmMetrics.performance,
        usage: {
            totalRequests: llmMetrics.usage.totalRequests,
            activeUsers: llmMetrics.usage.activeUsers,
            requestsPerSecond: llmMetrics.usage.requestsPerSecond,
            averageResponseSize: llmMetrics.usage.averageResponseSize,
            peakMemoryUsage: llmMetrics.usage.peakMemoryUsage,
            uptime: llmMetrics.usage.uptime,
            rateLimit: llmMetrics.usage.rateLimit,
            timestamp: llmMetrics.usage.timestamp
        },
        timestamp: llmMetrics.timestamp
    };
}

// ─── Callback Handler for Streaming ────────────────────────────────────────────

class StreamingCallbackHandler extends BaseCallbackHandler {
    name = "streaming_handler";
    private readonly metricsCollector: LLMMetricsCollector;
    private readonly runId: string;
    
    constructor(
        private onToken: (token: string) => void,
        metricsCollector: LLMMetricsCollector
    ) {
        super();
        this.metricsCollector = metricsCollector;
        this.runId = `run_${Date.now()}`;
    }

    async handleLLMNewToken(token: string): Promise<void> {
        try {
            this.onToken(token);

            const baseMetadata = createBaseMetadata('llm', 'token');
            // Track token metrics with proper event structure
            const event: ILLMEvent = {
                type: 'token.received',
                timestamp: Date.now(),
                runId: this.runId,
                parentRunId: undefined,
                metadata: {
                    ...baseMetadata,
                    provider: LLM_PROVIDER_enum.GROQ,
                    model: 'mixtral-8x7b-32768',
                    metrics: adaptMetricsToBase(this.metricsCollector.getMetrics()),
                    timestamp: Date.now(),
                    runId: this.runId,
                    performance: {
                        executionTime: { total: 0, average: 0, min: 0, max: 0 },
                        latency: { total: 0, average: 0, min: 0, max: 0 },
                        throughput: { operationsPerSecond: 0, dataProcessedPerSecond: 0 },
                        responseTime: { total: 0, average: 0, min: 0, max: 0 },
                        queueLength: 0,
                        errorRate: 0,
                        successRate: 1,
                        errorMetrics: { totalErrors: 0, errorRate: 0 },
                        resourceUtilization: {
                            cpuUsage: 0,
                            memoryUsage: 0,
                            diskIO: { read: 0, write: 0 },
                            networkUsage: { upload: 0, download: 0 },
                            timestamp: Date.now()
                        },
                        timestamp: Date.now()
                    },
                    context: {
                        source: 'llm',
                        target: 'token',
                        correlationId: this.runId,
                        causationId: this.runId
                    }
                },
                data: { token }
            };
            this.metricsCollector.handleEvent(event);
        } catch (error) {
            this.metricsCollector.handleLLMError(error, this.runId);
        }
    }
}

// ─── Output Manager Implementation ────────────────────────────────────────────

export class OutputManager extends CoreManager {
    private static instance: OutputManager;
    private readonly metricsCollector: LLMMetricsCollector;

    private constructor() {
        super();
        this.metricsCollector = new LLMMetricsCollector();
        this.registerDomainManager('OutputManager', this);
    }

    public static getInstance(): OutputManager {
        if (!OutputManager.instance) {
            OutputManager.instance = new OutputManager();
        }
        return OutputManager.instance;
    }

    /**
     * Create a streaming handler with integrated metrics
     */
    public createStreamingHandler(onToken: (token: string) => void): BaseCallbackHandler {
        return new StreamingCallbackHandler(onToken, this.metricsCollector);
    }

    /**
     * Process chat generation output from Langchain
     */
    public async processChatGeneration(
        generation: ChatGenerationChunk,
        rawOutput: string
    ): Promise<IHandlerResult<string>> {
        try {
            const message = generation.message;
            const runId = `run_${Date.now()}`;
            const baseMetadata = createBaseMetadata('llm', 'generation');
            
            // Track generation metrics with proper event structure
            const event: ILLMEvent = {
                type: 'request.end',
                timestamp: Date.now(),
                runId,
                parentRunId: undefined,
                metadata: {
                    ...baseMetadata,
                    provider: LLM_PROVIDER_enum.GROQ,
                    model: generation.generationInfo?.model_name || 'mixtral-8x7b-32768',
                    metrics: adaptMetricsToBase(this.metricsCollector.getMetrics()),
                    timestamp: Date.now(),
                    runId,
                    performance: {
                        executionTime: { total: 0, average: 0, min: 0, max: 0 },
                        latency: { total: 0, average: 0, min: 0, max: 0 },
                        throughput: { operationsPerSecond: 0, dataProcessedPerSecond: 0 },
                        responseTime: { total: 0, average: 0, min: 0, max: 0 },
                        queueLength: 0,
                        errorRate: 0,
                        successRate: 1,
                        errorMetrics: { totalErrors: 0, errorRate: 0 },
                        resourceUtilization: {
                            cpuUsage: 0,
                            memoryUsage: 0,
                            diskIO: { read: 0, write: 0 },
                            networkUsage: { upload: 0, download: 0 },
                            timestamp: Date.now()
                        },
                        timestamp: Date.now()
                    },
                    context: {
                        source: 'llm',
                        target: 'generation',
                        correlationId: runId,
                        causationId: runId
                    }
                },
                data: {
                    output: {
                        generations: [[generation]],
                        llmOutput: generation.generationInfo
                    }
                }
            };
            this.metricsCollector.handleEvent(event);

            // Log performance metrics at appropriate levels
            const metrics = this.metricsCollector.getMetrics();
            this.logPerformanceMetrics(metrics);

            const metadata = MetadataFactory.createProviderMetadata({
                provider: generation.generationInfo?.model_name || 'unknown',
                model: generation.generationInfo?.model_name || 'unknown',
                timestamp: Date.now()
            });

            return {
                success: true,
                data: String(message.content),
                metadata
            };
        } catch (error) {
            const runId = `run_${Date.now()}`;
            const baseMetadata = createBaseMetadata('llm', 'error');
            const event: ILLMEvent = {
                type: 'request.error',
                timestamp: Date.now(),
                runId,
                parentRunId: undefined,
                metadata: {
                    ...baseMetadata,
                    provider: LLM_PROVIDER_enum.GROQ,
                    model: generation.generationInfo?.model_name || 'mixtral-8x7b-32768',
                    metrics: adaptMetricsToBase(this.metricsCollector.getMetrics()),
                    timestamp: Date.now(),
                    runId,
                    performance: {
                        executionTime: { total: 0, average: 0, min: 0, max: 0 },
                        latency: { total: 0, average: 0, min: 0, max: 0 },
                        throughput: { operationsPerSecond: 0, dataProcessedPerSecond: 0 },
                        responseTime: { total: 0, average: 0, min: 0, max: 0 },
                        queueLength: 0,
                        errorRate: 0,
                        successRate: 1,
                        errorMetrics: { totalErrors: 0, errorRate: 0 },
                        resourceUtilization: {
                            cpuUsage: 0,
                            memoryUsage: 0,
                            diskIO: { read: 0, write: 0 },
                            networkUsage: { upload: 0, download: 0 },
                            timestamp: Date.now()
                        },
                        timestamp: Date.now()
                    },
                    context: {
                        source: 'llm',
                        target: 'error',
                        correlationId: runId,
                        causationId: runId
                    }
                },
                data: { error }
            };
            this.metricsCollector.handleEvent(event);

            throw createError({
                message: 'Failed to process LLM output',
                type: 'SystemError',
                context: { generation, rawOutput },
                cause: error instanceof Error ? error : undefined
            });
        }
    }

    /**
     * Process a sequence of messages from Langchain
     */
    public async processMessageSequence(
        messages: BaseMessage[],
        rawOutput: string
    ): Promise<IHandlerResult<string>> {
        try {
            const combinedContent = messages.map(msg => String(msg.content)).join('\n');
            const runId = `run_${Date.now()}`;
            const baseMetadata = createBaseMetadata('llm', 'sequence');
            
            // Track sequence metrics with proper event structure
            const event: ILLMEvent = {
                type: 'request.end',
                timestamp: Date.now(),
                runId,
                parentRunId: undefined,
                metadata: {
                    ...baseMetadata,
                    provider: LLM_PROVIDER_enum.GROQ,
                    model: 'mixtral-8x7b-32768',
                    metrics: adaptMetricsToBase(this.metricsCollector.getMetrics()),
                    timestamp: Date.now(),
                    runId,
                    performance: {
                        executionTime: { total: 0, average: 0, min: 0, max: 0 },
                        latency: { total: 0, average: 0, min: 0, max: 0 },
                        throughput: { operationsPerSecond: 0, dataProcessedPerSecond: 0 },
                        responseTime: { total: 0, average: 0, min: 0, max: 0 },
                        queueLength: 0,
                        errorRate: 0,
                        successRate: 1,
                        errorMetrics: { totalErrors: 0, errorRate: 0 },
                        resourceUtilization: {
                            cpuUsage: 0,
                            memoryUsage: 0,
                            diskIO: { read: 0, write: 0 },
                            networkUsage: { upload: 0, download: 0 },
                            timestamp: Date.now()
                        },
                        timestamp: Date.now()
                    },
                    context: {
                        source: 'llm',
                        target: 'sequence',
                        correlationId: runId,
                        causationId: runId
                    }
                },
                data: {
                    messages: messages.map(m => ({
                        content: m.content,
                        type: m._getType()
                    }))
                }
            };
            this.metricsCollector.handleEvent(event);

            // Log sequence metrics at appropriate levels
            const metrics = this.metricsCollector.getMetrics();
            this.logPerformanceMetrics(metrics);

            const metadata = MetadataFactory.createProviderMetadata({
                provider: 'langchain',
                model: 'unknown',
                timestamp: Date.now()
            });

            return {
                success: true,
                data: combinedContent,
                metadata
            };
        } catch (error) {
            const runId = `run_${Date.now()}`;
            const baseMetadata = createBaseMetadata('llm', 'error');
            const event: ILLMEvent = {
                type: 'request.error',
                timestamp: Date.now(),
                runId,
                parentRunId: undefined,
                metadata: {
                    ...baseMetadata,
                    provider: LLM_PROVIDER_enum.GROQ,
                    model: 'mixtral-8x7b-32768',
                    metrics: adaptMetricsToBase(this.metricsCollector.getMetrics()),
                    timestamp: Date.now(),
                    runId,
                    performance: {
                        executionTime: { total: 0, average: 0, min: 0, max: 0 },
                        latency: { total: 0, average: 0, min: 0, max: 0 },
                        throughput: { operationsPerSecond: 0, dataProcessedPerSecond: 0 },
                        responseTime: { total: 0, average: 0, min: 0, max: 0 },
                        queueLength: 0,
                        errorRate: 0,
                        successRate: 1,
                        errorMetrics: { totalErrors: 0, errorRate: 0 },
                        resourceUtilization: {
                            cpuUsage: 0,
                            memoryUsage: 0,
                            diskIO: { read: 0, write: 0 },
                            networkUsage: { upload: 0, download: 0 },
                            timestamp: Date.now()
                        },
                        timestamp: Date.now()
                    },
                    context: {
                        source: 'llm',
                        target: 'error',
                        correlationId: runId,
                        causationId: runId
                    }
                },
                data: { error }
            };
            this.metricsCollector.handleEvent(event);

            throw createError({
                message: 'Failed to process message sequence',
                type: 'SystemError',
                context: { messages, rawOutput },
                cause: error instanceof Error ? error : undefined
            });
        }
    }

    /**
     * Log performance metrics at appropriate levels
     */
    private logPerformanceMetrics(metrics: ILLMMetrics): void {
        // Log resource metrics
        if (metrics.resources.cpuUsage > 80) {
            this.logWarn(`High CPU usage: ${metrics.resources.cpuUsage}%`);
        }
        if (metrics.resources.memoryUsage > 1000000000) { // 1GB
            this.logWarn(`High memory usage: ${metrics.resources.memoryUsage} bytes`);
    }

        // Log performance metrics
        if (metrics.performance.errorRate > 0) {
            this.logError(`Error rate: ${metrics.performance.errorRate}%`);
        }
        if (metrics.performance.tokensPerSecond < 10) {
            this.logWarn(`Low processing speed: ${metrics.performance.tokensPerSecond} tokens/s`);
        }

        // Log usage metrics
        if (metrics.usage.tokenDistribution.total > 4000) {
            this.logWarn(`High token usage: ${metrics.usage.tokenDistribution.total} tokens`);
        }

        // Log general metrics at debug level
        this.logDebug(`Tokens processed: ${metrics.usage.tokenDistribution.total}`);
        this.logDebug(`Processing speed: ${metrics.performance.tokensPerSecond} tokens/s`);
        this.logDebug(`Success rate: ${metrics.performance.successRate * 100}%`);
    }
}

export default OutputManager.getInstance();
