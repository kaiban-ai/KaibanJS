/**
 * @file commonMemory.ts
 * @path KaibanJS\src\types\common\commonMemory.ts
 * @description Type definitions for memory metrics
 * 
 * @module @types/common
 */

export interface IMemoryMetrics {
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