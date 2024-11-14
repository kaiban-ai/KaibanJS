/**
 * @file memory.ts
 * @path KaibanJS/src/utils/types/common/memory.ts
 * @description Type definitions for memory metrics
 */

export interface MemoryMetrics {
    totalMessages: number;
    totalTokens: number;
    memoryUsage: number;
    lastCleanup?: {
        timestamp: number;
        messagesRemoved: number;
        tokensFreed: number;
    };
    modelSpecificStats?: {
        [model: string]: {
            messageCount: number;
            tokenCount: number;
            averageTokensPerMessage: number;
        };
    };
}