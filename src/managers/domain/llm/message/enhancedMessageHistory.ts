/**
 * @file enhancedMessageHistory.ts
 * @path src/managers/domain/llm/message/enhancedMessageHistory.ts
 * @description Enhanced message history implementation using Langchain's ChatMessageHistory
 */

import { ChatMessageHistory } from 'langchain/memory';
import { BaseMessage, SystemMessage, HumanMessage, AIMessage, FunctionMessage } from '@langchain/core/messages';
import { CoreManager } from '../../../core/coreManager';
import { createError } from '../../../../types/common/commonErrorTypes';
import { createBaseMetadata } from '../../../../types/common/commonMetadataTypes';

import type { 
    IMessageHistory, 
    IMessageHistoryConfig, 
    IMessageHistoryState,
    IMessageHistoryMetrics 
} from '../../../../types/llm/message/messagingHistoryTypes';

/**
 * Enhanced message history implementation
 */
export class EnhancedMessageHistory extends CoreManager implements IMessageHistory {
    private readonly history: ChatMessageHistory;
    private readonly config: Required<IMessageHistoryConfig>;
    private state: IMessageHistoryState;
    private metrics: IMessageHistoryMetrics;

    constructor(config?: IMessageHistoryConfig) {
        super();
        this.history = new ChatMessageHistory();
        this.config = this.normalizeConfig(config);
        this.state = this.initializeState();
        this.metrics = this.initializeMetrics();
    }

    /**
     * Normalize configuration with defaults
     */
    private normalizeConfig(config?: IMessageHistoryConfig): Required<IMessageHistoryConfig> {
        return {
            maxMessages: config?.maxMessages ?? 1000,
            maxTokens: config?.maxTokens ?? 8000,
            pruningStrategy: config?.pruningStrategy ?? 'fifo',
            retentionPeriod: config?.retentionPeriod ?? 24 * 60 * 60 * 1000, // 24 hours
            persistenceEnabled: config?.persistenceEnabled ?? false,
            compressionEnabled: config?.compressionEnabled ?? false
        };
    }

    /**
     * Initialize message history state
     */
    private initializeState(): IMessageHistoryState {
        return {
            messages: [],
            metadata: {
                totalMessages: 0,
                totalTokens: 0
            }
        };
    }

    /**
     * Initialize message history metrics
     */
    private initializeMetrics(): IMessageHistoryMetrics {
        return {
            messageCount: 0,
            tokenCount: 0,
            averageMessageSize: 0,
            pruneCount: 0,
            loadTimes: {
                average: 0,
                max: 0,
                min: Number.MAX_VALUE
            }
        };
    }

    /**
     * Add a message to history
     */
    public async addMessage(message: BaseMessage): Promise<void> {
        const result = await this.safeExecute(async () => {
            const startTime = Date.now();

            // Add message to Langchain history
            await this.history.addMessage(message);

            // Update our state and metrics
            this.state.messages.push(message);
            this.state.metadata.totalMessages++;
            this.updateMetrics(message, startTime);

            // Check if pruning is needed
            await this.checkAndPrune();

            // Persist if enabled
            if (this.config.persistenceEnabled) {
                await this.persist();
            }
        }, 'Failed to add message to history');

        if (!result.success) {
            throw result.error;
        }
    }

    /**
     * Get all messages from history
     */
    public async getMessages(): Promise<BaseMessage[]> {
        const result = await this.safeExecute(async () => {
            const startTime = Date.now();
            const messages = await this.history.getMessages();
            this.updateLoadMetrics(startTime);
            return messages;
        }, 'Failed to get messages from history');

        if (!result.success || !result.data) {
            throw createError({
                message: 'Failed to get messages from history',
                type: 'StateError',
                context: {
                    component: this.constructor.name,
                    error: result.error
                }
            });
        }

        return result.data;
    }

    /**
     * Clear message history
     */
    public async clear(): Promise<void> {
        const result = await this.safeExecute(async () => {
            await this.history.clear();
            this.state = this.initializeState();
            this.metrics = this.initializeMetrics();
            if (this.config.persistenceEnabled) {
                await this.persist();
            }
        }, 'Failed to clear message history');

        if (!result.success) {
            throw result.error;
        }
    }

    /**
     * Get number of messages in history
     */
    public get length(): number {
        return this.state.messages.length;
    }

    /**
     * Add a user message
     */
    public async addUserMessage(message: string): Promise<void> {
        await this.addMessage(new HumanMessage(message));
    }

    /**
     * Add an AI message
     */
    public async addAIMessage(message: string): Promise<void> {
        await this.addMessage(new AIMessage(message));
    }

    /**
     * Add a system message
     */
    public async addSystemMessage(message: string): Promise<void> {
        await this.addMessage(new SystemMessage(message));
    }

    /**
     * Add a function message
     */
    public async addFunctionMessage(name: string, content: string): Promise<void> {
        await this.addMessage(new FunctionMessage(content, name));
    }

    /**
     * Update metrics with new message
     */
    private updateMetrics(message: BaseMessage, startTime: number): void {
        const duration = Date.now() - startTime;
        const messageSize = message.content.length;

        this.metrics.messageCount++;
        this.metrics.tokenCount += Math.ceil(messageSize / 4); // Rough token estimate
        this.metrics.averageMessageSize = (
            (this.metrics.averageMessageSize * (this.metrics.messageCount - 1) + messageSize) / 
            this.metrics.messageCount
        );

        this.metrics.loadTimes.average = (
            (this.metrics.loadTimes.average * (this.metrics.messageCount - 1) + duration) / 
            this.metrics.messageCount
        );
        this.metrics.loadTimes.max = Math.max(this.metrics.loadTimes.max, duration);
        this.metrics.loadTimes.min = Math.min(this.metrics.loadTimes.min, duration);
    }

    /**
     * Update load time metrics
     */
    private updateLoadMetrics(startTime: number): void {
        const duration = Date.now() - startTime;
        this.metrics.loadTimes.average = (
            (this.metrics.loadTimes.average * this.metrics.messageCount + duration) / 
            (this.metrics.messageCount + 1)
        );
        this.metrics.loadTimes.max = Math.max(this.metrics.loadTimes.max, duration);
        this.metrics.loadTimes.min = Math.min(this.metrics.loadTimes.min, duration);
    }

    /**
     * Check if pruning is needed and perform if necessary
     */
    private async checkAndPrune(): Promise<void> {
        const needsPruning = 
            this.state.messages.length > this.config.maxMessages ||
            this.metrics.tokenCount > this.config.maxTokens;

        if (needsPruning) {
            await this.prune();
        }
    }

    /**
     * Prune messages based on strategy
     */
    private async prune(): Promise<void> {
        const result = await this.safeExecute(async () => {
            const startTime = Date.now();
            let prunedMessages: BaseMessage[] = [];

            switch (this.config.pruningStrategy) {
                case 'fifo':
                    // Keep most recent messages
                    prunedMessages = this.state.messages.slice(-this.config.maxMessages);
                    break;

                case 'lru':
                    // Keep most relevant messages based on recency and usage
                    // TODO: Implement LRU strategy
                    prunedMessages = this.state.messages.slice(-this.config.maxMessages);
                    break;

                case 'relevance':
                    // Keep most relevant messages based on content similarity
                    // TODO: Implement relevance-based strategy
                    prunedMessages = this.state.messages.slice(-this.config.maxMessages);
                    break;

                default:
                    throw createError({
                        message: `Invalid pruning strategy: ${this.config.pruningStrategy}`,
                        type: 'ValidationError',
                        context: {
                            component: this.constructor.name,
                            strategy: this.config.pruningStrategy
                        }
                    });
            }

            // Update state and metrics
            await this.history.clear();
            for (const message of prunedMessages) {
                await this.history.addMessage(message);
            }

            this.state.messages = prunedMessages;
            this.state.metadata.totalMessages = prunedMessages.length;
            this.state.metadata.lastPruneTime = startTime;
            this.metrics.pruneCount++;

            if (this.config.persistenceEnabled) {
                await this.persist();
            }
        }, 'Failed to prune message history');

        if (!result.success) {
            throw result.error;
        }
    }

    /**
     * Persist message history if enabled
     */
    private async persist(): Promise<void> {
        const result = await this.safeExecute(async () => {
            // TODO: Implement persistence strategy
            this.state.metadata.lastSaveTime = Date.now();
        }, 'Failed to persist message history');

        if (!result.success) {
            throw result.error;
        }
    }

    /**
     * Get current message history state
     */
    public getState(): IMessageHistoryState {
        return this.state;
    }

    /**
     * Get message history metrics
     */
    public getMetrics(): IMessageHistoryMetrics {
        return this.metrics;
    }
}

export default EnhancedMessageHistory;
