/**
 * @file llmResourceManager.ts
 * @path src/managers/domain/llm/llmResourceManager.ts
 * @description Manages LLM resource lifecycle and cleanup
 */

import { CoreManager } from '../../core/coreManager';
import { createBaseMetadata } from '../../../types/common/baseTypes';
import { MANAGER_CATEGORY_enum, LLM_STATUS_enum } from '../../../types/common/enumTypes';

import type { ILLMInstance } from '../../../types/llm/llmInstanceTypes';
import type { IHandlerResult } from '../../../types/common/baseTypes';
import type { IStatusTransitionContext, IStatusEntity } from '../../../types/common/statusTypes';
import type { ILLMResourceMetrics } from '../../../types/llm/llmMetricTypes';

/**
 * Manages LLM resource lifecycle and cleanup
 */
export class LLMResourceManager extends CoreManager {
    private static instance: LLMResourceManager | null = null;
    private readonly activeResources: Map<string, ILLMResourceMetrics>;

    private constructor() {
        super();
        this.activeResources = new Map();
    }

    public static getInstance(): LLMResourceManager {
        if (!LLMResourceManager.instance) {
            LLMResourceManager.instance = new LLMResourceManager();
        }
        return LLMResourceManager.instance;
    }

    /**
     * Create LLM resource metrics
     */
    public readonly category = MANAGER_CATEGORY_enum.RESOURCE;

    private async createLLMResourceMetrics(): Promise<ILLMResourceMetrics> {
        const processMetrics = {
            cpuUsage: process.cpuUsage().user / 1000000, // Convert to seconds
            memoryUsage: process.memoryUsage().heapUsed,
            diskIO: {
                read: 0,
                write: 0
            },
            networkUsage: {
                upload: 0,
                download: 0
            },
            timestamp: Date.now()
        };

        return {
            ...processMetrics,
            gpuMemoryUsage: 0,
            modelMemoryAllocation: {
                weights: 0,
                cache: 0,
                workspace: 0
            },
            timestamp: Date.now()
        };
    }

    /**
     * Track resource usage for an LLM instance
     */
    public async trackResources(instance: ILLMInstance): Promise<IHandlerResult<ILLMResourceMetrics>> {
        return await this.safeExecute(async () => {
            const resourceMetrics = await this.createLLMResourceMetrics();
            this.activeResources.set(instance.id, resourceMetrics);
            return resourceMetrics;
        }, 'Resource tracking');
    }

    /**
     * Release resources for an LLM instance
     */
    public async releaseResources(instance: ILLMInstance): Promise<IHandlerResult<void>> {
        return await this.safeExecute(async () => {
            // Update instance status
            await this.updateInstanceStatus(instance, LLM_STATUS_enum.CLEANING_UP);

            try {
                // Release provider-specific resources
                const llmManager = this.getDomainManager<any>('llm');
                await llmManager.releaseProviderResources(instance);

                // Clear resource tracking
                this.activeResources.delete(instance.id);

                // Update final status
                await this.updateInstanceStatus(instance, LLM_STATUS_enum.CLEANED_UP);
            } catch (error) {
                this.logError('Failed to release resources', error instanceof Error ? error : new Error(String(error)));
                await this.updateInstanceStatus(instance, LLM_STATUS_enum.ERROR);
                throw error;
            }
        }, 'Resource release');
    }

    /**
     * Get current resource metrics for an instance
     */
    public getResourceMetrics(instanceId: string): ILLMResourceMetrics | undefined {
        return this.activeResources.get(instanceId);
    }

    /**
     * Update instance status with proper transition
     */
    private async updateInstanceStatus(instance: ILLMInstance, targetStatus: LLM_STATUS_enum): Promise<void> {
        const startTime = Date.now();
        const statusTransition: IStatusTransitionContext = {
            entity: 'llm' as IStatusEntity,
            entityId: instance.id,
            currentStatus: instance.status,
            targetStatus,
            operation: 'llm_resource_management',
            phase: 'status_transition',
            startTime,
            duration: Date.now() - startTime,
            metadata: createBaseMetadata('LLMResourceManager', 'updateInstanceStatus'),
            context: {
                provider: instance.provider,
                model: instance.config.model,
                component: 'LLMResourceManager',
                phase: 'status_transition'
            }
        };

        await this.handleStatusTransition(statusTransition);
        instance.status = targetStatus;
    }

    /**
     * Check if resources are being tracked for an instance
     */
    public hasActiveResources(instanceId: string): boolean {
        return this.activeResources.has(instanceId);
    }

    /**
     * Get all instance IDs with active resources
     */
    public getActiveResourceIds(): string[] {
        return Array.from(this.activeResources.keys());
    }

    /**
     * Clean up all resources
     */
    public async cleanupAllResources(): Promise<IHandlerResult<void>> {
        return await this.safeExecute(async () => {
            const llmManager = this.getDomainManager<any>('llm');
            const instances = await llmManager.getAllInstances();

            for (const instance of instances) {
                try {
                    await this.releaseResources(instance);
                } catch (error) {
                    this.logError(`Failed to cleanup resources for instance ${instance.id}`, error instanceof Error ? error : new Error(String(error)));
                }
            }
        }, 'Cleanup all resources');
    }
}

export default LLMResourceManager;
