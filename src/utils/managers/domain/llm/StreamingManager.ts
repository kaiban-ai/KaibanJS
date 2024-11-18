/**
 * @file streamingManager.ts
 * @path src/utils/managers/domain/llm/streamingManager.ts
 * @description Centralized streaming management for LLM interactions
 *
 * @module @managers/domain/llm
 */

import CoreManager from '../../core/coreManager';
import type { StreamingChunk, StreamingHandlerConfig } from '@/utils/types/llm/callbacks';
import type { LLMUsageStats } from '@/utils/types/llm';
import type { AGENT_STATUS_enum } from '@/utils/types/common/enums';
import type { AgentType, TaskType } from '@/utils/types';

export class StreamingManager extends CoreManager {
    private static instance: StreamingManager;
    private readonly chunkBuffer: Map<string, string[]>;
    private readonly streamCallbacks: Map<string, StreamingHandlerConfig>;
    private readonly metrics: Map<string, LLMUsageStats>;

    private constructor() {
        super();
        this.chunkBuffer = new Map();
        this.streamCallbacks = new Map();
        this.metrics = new Map();
        this.registerDomainManager('StreamingManager', this);
    }

    public static getInstance(): StreamingManager {
        if (!StreamingManager.instance) {
            StreamingManager.instance = new StreamingManager();
        }
        return StreamingManager.instance;
    }

    public async initializeStream(
        sessionId: string,
        config: StreamingHandlerConfig
    ): Promise<void> {
        return await this.safeExecute(async () => {
            if (this.streamCallbacks.has(sessionId)) {
                throw new Error(`Stream session ${sessionId} already exists`);
            }

            this.streamCallbacks.set(sessionId, config);
            this.chunkBuffer.set(sessionId, []);
            this.metrics.set(sessionId, this.createDefaultMetrics());

            this.logManager.debug('Stream session initialized', undefined, sessionId);
        }, 'Stream initialization failed');
    }

    public async processChunk(
        sessionId: string,
        chunk: StreamingChunk
    ): Promise<void> {
        return await this.safeExecute(async () => {
            const config = this.streamCallbacks.get(sessionId);
            if (!config) {
                throw new Error(`No stream configuration found for session ${sessionId}`);
            }

            const buffer = this.chunkBuffer.get(sessionId) || [];
            buffer.push(chunk.content);
            this.chunkBuffer.set(sessionId, buffer);

            const metrics = this.metrics.get(sessionId);
            if (metrics) {
                metrics.outputTokens += this.estimateTokenCount(chunk.content);
                metrics.callsCount++;
                this.metrics.set(sessionId, metrics);
            }

            if (config.onToken) {
                config.onToken(chunk.content);
            }

            if (chunk.done) {
                await this.completeStream(sessionId);
            }
        }, 'Chunk processing failed');
    }

    public async handleStreamingOutput(params: {
        agent: AgentType;
        task: TaskType;
        chunk: string;
        isDone: boolean;
    }): Promise<void> {
        const { agent, task, chunk, isDone } = params;

        return await this.safeExecute(async () => {
            const sessionId = `${agent.id}-${task.id}`;

            if (!this.streamCallbacks.has(sessionId)) {
                await this.initializeStream(sessionId, {
                    content: '',
                    onToken: (token: string) => {
                        this.logManager.debug('Token received', undefined, sessionId);
                    },
                    onComplete: (content: string) => {
                        this.logManager.debug('Stream completed', undefined, sessionId);
                    }
                });
            }

            await this.processChunk(sessionId, {
                content: chunk,
                done: isDone
            });

            await this.handleStatusTransition({
                currentStatus: agent.status,
                targetStatus: isDone ? 'THINKING_END' : 'THINKING',
                entity: 'agent',
                entityId: agent.id,
                metadata: { taskId: task.id }
            });
        }, 'Streaming output handling failed');
    }

    public async completeStream(sessionId: string): Promise<void> {
        return await this.safeExecute(async () => {
            const config = this.streamCallbacks.get(sessionId);
            const buffer = this.chunkBuffer.get(sessionId);

            if (!config || !buffer) {
                throw new Error(`Invalid stream session: ${sessionId}`);
            }

            const content = buffer.join('');
            if (config.onComplete) {
                config.onComplete(content);
            }

            this.cleanup(sessionId);
        }, 'Stream completion failed');
    }

    public async abortStream(sessionId: string): Promise<void> {
        return await this.safeExecute(async () => {
            const config = this.streamCallbacks.get(sessionId);
            if (config?.onError) {
                config.onError(new Error('Stream aborted'));
            }
            this.cleanup(sessionId);
        }, 'Stream abort failed');
    }

    public getMetrics(sessionId: string): LLMUsageStats | undefined {
        return this.metrics.get(sessionId);
    }

    public async cleanup(): Promise<void> {
        return await this.safeExecute(async () => {
            this.streamCallbacks.clear();
            this.chunkBuffer.clear();
            this.metrics.clear();
            this.logManager.info('StreamingManager cleaned up');
        }, 'StreamingManager cleanup failed');
    }

    private cleanup(sessionId: string): void {
        this.streamCallbacks.delete(sessionId);
        this.chunkBuffer.delete(sessionId);
        this.metrics.delete(sessionId);
    }

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

    private estimateTokenCount(content: string): number {
        return Math.ceil(content.split(/\s+/).length * 1.3);
    }
}

export default StreamingManager.getInstance();