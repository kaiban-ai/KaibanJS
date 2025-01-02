/**
 * @file resourceMetrics.ts
 * @deprecated This module is deprecated and will be removed in a future version.
 * Use BaseMetricsManager's resource metrics functionality instead:
 * ```typescript
 * // Before
 * const resourceMetrics = await domainManager.getResourceMetrics();
 * 
 * // After
 * const baseMetrics = await baseMetricsManager.collectBaseMetrics();
 * const resources = baseMetrics.resources;
 * ```
 * 
 * Resource metrics are now centrally managed through BaseMetricsManager to:
 * - Avoid redundant resource tracking
 * - Ensure consistent collection methods
 * - Reduce overhead
 * - Provide unified validation
 */

/** @deprecated Use BaseMetricsManager instead */
import { IBaseMetrics } from './baseMetrics';

export interface IResourceMetrics extends IBaseMetrics {
    cpuUsage: number;
    memoryUsage: number;
    diskIO: {
        read: number;
        write: number;
    };
    networkUsage: {
        upload: number;
        download: number;
    };
    timestamp: number;
}

/** @deprecated Use BaseMetricsManager's validation instead */
export const ResourceMetricsValidation = {
    validateResourceMetrics: () => {
        throw new Error('ResourceMetricsValidation is deprecated. Use BaseMetricsManager instead.');
    }
};

/** @deprecated Use BaseMetricsManager's type guards instead */
export const ResourceMetricsTypeGuards = {
    isResourceMetrics: () => {
        throw new Error('ResourceMetricsTypeGuards is deprecated. Use BaseMetricsManager instead.');
    }
};
