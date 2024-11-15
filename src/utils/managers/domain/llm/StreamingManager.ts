/**
 * @file StreamingManager.ts
 * @path src/managers/domain/llm/StreamingManager.ts
 * @description Centralized manager for LLM streaming operations
 *
 * @module @managers/domain/llm
 */

import CoreManager from '../../core/CoreManager';
import { ErrorManager } from '../../core/ErrorManager';
import { LogManager } from '../../core/LogManager';

// Import types from canonical locations
import type { 
    StreamingChunk,
    StreamingHandlerConfig,
    LLMEventType,
    LLMEvent
} from '@/utils/types/llm/callbacks';

import type {
    AgentType,
    TaskType,
    LLMUsageStats
} from '@/utils/types';

import type { 
    StatusTransitionContext 
} from '@/utils/types/common/status';

import { AGENT_STATUS_enum } from '@/utils/types/common/enums';

/**
 * Manages streaming operations for LLM interactions
 */
export class StreamingManager extends CoreManager {
    private static instance: StreamingManager;
    private readonly errorManager: ErrorManager;
    private readonly logManager: LogManager;
    private readonly chunkBuffer: Map<string, string[]>;
    private readonly streamCallbacks: Map<string, StreamingHandlerConfig>;
    private readonly metrics: Map<string, LLMUsageStats>;

    private constructor() {
        super();
        this.errorManager = ErrorManager.getInstance();
        this.logManager = LogManager.getInstance();
        this.chunkBuffer = new Map();
        this.streamCallbacks = new Map();
        this.metrics = new Map();
    }

    /**
     * Get singleton instance
     */
    public static getInstance(): StreamingManager {
        if (!StreamingManager.instance) {
            StreamingManager.instance = new StreamingManager();
        }
        return StreamingManager.instance;
    }

    /**
     * Initialize streaming session
     */
    public async initializeStream(
        sessionId: string,
        config: StreamingHandlerConfig
    ): Promise<void> {
        try {
            if (this.streamCallbacks.has(sessionId)) {
                throw new Error(`Stream session ${sessionId} already exists`);
            }

            this.streamCallbacks.set(sessionId, config);
            this.chunkBuffer.set(sessionId, []);
            this.metrics.set(sessionId, this.createDefaultMetrics());

            this.logManager.debug('Stream session initialized', {
                sessionId,
                component: 'StreamingManager'
            });

        } catch (error) {
            await this.handleStreamError(error, sessionId);
        }
    }

    /**
     * Process streaming chunk
     */
    public async processChunk(
        sessionId: string,
        chunk: StreamingChunk
    ): Promise<void> {
        try {
            const config = this.streamCallbacks.get(sessionId);
            if (!config) {
                throw new Error(`No stream configuration found for session ${sessionId}`);
            }

            const buffer = this.chunkBuffer.get(sessionId) || [];
            buffer.push(chunk.content);
            this.chunkBuffer.set(sessionId, buffer);

            // Update metrics
            const metrics = this.metrics.get(sessionId);
            if (metrics) {
                metrics.outputTokens += this.estimateTokenCount(chunk.content);
                metrics.callsCount++;
                this.metrics.set(sessionId, metrics);
            }

            // Handle chunk processing
            if (config.onToken) {
                config.onToken(chunk.content);
            }

            // Check for stream completion
            if (chunk.done) {
                await this.completeStream(sessionId);
            }

            this.emitStreamEvent(sessionId, 'token.received', {
                chunk,
                metrics: this.metrics.get(sessionId)
            });

        } catch (error) {
            await this.handleStreamError(error, sessionId);
        }
    }

    /**
     * Complete streaming session
     */
    public async completeStream(sessionId: string): Promise<void> {
        try {
            const config = this.streamCallbacks.get(sessionId);
            const buffer = this.chunkBuffer.get(sessionId);

            if (!config || !buffer) {
                throw new Error(`Invalid stream session: ${sessionId}`);
            }

            const content = buffer.join('');
            if (config.onComplete) {
                config.onComplete(content);
            }

            // Cleanup session
            this.streamCallbacks.delete(sessionId);
            this.chunkBuffer.delete(sessionId);
            const metrics = this.metrics.get(sessionId);
            this.metrics.delete(sessionId);

            this.emitStreamEvent(sessionId, 'request.end', {
                content,
                metrics
            });

            this.logManager.debug('Stream completed', {
                sessionId,
                metrics,
                component: 'StreamingManager'
            });

        } catch (error) {
            await this.handleStreamError(error, sessionId);
        }
    }

    /**
     * Handle streaming output for agent
     */
    public async handleStreamingOutput(params: {
        agent: AgentType;
        task: TaskType;
        chunk: string;
        isDone: boolean;
        metadata?: Record<string, unknown>;
    }): Promise<void> {
        const { agent, task, chunk, isDone, metadata } = params;

        try {
            // Generate session ID if not exists
            const sessionId = `${agent.id}-${task.id}`;

            // Initialize stream if first chunk
            if (!this.streamCallbacks.has(sessionId)) {
                await this.initializeStream(sessionId, {
                    content: '',
                    metadata,
                    onToken: (token: string) => {
                        this.logManager.debug('Token received', {
                            token,
                            sessionId,
                            component: 'StreamingManager'
                        });
                    },
                    onComplete: (content: string) => {
                        this.logManager.debug('Stream completed', {
                            content,
                            sessionId,
                            component: 'StreamingManager'
                        });
                    },
                    onError: (error: Error) => {
                        this.logManager.error('Stream error', {
                            error,
                            sessionId,
                            component: 'StreamingManager'
                        });
                    }
                });
            }

            // Process chunk
            await this.processChunk(sessionId, {
                content: chunk,
                metadata,
                done: isDone
            });

            // Update agent status
            await this.updateAgentStatus({
                currentStatus: agent.status,
                targetStatus: isDone ? AGENT_STATUS_enum.THINKING_END : AGENT_STATUS_enum.THINKING,
                entity: 'agent',
                entityId: agent.id,
                metadata: {
                    taskId: task.id,
                    chunk,
                    isDone
                }
            });

        } catch (error) {
            await this.handleStreamError(error, params.agent.id);
        }
    }

    /**
     * Abort streaming session
     */
    public async abortStream(sessionId: string): Promise<void> {
        try {
            const config = this.streamCallbacks.get(sessionId);
            if (!config) {
                throw new Error(`No stream found for session ${sessionId}`);
            }

            if (config.onError) {
                config.onError(new Error('Stream aborted'));
            }

            // Cleanup session
            this.streamCallbacks.delete(sessionId);
            this.chunkBuffer.delete(sessionId);
            this.metrics.delete(sessionId);

            this.emitStreamEvent(sessionId, 'request.error', {
                error: 'Stream aborted',
                timestamp: Date.now()
            });

        } catch (error) {
            await this.handleStreamError(error, sessionId);
        }
    }

    /**
     * Get streaming metrics
     */
    public getMetrics(sessionId: string): LLMUsageStats | undefined {
        return this.metrics.get(sessionId);
    }

    /**
     * Validate manager configuration
     */
    public async validateConfig(): Promise<void> {
        // Implementation specific to streaming configuration
    }

    /**
     * Initialize manager
     */
    public async initialize(): Promise<void> {
        this.logManager.info('StreamingManager initialized', {
            component: 'StreamingManager'
        });
    }

    /**
     * Cleanup resources
     */
    public async cleanup(): Promise<void> {
        // Abort all active streams
        for (const sessionId of this.streamCallbacks.keys()) {
            await this.abortStream(sessionId);
        }

        // Clear all buffers and callbacks
        this.streamCallbacks.clear();
        this.chunkBuffer.clear();
        this.metrics.clear();

        this.logManager.info('StreamingManager cleaned up', {
            component: 'StreamingManager'
        });
    }

    // ─── Private Helper Methods ───────────────────────────────────────────────

    /**
     * Handle streaming errors
     */
    private async handleStreamError(error: unknown, sessionId: string): Promise<void> {
        const streamError = await this.errorManager.handleError({
            error: error instanceof Error ? error : new Error(String(error)),
            context: { 
                sessionId,
                component: 'StreamingManager'
            }
        });

        const config = this.streamCallbacks.get(sessionId);
        if (config?.onError) {
            config.onError(streamError);
        }

        this.emitStreamEvent(sessionId, 'request.error', {
            error: streamError,
            timestamp: Date.now()
        });

        // Cleanup failed session
        this.streamCallbacks.delete(sessionId);
        this.chunkBuffer.delete(sessionId);
        this.metrics.delete(sessionId);
    }

    /**
     * Update agent status during streaming
     */
    private async updateAgentStatus(context: StatusTransitionContext): Promise<void> {
        try {
            await this.statusManager.transition(context);
        } catch (error) {
            await this.handleStreamError(error, context.entityId);
        }
    }

    /**
     * Emit stream event
     */
    private emitStreamEvent(
        sessionId: string,
        type: LLMEventType,
        data: Record<string, unknown>
    ): void {
        const event: LLMEvent = {
            type,
            timestamp: Date.now(),
            data: {
                sessionId,
                ...data
            }
        };

        this.logManager.debug('Stream event emitted', {
            event,
            component: 'StreamingManager'
        });
    }

    /**
     * Create default metrics object
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
     * Estimate token count from content
     */
    private estimateTokenCount(content: string): number {
        // Simple estimation based on word count
        // In practice, use a proper tokenizer
        return Math.ceil(content.split(/\s+/).length * 1.3);
    }
}

export default StreamingManager.getInstance();