/**
 * @file MessageManager.ts
 * @path src/managers/domain/llm/MessageManager.ts
 * @description Centralized message handling and history management
 *
 * @module @managers/domain/llm
 */

import CoreManager from '../../core/CoreManager';
import errorHandler from '../handlers/errorHandler';
import { MessageTypeGuards } from '@/utils/types/messaging/history';
import { BaseMessage, HumanMessage, AIMessage, SystemMessage, FunctionMessage } from "@langchain/core/messages";

// Import types from canonical locations
import type { 
    MessageRole,
    MessageContext,
    MessageContent,
    MessageMetadataFields,
    FunctionCall,
    BaseMessageMetadataFields,
    ChatMessageMetadataFields
} from '@/utils/types/messaging/base';

import type {
    MessageHistoryConfig,
    MessageHistoryState,
    MessageHistoryMetrics,
    IMessageHistory
} from '@/utils/types/messaging/history';

import type {
    MessageHandlerConfig,
    MessageStreamConfig,
    MessageValidationConfig,
    MessageBuildParams,
    MessageProcessResult
} from '@/utils/types/messaging/handlers';

/**
 * Centralized message management implementation
 */
export class MessageManager extends CoreManager implements IMessageHistory {
    private static instance: MessageManager;
    private messages: BaseMessage[] = [];
    private config: Required<MessageHistoryConfig>;

    private constructor(config: MessageHistoryConfig = {}) {
        super();
        this.config = {
            maxMessages: config.maxMessages ?? 1000,
            maxTokens: config.maxTokens ?? 8192,
            pruningStrategy: config.pruningStrategy ?? 'fifo',
            retentionPeriod: config.retentionPeriod ?? 24 * 60 * 60 * 1000,
            persistenceEnabled: config.persistenceEnabled ?? false,
            compressionEnabled: config.compressionEnabled ?? false
        };
    }

    public static getInstance(config?: MessageHistoryConfig): MessageManager {
        if (!MessageManager.instance) {
            MessageManager.instance = new MessageManager(config);
        }
        return MessageManager.instance;
    }

    // ─── Message History Operations ─────────────────────────────────────────────

    /**
     * Add message to history
     */
    public async addMessage(message: BaseMessage): Promise<void> {
        if (!this.validateMessage(message)) {
            throw new Error("Invalid message type");
        }

        this.messages.push(message);
        await this.enforceLimits();
        this.log(`Added ${message.constructor.name} to history`, 'debug');
    }

    /**
     * Get all messages in history
     */
    public async getMessages(): Promise<BaseMessage[]> {
        return this.messages;
    }

    /**
     * Clear message history
     */
    public async clear(): Promise<void> {
        this.messages = [];
        this.log('Message history cleared', 'info');
    }

    /**
     * Get current message count
     */
    public get length(): number {
        return this.messages.length;
    }

    // ─── Message Type Operations ──────────────────────────────────────────────

    /**
     * Add user message
     */
    public async addUserMessage(content: string): Promise<void> {
        await this.addMessage(new HumanMessage(content));
    }

    /**
     * Add AI message
     */
    public async addAIMessage(content: string): Promise<void> {
        await this.addMessage(new AIMessage(content));
    }

    /**
     * Add system message
     */
    public async addSystemMessage(content: string): Promise<void> {
        await this.addMessage(new SystemMessage(content));
    }

    /**
     * Add function message
     */
    public async addFunctionMessage(name: string, content: string): Promise<void> {
        await this.addMessage(new FunctionMessage(content, name));
    }

    // ─── Message Processing ─────────────────────────────────────────────────────

    /**
     * Process a message with validation and metadata
     */
    public async processMessage(
        content: string,
        role: MessageRole = 'assistant',
        context?: MessageContext
    ): Promise<MessageProcessResult> {
        try {
            this.validateMessageContent(content, role);

            const message = await this.buildMessage({
                role,
                content,
                metadata: this.createMetadata(context)
            });

            await this.addMessage(message);

            return {
                success: true,
                message,
                metadata: {
                    timestamp: Date.now(),
                    ...context
                }
            };

        } catch (error) {
            return this.handleProcessingError(error);
        }
    }

    /**
     * Process streaming messages
     */
    public async processStream(
        content: string,
        config: MessageStreamConfig
    ): Promise<void> {
        const { bufferSize = 100, onToken, onComplete } = config;
        let buffer = '';

        try {
            for (const chunk of content) {
                buffer += chunk;

                if (buffer.length >= bufferSize && onToken) {
                    await onToken(buffer);
                    buffer = '';
                }
            }

            if (buffer && onToken) {
                await onToken(buffer);
            }

            if (onComplete) {
                await onComplete(content);
            }

        } catch (error) {
            await errorHandler.handleError({
                error: error as Error,
                context: { content: buffer }
            });
        }
    }

    // ─── State & Metrics ───────────────────────────────────────────────────────

    /**
     * Get current history state
     */
    public getState(): MessageHistoryState {
        return {
            messages: this.messages,
            metadata: {
                totalMessages: this.messages.length,
                totalTokens: this.calculateTotalTokens(),
                lastPruneTime: Date.now()
            }
        };
    }

    /**
     * Get history metrics
     */
    public getMetrics(): MessageHistoryMetrics {
        const messageCount = this.messages.length;
        const tokenCount = this.calculateTotalTokens();
        
        return {
            messageCount,
            tokenCount,
            averageMessageSize: messageCount > 0 ? tokenCount / messageCount : 0,
            pruneCount: 0,
            compressionRatio: this.config.compressionEnabled ? this.calculateCompressionRatio() : undefined,
            loadTimes: { average: 0, max: 0, min: 0 }
        };
    }

    // ─── Private Helper Methods ───────────────────────────────────────────────

    /**
     * Enforce message limits
     */
    private async enforceLimits(): Promise<void> {
        if (this.messages.length > this.config.maxMessages) {
            await this.prune();
        }
    }

    /**
     * Prune message history
     */
    private async prune(): Promise<void> {
        switch (this.config.pruningStrategy) {
            case 'fifo':
                this.messages = this.messages.slice(-this.config.maxMessages);
                break;
            case 'lru':
                // TODO: Implement LRU pruning
                this.messages = this.messages.slice(-this.config.maxMessages);
                break;
            case 'relevance':
                // TODO: Implement relevance-based pruning
                this.messages = this.messages.slice(-this.config.maxMessages);
                break;
            default:
                this.messages = this.messages.slice(-this.config.maxMessages);
        }
        this.log('Message history pruned', 'warn');
    }

    /**
     * Calculate total tokens
     */
    private calculateTotalTokens(): number {
        return this.messages.reduce((total, message) => {
            const content = typeof message.content === 'string' ? message.content : JSON.stringify(message.content);
            return total + Math.ceil(content.length / 4);
        }, 0);
    }

    /**
     * Calculate compression ratio
     */
    private calculateCompressionRatio(): number {
        if (!this.config.compressionEnabled) return 0;
        const rawSize = this.messages.reduce((total, message) => total + JSON.stringify(message).length, 0);
        return rawSize > 0 ? 0.5 : 0; // Placeholder for actual compression
    }

    /**
     * Create metadata for message
     */
    private createMetadata(metadata?: MessageMetadataFields): MessageMetadataFields {
        return {
            messageId: metadata?.messageId || crypto.randomUUID(),
            timestamp: Date.now(),
            ...metadata
        };
    }

    /**
     * Validate message content
     */
    private validateMessageContent(content: string | MessageContent, role: MessageRole): boolean {
        return content !== null && content !== undefined && content !== '';
    }

    /**
     * Validate message
     */
    private validateMessage(message: BaseMessage): boolean {
        return MessageTypeGuards.isBaseMessage(message);
    }

    /**
     * Handle processing error
     */
    private handleProcessingError(error: unknown): MessageProcessResult {
        this.log('Message processing error:', 'error', error as Error);
        return {
            success: false,
            error: error instanceof Error ? error : new Error(String(error))
        };
    }
}

export default MessageManager.getInstance();