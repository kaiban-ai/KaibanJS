/**
 * @file resourceMetricsUtils.ts
 * @path src/managers/core/metrics/utils/resourceMetricsUtils.ts
 * @description Utility functions for resource metrics calculations
 *
 * @module @managers/core/metrics/utils
 */

// ─── Constants ────────────────────────────────────────────────────────────────

const RESOURCE_THRESHOLDS = {
    HIGH: 80,
    CRITICAL: 90,
    MAX: 100
} as const;

const BYTES_TO_GB = 1024 * 1024 * 1024;
const BYTES_TO_MB = 1024 * 1024;

// ─── Utility Functions ────────────────────────────────────────────────────────

const calculateDiskUtilization = (readBytes: number, writeBytes: number): number => 
    Math.min(RESOURCE_THRESHOLDS.MAX, ((readBytes + writeBytes) / BYTES_TO_MB) * 100);

const calculateNetworkUtilization = (uploadBytes: number, downloadBytes: number): number => 
    Math.min(RESOURCE_THRESHOLDS.MAX, ((uploadBytes + downloadBytes) / BYTES_TO_MB) * 100);

const calculateMemoryUtilization = (memoryBytes: number): number => 
    (memoryBytes / BYTES_TO_GB) * 100;

const getResourceWarning = (metric: string, value: number): string | null => {
    if (value > RESOURCE_THRESHOLDS.CRITICAL) {
        return `Critical ${metric} utilization: ${value.toFixed(1)}%`;
    }
    if (value > RESOURCE_THRESHOLDS.HIGH) {
        return `High ${metric} utilization: ${value.toFixed(1)}%`;
    }
    return null;
};

// ─── Exports ────────────────────────────────────────────────────────────────

export const ResourceMetricsUtils = {
    RESOURCE_THRESHOLDS,
    calculateDiskUtilization,
    calculateNetworkUtilization,
    calculateMemoryUtilization,
    getResourceWarning
};
