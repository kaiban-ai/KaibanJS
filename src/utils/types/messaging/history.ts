/**
 * @file history.ts
 * @path src/utils/types/messaging/history.ts
 * @description Message history types and interfaces
 *
 * @packageDocumentation
 * @module @types/messaging
 */

import { BaseMessage, SystemMessage, HumanMessage, AIMessage, FunctionMessage, ChatMessage } from "@langchain/core/messages";
import { LLMUsageStats } from "../llm/responses";
import { CostDetails } from "../workflow/stats";

/**
 * Message history configuration options
 */
export interface MessageHistoryConfig {
    maxMessages?: number;
    maxTokens?: number;
    pruningStrategy?: 'fifo' | 'lru' | 'relevance';
    retentionPeriod?: number;
    persistenceEnabled?: boolean;
    compressionEnabled?: boolean;
}

/**
 * Message history interface
 */
export interface IMessageHistory {
    /**
     * Add a message to history
     */
    addMessage(message: BaseMessage): Promise<void>;

    /**
     * Get all messages
     */
    getMessages(): Promise<BaseMessage[]>;

    /**
     * Clear all messages
     */
    clear(): Promise<void>;

    /**
     * Current message count
     */
    readonly length: number;

    /**
     * Add a user message
     */
    addUserMessage(message: string): Promise<void>;

    /**
     * Add an AI message
     */
    addAIMessage(message: string): Promise<void>;

    /**
     * Add a system message
     */
    addSystemMessage(message: string): Promise<void>;

    /**
     * Add a function message
     */
    addFunctionMessage(name: string, content: string): Promise<void>;
}

/**
 * Message history state
 */
export interface MessageHistoryState {
    messages: BaseMessage[];
    metadata: {
        totalMessages: number;
        totalTokens: number;
        lastPruneTime?: number;
        lastSaveTime?: number;
    };
}

/**
 * Message history metrics
 */
export interface MessageHistoryMetrics {
    messageCount: number;
    tokenCount: number;
    averageMessageSize: number;
    pruneCount: number;
    compressionRatio?: number;
    loadTimes: {
        average: number;
        max: number;
        min: number;
    };
}

/**
 * Message type guards
 */
export const MessageTypeGuards = {
    isBaseMessage: (message: unknown): message is BaseMessage => {
        return message instanceof BaseMessage;
    },
    isSystemMessage: (message: unknown): message is SystemMessage => {
        return message instanceof SystemMessage;
    },
    isHumanMessage: (message: unknown): message is HumanMessage => {
        return message instanceof HumanMessage;
    },
    isAIMessage: (message: unknown): message is AIMessage => {
        return message instanceof AIMessage;
    },
    isFunctionMessage: (message: unknown): message is FunctionMessage => {
        return message instanceof FunctionMessage;
    },
    isChatMessage: (message: unknown): message is ChatMessage => {
        return message instanceof ChatMessage;
    }
};