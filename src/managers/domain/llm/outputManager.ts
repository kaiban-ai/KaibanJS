/**
 * @file outputManager.ts
 * @path src/managers/domain/llm/outputManager.ts
 * @description LLM output handling and processing using Langchain
 */

import { CoreManager } from '../../core/coreManager';
import { createError } from '../../../types/common/commonErrorTypes';
import { MetadataFactory } from '../../../utils/factories/metadataFactory';
import { BaseMessage } from '@langchain/core/messages';
import { ChatGenerationChunk, GenerationChunk } from '@langchain/core/outputs';
import { BaseCallbackHandler } from '@langchain/core/callbacks/base';

import type { IHandlerResult } from '../../../types/common/commonHandlerTypes';
import type { IBaseMetrics } from '../../../types/metrics/base/baseMetrics';

// ─── Callback Handler for Streaming ────────────────────────────────────────────

class StreamingCallbackHandler extends BaseCallbackHandler {
    name = "streaming_handler";
    
    constructor(private onToken: (token: string) => void) {
        super();
    }

    async handleLLMNewToken(token: string): Promise<void> {
        this.onToken(token);
    }
}

// ─── Output Manager Implementation ────────────────────────────────────────────

export class OutputManager extends CoreManager {
    private static instance: OutputManager;

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
     * Process streaming output from Langchain
     */
    public createStreamingHandler(onToken: (token: string) => void): BaseCallbackHandler {
        return new StreamingCallbackHandler(onToken);
    }

    private createBaseMetrics(): IBaseMetrics {
        return {
            resource: {
                cpuUsage: 0,
                memoryUsage: process.memoryUsage().heapUsed,
                diskIO: { read: 0, write: 0 },
                networkUsage: { upload: 0, download: 0 },
                timestamp: Date.now()
            },
            performance: {
                executionTime: {
                    total: 0,
                    average: 0,
                    min: 0,
                    max: 0
                },
                latency: {
                    total: 0,
                    average: 0,
                    min: 0,
                    max: 0
                },
                throughput: {
                    operationsPerSecond: 0,
                    dataProcessedPerSecond: 0
                },
                responseTime: {
                    total: 0,
                    average: 0,
                    min: 0,
                    max: 0
                },
                queueLength: 0,
                errorRate: 0,
                successRate: 1,
                errorMetrics: {
                    totalErrors: 0,
                    errorRate: 0
                },
                resourceUtilization: {
                    cpuUsage: 0,
                    memoryUsage: 0,
                    diskIO: { read: 0, write: 0 },
                    networkUsage: { upload: 0, download: 0 },
                    timestamp: Date.now()
                },
                timestamp: Date.now()
            },
            usage: {
                totalRequests: 0,
                activeUsers: 0,
                requestsPerSecond: 0,
                averageResponseSize: 0,
                peakMemoryUsage: 0,
                uptime: 0,
                rateLimit: {
                    current: 0,
                    limit: 0,
                    remaining: 0,
                    resetTime: Date.now()
                },
                timestamp: Date.now()
            },
            timestamp: Date.now()
        };
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
            const metrics: IBaseMetrics = {
                ...this.createBaseMetrics(),
                performance: {
                    ...this.createBaseMetrics().performance,
                    executionTime: {
                        total: generation.generationInfo?.time_per_token || 0,
                        average: 0,
                        min: 0,
                        max: 0
                    },
                    throughput: {
                        operationsPerSecond: generation.generationInfo?.tokens_per_second || 0,
                        dataProcessedPerSecond: 0
                    },
                    resourceUtilization: {
                        cpuUsage: 0,
                        memoryUsage: generation.generationInfo?.peak_memory || 0,
                        diskIO: { read: 0, write: 0 },
                        networkUsage: { upload: 0, download: 0 },
                        timestamp: Date.now()
                    }
                },
                usage: {
                    ...this.createBaseMetrics().usage,
                    totalRequests: 1,
                    requestsPerSecond: 1,
                    averageResponseSize: rawOutput.length,
                    peakMemoryUsage: generation.generationInfo?.peak_memory || 0
                }
            };

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
            
            const metrics = this.createBaseMetrics();

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
            throw createError({
                message: 'Failed to process message sequence',
                type: 'SystemError',
                context: { messages, rawOutput },
                cause: error instanceof Error ? error : undefined
            });
        }
    }
}

export default OutputManager.getInstance();
