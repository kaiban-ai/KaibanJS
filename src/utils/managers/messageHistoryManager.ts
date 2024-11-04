/**
 * @file messageHistoryManager.ts
 * @path src/utils/managers/messageHistoryManager.ts
 * @description Implementation of message history management
 */

import { 
    BaseMessage, 
    HumanMessage, 
    AIMessage, 
    SystemMessage, 
    FunctionMessage 
} from "@langchain/core/messages";

import { BaseListChatMessageHistory } from "@langchain/core/chat_history";
import { logger } from "../core/logger";

import type {
    IMessageHistory,
    MessageHistoryConfig,
    MessageHistoryState,
    MessageHistoryMetrics,
} from '@/utils/types/messaging';
import { MessageTypeGuards } from '@/utils/types/messaging/history';

/**
 * Manages message history with support for pruning, persistence, and metrics
 */
export class MessageHistoryManager extends BaseListChatMessageHistory implements IMessageHistory {
    private messages: BaseMessage[];
    private config: Required<MessageHistoryConfig>;
    public lc_namespace: string[] = ["langchain", "memory", "message_history"];

    constructor(config: MessageHistoryConfig = {}) {
        super();
        this.messages = [];
        this.config = {
            maxMessages: config.maxMessages ?? 1000,
            maxTokens: config.maxTokens ?? 8192,
            pruningStrategy: config.pruningStrategy ?? 'fifo',
            retentionPeriod: config.retentionPeriod ?? 24 * 60 * 60 * 1000, // 24 hours
            persistenceEnabled: config.persistenceEnabled ?? false,
            compressionEnabled: config.compressionEnabled ?? false
        };
    }

    /**
     * Add a message to the history
     */
    async addMessage(message: BaseMessage): Promise<void> {
        switch (true) {
            case MessageTypeGuards.isSystemMessage(message):
                logger.info("Adding a SystemMessage");
                this.messages.push(message);
                break;

            case MessageTypeGuards.isHumanMessage(message):
                logger.info("Adding a HumanMessage");
                this.messages.push(message);
                break;

            case MessageTypeGuards.isAIMessage(message):
                logger.info("Adding an AIMessage");
                this.messages.push(message);
                break;

            case MessageTypeGuards.isFunctionMessage(message):
                logger.info("Adding a FunctionMessage");
                this.messages.push(message);
                break;

            default:
                logger.error("Invalid message type provided");
                throw new Error("Invalid message type");
        }

        // Apply pruning if needed
        if (this.messages.length > this.config.maxMessages) {
            this.prune();
        }
    }

    /**
     * Get all messages in history
     */
    async getMessages(): Promise<BaseMessage[]> {
        return this.messages;
    }

    /**
     * Clear message history
     */
    async clear(): Promise<void> {
        this.messages = [];
    }

    /**
     * Get current number of messages
     */
    get length(): number {
        return this.messages.length;
    }

    /**
     * Add a user message to history
     */
    async addUserMessage(message: string): Promise<void> {
        await this.addMessage(new HumanMessage(message));
    }

    /**
     * Add an AI message to history
     */
    async addAIMessage(message: string): Promise<void> {
        await this.addMessage(new AIMessage(message));
    }

    /**
     * Add a system message to history
     */
    async addSystemMessage(message: string): Promise<void> {
        await this.addMessage(new SystemMessage(message));
    }

    /**
     * Add a function message to history
     */
    async addFunctionMessage(name: string, content: string): Promise<void> {
        await this.addMessage(new FunctionMessage(content, name));
    }

    /**
     * Get the current state of message history
     */
    getState(): MessageHistoryState {
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
     * Get message history metrics
     */
    getMetrics(): MessageHistoryMetrics {
        const metrics = {
            messageCount: this.messages.length,
            tokenCount: this.calculateTotalTokens(),
            averageMessageSize: 0,
            pruneCount: 0,
            compressionRatio: this.config.compressionEnabled ? this.calculateCompressionRatio() : undefined,
            loadTimes: {
                average: 0,
                max: 0,
                min: 0
            }
        };

        if (metrics.messageCount > 0) {
            metrics.averageMessageSize = metrics.tokenCount / metrics.messageCount;
        }

        return metrics;
    }

    /**
     * Prune messages based on configured strategy
     */
    private prune(): void {
        switch (this.config.pruningStrategy) {
            case 'fifo':
                this.messages = this.messages.slice(-this.config.maxMessages);
                break;
            case 'lru':
                logger.warn("LRU pruning not implemented yet, falling back to FIFO");
                this.messages = this.messages.slice(-this.config.maxMessages);
                break;
            case 'relevance':
                logger.warn("Relevance pruning not implemented yet, falling back to FIFO");
                this.messages = this.messages.slice(-this.config.maxMessages);
                break;
            default:
                logger.warn("Unknown pruning strategy, falling back to FIFO");
                this.messages = this.messages.slice(-this.config.maxMessages);
        }
    }

    /**
     * Calculate total tokens in message history
     * Note: This is a rough estimation
     */
    private calculateTotalTokens(): number {
        return this.messages.reduce((total, message) => {
            // Rough estimation: 1 token ≈ 4 characters
            const content = typeof message.content === 'string' 
                ? message.content 
                : JSON.stringify(message.content);
            return total + Math.ceil(content.length / 4);
        }, 0);
    }

    /**
     * Calculate compression ratio if compression is enabled
     */
    private calculateCompressionRatio(): number {
        if (!this.config.compressionEnabled) return 0;

        const uncompressedSize = this.messages.reduce((total, message) => {
            return total + JSON.stringify(message).length;
        }, 0);

        // This is a placeholder for actual compression ratio calculation
        // In a real implementation, you would compare with the compressed size
        return uncompressedSize > 0 ? 0.5 : 0; // Placeholder ratio
    }
}

// Export default instance
export default MessageHistoryManager;
