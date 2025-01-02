/**
 * @file batchTypes.ts
 * @path src/types/agent/batch/batchTypes.ts
 */

import type { ILoopContext } from '../agentExecutionFlow';
import type { IResourceMetrics } from '../../metrics/base/resourceMetrics';
import { BATCH_PRIORITY_enum, BATCH_STATUS_enum } from '../../common/enumTypes';

export interface IBatchOperation {
    id: string;
    priority: BATCH_PRIORITY_enum;
    timestamp: number;
    timeout: number;
    status: BATCH_STATUS_enum;
    context: ILoopContext;
    retryCount: number;
    maxRetries: number;
}

export interface IBatchMetrics {
    totalOperations: number;
    completedOperations: number;
    failedOperations: number;
    averageProcessingTime: number;
    queueLength: number;
    resourceUsage: IResourceMetrics;
    timestamp: number;
}

export interface IBatchConfig {
    maxBatchSize: number;
    maxQueueSize: number;
    processingTimeout: number;
    maxRetries: number;
    priorityLevels: BATCH_PRIORITY_enum[];
    resourceLimits: {
        maxCpu: number;
        maxMemory: number;
        maxBandwidth: number;
    };
}

export const DEFAULT_BATCH_CONFIG: IBatchConfig = {
    maxBatchSize: 10,
    maxQueueSize: 100, 
    processingTimeout: 30000,
    maxRetries: 3,
    priorityLevels: [
        BATCH_PRIORITY_enum.HIGH,
        BATCH_PRIORITY_enum.MEDIUM,
        BATCH_PRIORITY_enum.LOW
    ],
    resourceLimits: {
        maxCpu: 80,
        maxMemory: 1024 * 1024 * 1024,
        maxBandwidth: 100 * 1024 * 1024
    }
};
