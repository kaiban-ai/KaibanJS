/**
 * @file cacheInitManager.ts
 * @path src/managers/domain/agent/cache/cacheInitManager.ts
 * @description Manages initialization of caching system for agents
 */

import { CoreManager } from '../../../core/coreManager';
import { createError, ERROR_KINDS } from '../../../../types/common/errorTypes';
import { createLangchainCache } from './langchainCacheAdapter';
import { MANAGER_CATEGORY_enum, AGENT_STATUS_enum } from '../../../../types/common/enumTypes';
import type { IBaseManagerMetadata } from '../../../../types/agent/agentManagerTypes';

/**
 * Manages cache initialization for agents
 */
export class CacheInitManager extends CoreManager {
    private static instance: CacheInitManager;
    private isInitialized = false;
    public readonly category = MANAGER_CATEGORY_enum.RESOURCE;

    private constructor() {
        super();
        this.registerDomainManager('CacheInitManager', this);
    }

    public static getInstance(): CacheInitManager {
        if (!CacheInitManager.instance) {
            CacheInitManager.instance = new CacheInitManager();
        }
        return CacheInitManager.instance;
    }

    /**
     * Initialize the cache system
     */
    public async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            this.isInitialized = true;
            this.logInfo('Cache system initialized');
        } catch (error: unknown) {
            throw createError({
                message: 'Failed to initialize cache system',
                type: ERROR_KINDS.InitializationError,
                context: { 
                    error: error instanceof Error ? error : new Error(String(error))
                }
            });
        }
    }

    /**
     * Validate cache parameters
     */
    public async validate(): Promise<boolean> {
        try {
            // Basic validation - can be enhanced based on needs
            return true;
        } catch (error: unknown) {
            this.logError('Cache validation failed', error instanceof Error ? error : new Error(String(error)));
            return false;
        }
    }

    /**
     * Get manager metadata
     */
    public getMetadata(): IBaseManagerMetadata {
        return {
            category: this.category,
            operation: 'cache',
            duration: 0,
            status: 'success',
            agent: {
                id: '',
                name: '',
                role: '',
                status: AGENT_STATUS_enum.IDLE
            },
            timestamp: Date.now(),
            component: this.constructor.name
        };
    }

    /**
     * Create a Langchain cache adapter for a specific agent/task pair
     */
    public createLangchainCacheAdapter(agentId: string, taskId: string) {
        if (!this.isInitialized) {
            throw createError({
                message: 'Cache system not initialized',
                type: ERROR_KINDS.InitializationError
            });
        }

        try {
            return createLangchainCache(agentId, taskId);
        } catch (error: unknown) {
            throw createError({
                message: 'Failed to create Langchain cache adapter',
                type: ERROR_KINDS.ResourceError,
                context: {
                    agentId,
                    taskId,
                    error: error instanceof Error ? error : new Error(String(error))
                }
            });
        }
    }
}

export default CacheInitManager.getInstance();
