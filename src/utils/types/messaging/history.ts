/**
 * @file history.ts
 * @path src/utils/types/messaging/history.ts
 * @description Type definitions for message history management
 */

import { 
    BaseMessage, 
    SystemMessage, 
    HumanMessage, 
    AIMessage, 
    FunctionMessage 
} from "@langchain/core/messages";

/**
 * Configuration options for message history
 */
export interface MessageHistoryConfig {
    /** Maximum number of messages to retain */
    maxMessages?: number;
    
    /** Maximum tokens to retain */
    maxTokens?: number;
    
    /** Strategy for pruning messages */
    pruningStrategy?: 'fifo' | 'lru' | 'relevance';
    
    /** Retention period in milliseconds */
    retentionPeriod?: number;
    
    /** Whether to enable persistence */
    persistenceEnabled?: boolean;
    
    /** Whether to enable compression */
    compressionEnabled?: boolean;
}

/**
 * Core message history interface
 */
export interface IMessageHistory {
    /**
     * Add a message to the history
     */
    addMessage(message: BaseMessage): Promise<void>;

    /**
     * Retrieve all messages
     */
    getMessages(): Promise<BaseMessage[]>;

    /**
     * Clear the message history
     */
    clear(): Promise<void>;

    /**
     * Current number of messages
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
 * Message history state interface
 */
export interface MessageHistoryState {
    /** List of messages */
    messages: BaseMessage[];
    
    /** History metadata */
    metadata: {
        totalMessages: number;
        totalTokens: number;
        lastPruneTime?: number;
        lastSaveTime?: number;
    };
}

/**
 * Message history metrics interface
 */
export interface MessageHistoryMetrics {
    /** Message count */
    messageCount: number;
    
    /** Token count */
    tokenCount: number;
    
    /** Average message size */
    averageMessageSize: number;
    
    /** Number of prunes */
    pruneCount: number;
    
    /** Compression ratio */
    compressionRatio?: number;
    
    /** Load time metrics */
    loadTimes: {
        average: number;
        max: number;
        min: number;
    };
}

/**
 * Type guards for message types
 */
export const MessageTypeGuards = {
    /**
     * Check if value is a system message
     */
    isSystemMessage: (message: unknown): message is SystemMessage => {
        return message instanceof SystemMessage;
    },

    /**
     * Check if value is a human message
     */
    isHumanMessage: (message: unknown): message is HumanMessage => {
        return message instanceof HumanMessage;
    },

    /**
     * Check if value is an AI message
     */
    isAIMessage: (message: unknown): message is AIMessage => {
        return message instanceof AIMessage;
    },

    /**
     * Check if value is a function message
     */
    isFunctionMessage: (message: unknown): message is FunctionMessage => {
        return message instanceof FunctionMessage;
    }
};