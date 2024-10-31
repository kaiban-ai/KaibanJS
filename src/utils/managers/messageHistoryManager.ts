/**
 * @file messageHistoryManager.ts
 * @path src/utils/managers/messageHistoryManager.ts
 * @description Message history management implementation
 */

import { BaseMessage, HumanMessage, AIMessage, SystemMessage, FunctionMessage, ChatMessage } from "@langchain/core/messages";
import { BaseListChatMessageHistory } from "@langchain/core/chat_history";
import { IMessageHistory, MessageHistoryConfig, MessageTypeGuards } from "../types/messaging/history";
import { logger } from "../core/logger";

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

    async addMessage(message: BaseMessage): Promise<void> {
        if (!MessageTypeGuards.isBaseMessage(message)) {
            logger.error("Invalid message type provided");
            throw new Error("Invalid message type");
        }

        this.messages.push(message);
        
        // Apply pruning if needed
        if (this.messages.length > this.config.maxMessages) {
            this.prune();
        }
    }

    async getMessages(): Promise<BaseMessage[]> {
        return this.messages;
    }

    async clear(): Promise<void> {
        this.messages = [];
    }

    get length(): number {
        return this.messages.length;
    }

    async addUserMessage(message: string): Promise<void> {
        await this.addMessage(new HumanMessage(message));
    }

    async addAIMessage(message: string): Promise<void> {
        await this.addMessage(new AIMessage(message));
    }

    async addSystemMessage(message: string): Promise<void> {
        await this.addMessage(new SystemMessage(message));
    }

    async addFunctionMessage(name: string, content: string): Promise<void> {
        await this.addMessage(new FunctionMessage(content, name));
    }

    private prune(): void {
        switch (this.config.pruningStrategy) {
            case 'fifo':
                this.messages = this.messages.slice(-this.config.maxMessages);
                break;
            case 'lru':
                // Implement LRU pruning if needed
                logger.warn("LRU pruning not implemented yet");
                break;
            case 'relevance':
                // Implement relevance-based pruning if needed
                logger.warn("Relevance pruning not implemented yet");
                break;
            default:
                logger.warn("Unknown pruning strategy, falling back to FIFO");
                this.messages = this.messages.slice(-this.config.maxMessages);
        }
    }
}

// Export a default instance for backwards compatibility
export default MessageHistoryManager;