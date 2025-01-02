/**
 * @file langchainCacheAdapter.ts
 * @path src/managers/domain/agent/cache/langchainCacheAdapter.ts
 * @description Adapter for integrating Langchain's caching system
 */

import { BaseCache } from '@langchain/core/caches';
import { Generation } from '@langchain/core/outputs';
import { createError, ERROR_KINDS } from '../../../../types/common/errorTypes';

/**
 * In-memory cache implementation for Langchain
 */
class InMemoryCache<T = unknown> extends BaseCache<T> {
    private cache: Map<string, T>;

    constructor() {
        super();
        this.cache = new Map();
    }

    public async lookup(key: string, _llmKey: string): Promise<T | null> {
        return this.cache.get(key) || null;
    }

    public async update(key: string, _llmKey: string, value: T): Promise<void> {
        this.cache.set(key, value);
    }

    public async clear(): Promise<void> {
        this.cache.clear();
    }
}

/**
 * Adapter class using Langchain's InMemoryCache
 */
export class LangchainCacheAdapter extends InMemoryCache<Generation[]> {
    private readonly agentId: string;
    private readonly taskId: string;

    constructor(agentId: string, taskId: string) {
        super();
        this.agentId = agentId;
        this.taskId = taskId;
    }

    /**
     * Lookup value in cache
     */
    public async lookup(prompt: string, llmKey: string): Promise<Generation[] | null> {
        try {
            const cacheKey = this.createCacheKey(prompt, llmKey);
            return await super.lookup(cacheKey, llmKey);
        } catch (error: unknown) {
            throw createError({
                message: 'Cache lookup failed',
                type: ERROR_KINDS.ResourceError,
                context: {
                    prompt,
                    llmKey,
                    error: error instanceof Error ? error : new Error(String(error))
                }
            });
        }
    }

    /**
     * Update cache with new value
     */
    public async update(prompt: string, llmKey: string, value: Generation[]): Promise<void> {
        try {
            const cacheKey = this.createCacheKey(prompt, llmKey);
            await super.update(cacheKey, llmKey, value);
        } catch (error: unknown) {
            throw createError({
                message: 'Cache update failed',
                type: ERROR_KINDS.ResourceError,
                context: {
                    prompt,
                    llmKey,
                    error: error instanceof Error ? error : new Error(String(error))
                }
            });
        }
    }

    /**
     * Create a cache key incorporating agent and task IDs
     */
    private createCacheKey(prompt: string, llmKey: string): string {
        return `${this.agentId}:${this.taskId}:${prompt}:${llmKey}`;
    }
}

/**
 * Create a new Langchain cache adapter instance
 */
export function createLangchainCache(agentId: string, taskId: string): LangchainCacheAdapter {
    return new LangchainCacheAdapter(agentId, taskId);
}
