/**
 * @file history.ts
 * @path src/utils/types/messaging/history.ts
 */

import { BaseMessage, SystemMessage, HumanMessage, AIMessage, FunctionMessage } from "@langchain/core/messages";

// Message History Configuration
export interface MessageHistoryConfig {
    maxMessages?: number;
    maxTokens?: number;
    pruningStrategy?: 'fifo' | 'lru' | 'relevance';
    retentionPeriod?: number;
    persistenceEnabled?: boolean;
    compressionEnabled?: boolean;
}

// Core Message History Interface
export interface IMessageHistory {
    addMessage(message: BaseMessage): Promise<void>;
    getMessages(): Promise<BaseMessage[]>;
    clear(): Promise<void>;
    readonly length: number;
    addUserMessage(message: string): Promise<void>;
    addAIMessage(message: string): Promise<void>;
    addSystemMessage(message: string): Promise<void>;
    addFunctionMessage(name: string, content: string): Promise<void>;
}

// Message History State
export interface MessageHistoryState {
    messages: BaseMessage[];
    metadata: {
        totalMessages: number;
        totalTokens: number;
        lastPruneTime?: number;
        lastSaveTime?: number;
    };
}

// Message History Metrics
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

// Type Guards for Message Types
export const MessageTypeGuards = {
    isSystemMessage: (message: unknown): message is SystemMessage =>
        message instanceof SystemMessage,

    isHumanMessage: (message: unknown): message is HumanMessage =>
        message instanceof HumanMessage,

    isAIMessage: (message: unknown): message is AIMessage =>
        message instanceof AIMessage,

    isFunctionMessage: (message: unknown): message is FunctionMessage =>
        message instanceof FunctionMessage
};
