/**
 * @file MessageHistoryManager.ts
 * @path KaibanJS/src/utils/managers/message/MessageHistoryManager.ts
 * @description Manages message history with pruning, persistence, and metrics tracking.
 */

import CoreManager from '../../core/CoreManager';
import { BaseMessage, HumanMessage, AIMessage, SystemMessage, FunctionMessage } from "@langchain/core/messages";
import type { IMessageHistory, MessageHistoryConfig, MessageHistoryState, MessageHistoryMetrics } from '@/utils/types/messaging';
import { MessageTypeGuards } from '@/utils/types/messaging/history';

export class MessageHistoryManager extends CoreManager implements IMessageHistory {
    private messages: BaseMessage[] = [];
    private config: Required<MessageHistoryConfig>;

    constructor(config: MessageHistoryConfig = {}) {
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

    // Adds a message to the history with type validation and pruning
    public async addMessage(message: BaseMessage): Promise<void> {
        if (MessageTypeGuards.isSystemMessage(message)) {
            this.log("Adding a SystemMessage", 'info');
        } else if (MessageTypeGuards.isHumanMessage(message)) {
            this.log("Adding a HumanMessage", 'info');
        } else if (MessageTypeGuards.isAIMessage(message)) {
            this.log("Adding an AIMessage", 'info');
        } else if (MessageTypeGuards.isFunctionMessage(message)) {
            this.log("Adding a FunctionMessage", 'info');
        } else {
            this.log("Invalid message type provided", 'error');
            throw new Error("Invalid message type");
        }

        this.messages.push(message);

        if (this.messages.length > this.config.maxMessages) {
            this.prune();
        }
    }

    // Retrieves all messages in history
    public async getMessages(): Promise<BaseMessage[]> {
        return this.messages;
    }

    // Clears the message history
    public async clear(): Promise<void> {
        this.messages = [];
    }

    // Retrieves the current number of messages
    public get length(): number {
        return this.messages.length;
    }

    // Adds a specific type of message to history
    public async addUserMessage(content: string): Promise<void> {
        await this.addMessage(new HumanMessage(content));
    }

    public async addAIMessage(content: string): Promise<void> {
        await this.addMessage(new AIMessage(content));
    }

    public async addSystemMessage(content: string): Promise<void> {
        await this.addMessage(new SystemMessage(content));
    }

    public async addFunctionMessage(name: string, content: string): Promise<void> {
        await this.addMessage(new FunctionMessage(content, name));
    }

    // Retrieves the current state of message history
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

    // Retrieves message history metrics
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

    // Prunes messages based on the configured strategy
    private prune(): void {
        this.log(`Pruning messages using ${this.config.pruningStrategy} strategy`, 'warn');
        switch (this.config.pruningStrategy) {
            case 'fifo':
                this.messages = this.messages.slice(-this.config.maxMessages);
                break;
            case 'lru':
                this.log("LRU pruning not implemented, using FIFO", 'warn');
                this.messages = this.messages.slice(-this.config.maxMessages);
                break;
            case 'relevance':
                this.log("Relevance pruning not implemented, using FIFO", 'warn');
                this.messages = this.messages.slice(-this.config.maxMessages);
                break;
            default:
                this.log("Unknown pruning strategy, using FIFO", 'warn');
                this.messages = this.messages.slice(-this.config.maxMessages);
        }
    }

    // Calculates total tokens in message history
    private calculateTotalTokens(): number {
        return this.messages.reduce((total, message) => {
            const content = typeof message.content === 'string' ? message.content : JSON.stringify(message.content);
            return total + Math.ceil(content.length / 4);
        }, 0);
    }

    // Calculates compression ratio if enabled
    private calculateCompressionRatio(): number {
        if (!this.config.compressionEnabled) return 0;
        const uncompressedSize = this.messages.reduce((total, message) => total + JSON.stringify(message).length, 0);
        return uncompressedSize > 0 ? 0.5 : 0; // Placeholder ratio
    }
}

export default MessageHistoryManager;
