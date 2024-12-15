/**
 * @file poolManager.ts
 * @path src/managers/domain/agent/pool/poolManager.ts
 * @description Manages resource pools for efficient resource allocation
 */

import { MetricsManager } from '../../../core/metricsManager';
import { createError, ERROR_KINDS } from '../../../../types/common/commonErrorTypes';
import {
    IResource,
    IPoolMetrics,
    IPoolConfig,
    IHealthCheckResult,
    RESOURCE_TYPE_enum,
    RESOURCE_STATUS_enum,
    DEFAULT_POOL_CONFIG
} from '../../../../types/agent/';

/**
 * Manages resource pools and allocation
 */
export class PoolManager {
    private static instance: PoolManager;
    private readonly metricsManager: MetricsManager;
    private readonly resourcePools: Map<RESOURCE_TYPE_enum, IResource[]>;
    private readonly metrics: IPoolMetrics;
    private readonly config: IPoolConfig;
    private healthCheckInterval: NodeJS.Timeout | null;

    private constructor() {
        this.metricsManager = MetricsManager.getInstance();
        this.resourcePools = new Map();
        this.config = { ...DEFAULT_POOL_CONFIG };
        this.metrics = this.createInitialMetrics();
        this.healthCheckInterval = null;

        // Initialize pools for each resource type
        for (const type of Object.values(RESOURCE_TYPE_enum)) {
            this.resourcePools.set(type, []);
        }

        this.startHealthChecks();
    }

    public static getInstance(): PoolManager {
        if (!PoolManager.instance) {
            PoolManager.instance = new PoolManager();
        }
        return PoolManager.instance;
    }

    /**
     * Acquire a resource from the pool
     */
    public async acquireResource(
        type: RESOURCE_TYPE_enum,
        capabilities: string[] = []
    ): Promise<IResource> {
        const pool = this.resourcePools.get(type);
        if (!pool) {
            throw createError({
                message: `Invalid resource type: ${type}`,
                type: ERROR_KINDS.ValidationError
            });
        }

        // Find available resource with required capabilities
        let resource = pool.find(r => 
            r.status === RESOURCE_STATUS_enum.AVAILABLE &&
            capabilities.every(cap => r.capabilities.includes(cap))
        );

        // If no resource available, try to scale up
        if (!resource) {
            await this.scalePool(type, 'up');
            resource = pool.find(r => 
                r.status === RESOURCE_STATUS_enum.AVAILABLE &&
                capabilities.every(cap => r.capabilities.includes(cap))
            );
        }

        if (!resource) {
            throw createError({
                message: `No available resources of type: ${type}`,
                type: ERROR_KINDS.ResourceError
            });
        }

        resource.status = RESOURCE_STATUS_enum.BUSY;
        resource.lastUsed = Date.now();
        resource.usageCount++;

        this.updateMetrics();
        return resource;
    }

    /**
     * Release a resource back to the pool
     */
    public async releaseResource(resource: IResource): Promise<void> {
        const pool = this.resourcePools.get(resource.type);
        if (!pool) {
            throw createError({
                message: `Invalid resource type: ${resource.type}`,
                type: ERROR_KINDS.ValidationError
            });
        }

        const existingResource = pool.find(r => r.id === resource.id);
        if (!existingResource) {
            throw createError({
                message: `Resource not found: ${resource.id}`,
                type: ERROR_KINDS.NotFoundError
            });
        }

        // Check resource health before making available
        const health = await existingResource.healthCheck();
        existingResource.status = health.status === RESOURCE_STATUS_enum.ERROR
            ? RESOURCE_STATUS_enum.ERROR
            : RESOURCE_STATUS_enum.AVAILABLE;

        this.updateMetrics();

        // Check if we should scale down
        await this.scalePool(resource.type, 'down');
    }

    /**
     * Get current pool metrics
     */
    public getMetrics(): IPoolMetrics {
        return { ...this.metrics };
    }

    /**
     * Update pool configuration
     */
    public updateConfig(config: Partial<IPoolConfig>): void {
        Object.assign(this.config, config);
        this.restartHealthChecks();
    }

    /**
     * Create initial metrics object
     */
    private createInitialMetrics(): IPoolMetrics {
        const resourceMetrics = Object.values(RESOURCE_TYPE_enum).reduce((acc, type) => ({
            ...acc,
            [type]: {
                total: 0,
                available: 0,
                utilization: 0
            }
        }), {} as IPoolMetrics['resourceMetrics']);

        return {
            totalResources: 0,
            availableResources: 0,
            busyResources: 0,
            errorResources: 0,
            utilizationRate: 0,
            averageWaitTime: 0,
            resourceMetrics,
            timestamp: Date.now()
        };
    }

    /**
     * Update pool metrics
     */
    private updateMetrics(): void {
        const now = Date.now();
        let total = 0;
        let available = 0;
        let busy = 0;
        let error = 0;

        for (const [type, pool] of this.resourcePools.entries()) {
            const poolStats = {
                total: pool.length,
                available: pool.filter(r => r.status === RESOURCE_STATUS_enum.AVAILABLE).length,
                utilization: 0
            };

            total += pool.length;
            available += poolStats.available;
            busy += pool.filter(r => r.status === RESOURCE_STATUS_enum.BUSY).length;
            error += pool.filter(r => r.status === RESOURCE_STATUS_enum.ERROR).length;

            poolStats.utilization = pool.length > 0 
                ? (pool.length - poolStats.available) / pool.length 
                : 0;

            this.metrics.resourceMetrics[type] = poolStats;
        }

        this.metrics.totalResources = total;
        this.metrics.availableResources = available;
        this.metrics.busyResources = busy;
        this.metrics.errorResources = error;
        this.metrics.utilizationRate = total > 0 ? (total - available) / total : 0;
        this.metrics.timestamp = now;
    }

    /**
     * Scale resource pool up or down
     */
    private async scalePool(type: RESOURCE_TYPE_enum, direction: 'up' | 'down'): Promise<void> {
        const pool = this.resourcePools.get(type);
        if (!pool) return;

        const limits = this.config.resourceLimits[type];
        const utilization = this.metrics.resourceMetrics[type].utilization;

        if (direction === 'up' && 
            pool.length < limits.max && 
            utilization >= this.config.scaleUpThreshold) {
            // Add new resources
            const newResource = await this.createResource(type);
            pool.push(newResource);
        } else if (direction === 'down' && 
                  pool.length > limits.min && 
                  utilization <= this.config.scaleDownThreshold) {
            // Remove idle resources
            const idleResources = pool
                .filter(r => r.status === RESOURCE_STATUS_enum.AVAILABLE)
                .sort((a, b) => a.lastUsed - b.lastUsed);

            while (idleResources.length > 0 && pool.length > limits.min) {
                const resource = idleResources.pop();
                if (resource) {
                    const index = pool.findIndex(r => r.id === resource.id);
                    if (index !== -1) {
                        pool.splice(index, 1);
                    }
                }
            }
        }

        this.updateMetrics();
    }

    /**
     * Create a new resource
     */
    private async createResource(type: RESOURCE_TYPE_enum): Promise<IResource> {
        const id = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const resource: IResource = {
            id,
            type,
            status: RESOURCE_STATUS_enum.AVAILABLE,
            capabilities: [],
            metrics: {
                cpuUsage: 0,
                memoryUsage: 0,
                diskIO: { read: 0, write: 0 },
                networkUsage: { upload: 0, download: 0 },
                timestamp: Date.now()
            },
            lastUsed: Date.now(),
            usageCount: 0,
            healthCheck: async () => {
                const metrics = await this.metricsManager.getInitialResourceMetrics();
                return {
                    status: RESOURCE_STATUS_enum.AVAILABLE,
                    lastChecked: Date.now(),
                    metrics
                };
            }
        };

        return resource;
    }

    /**
     * Start health check interval
     */
    private startHealthChecks(): void {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }

        this.healthCheckInterval = setInterval(
            () => this.performHealthChecks(),
            this.config.healthCheckInterval
        );
    }

    /**
     * Restart health checks with new interval
     */
    private restartHealthChecks(): void {
        this.startHealthChecks();
    }

    /**
     * Perform health checks on all resources
     */
    private async performHealthChecks(): Promise<void> {
        for (const pool of this.resourcePools.values()) {
            for (const resource of pool) {
                try {
                    const health = await resource.healthCheck();
                    resource.status = health.status;
                    resource.metrics = health.metrics;
                } catch (error) {
                    resource.status = RESOURCE_STATUS_enum.ERROR;
                    this.logError(`Health check failed for resource ${resource.id}`, error);
                }
            }
        }

        this.updateMetrics();
    }

    private logError(message: string, error?: unknown): void {
        console.error(`PoolManager Error: ${message}`, error);
    }
}

export default PoolManager.getInstance();
