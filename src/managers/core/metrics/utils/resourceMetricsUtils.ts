/**
 * @file resourceMetricsUtils.ts
 * @deprecated This module is deprecated and will be removed in a future version.
 * Use BaseMetricsManager's resource metrics functionality instead:
 * ```typescript
 * // Before
 * const resourceMetrics = ResourceMetricsUtils.calculateResourceUsage();
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
export const ResourceMetricsUtils = {
    /** @deprecated Use BaseMetricsManager.collectBaseMetrics() instead */
    calculateResourceUsage: () => {
        throw new Error('ResourceMetricsUtils is deprecated. Use BaseMetricsManager instead.');
    },

    /** @deprecated Use BaseMetricsManager.validateMetrics() instead */
    validateResourceMetrics: () => {
        throw new Error('ResourceMetricsUtils is deprecated. Use BaseMetricsManager instead.');
    }
};

export default ResourceMetricsUtils;
