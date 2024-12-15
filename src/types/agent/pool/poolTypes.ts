/**
 * @file poolTypes.ts
 * @path src/types/agent/pool/poolTypes.ts
 */

import type { IResourceMetrics } from '../../common/commonMetricTypes';
import { POOL_RESOURCE_TYPE_enum, POOL_RESOURCE_STATUS_enum } from '../../common/commonEnums'


export interface IHealthCheckResult {
    status: POOL_RESOURCE_STATUS_enum;
    lastChecked: number;
    metrics: IResourceMetrics;
    error?: Error;
}

export interface IResource {
    id: string;
    type: POOL_RESOURCE_TYPE_enum;
    status: POOL_RESOURCE_STATUS_enum;
    capabilities: string[];
    metrics: IResourceMetrics;
    lastUsed: number;
    usageCount: number;
    healthCheck: () => Promise<IHealthCheckResult>;
}

export interface IPoolMetrics {
    totalResources: number;
    availableResources: number;
    busyResources: number;
    errorResources: number;
    utilizationRate: number;
    averageWaitTime: number;
    resourceMetrics: {
        [key in POOL_RESOURCE_TYPE_enum]: {
            total: number;
            available: number;
            utilization: number;
        };
    };
    timestamp: number;
}

export interface IPoolConfig {
    minSize: number;
    maxSize: number;
    scaleUpThreshold: number;
    scaleDownThreshold: number;
    healthCheckInterval: number;
    resourceTimeout: number;
    retryAttempts: number;
    resourceLimits: {
        [key in POOL_RESOURCE_TYPE_enum]: {
            min: number;
            max: number;
            cooldown: number;
        };
    };
}

export const DEFAULT_POOL_CONFIG: IPoolConfig = {
    minSize: 5,
    maxSize: 20,
    scaleUpThreshold: 0.8,
    scaleDownThreshold: 0.2,
    healthCheckInterval: 30000,
    resourceTimeout: 300000,
    retryAttempts: 3,
    resourceLimits: {
        [POOL_RESOURCE_TYPE_enum.LLM]: { min: 1, max: 5, cooldown: 60000 },
        [POOL_RESOURCE_TYPE_enum.TOOL]: { min: 2, max: 10, cooldown: 30000 },
        [POOL_RESOURCE_TYPE_enum.MEMORY]: { min: 1, max: 5, cooldown: 45000 },
        [POOL_RESOURCE_TYPE_enum.COMPUTE]: { min: 2, max: 8, cooldown: 45000 },
        [POOL_RESOURCE_TYPE_enum.NETWORK]: { min: 1, max: 5, cooldown: 30000 }
    }
};