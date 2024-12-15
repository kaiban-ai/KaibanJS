/**
 * @file llmResourceTypes.ts
 * @path src/types/llm/llmResourceTypes.ts
 * @description LLM-specific resource metrics extending base resource metrics
 */

import type { IResourceMetrics } from '../metrics/base/resourceMetrics';

export interface ILLMResourceMetrics extends IResourceMetrics {
    readonly gpuMemoryUsage: number;
    readonly modelMemoryAllocation: {
        readonly weights: number;
        readonly cache: number;
        readonly workspace: number;
    };
}

export const LLMResourceMetricsTypeGuards = {
    isLLMResourceMetrics: (value: unknown): value is ILLMResourceMetrics => {
        if (typeof value !== 'object' || value === null) return false;
        const metrics = value as Partial<ILLMResourceMetrics>;
        
        return (
            typeof metrics.cpuUsage === 'number' &&
            typeof metrics.memoryUsage === 'number' &&
            typeof metrics.gpuMemoryUsage === 'number' &&
            typeof metrics.diskIO === 'object' &&
            typeof metrics.diskIO?.read === 'number' &&
            typeof metrics.diskIO?.write === 'number' &&
            typeof metrics.networkUsage === 'object' &&
            typeof metrics.networkUsage?.upload === 'number' &&
            typeof metrics.networkUsage?.download === 'number' &&
            typeof metrics.modelMemoryAllocation === 'object' &&
            typeof metrics.modelMemoryAllocation?.weights === 'number' &&
            typeof metrics.modelMemoryAllocation?.cache === 'number' &&
            typeof metrics.modelMemoryAllocation?.workspace === 'number' &&
            typeof metrics.timestamp === 'number'
        );
    }
};
