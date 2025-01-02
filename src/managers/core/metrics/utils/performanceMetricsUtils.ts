/**
 * @file performanceMetricsUtils.ts
 * @path src/managers/core/metrics/utils/performanceMetricsUtils.ts
 * @description Utility functions for performance metrics calculations
 *
 * @module @managers/core/metrics/utils
 */

import type { ITimeMetrics, IThroughputMetrics } from '../../../../types/metrics/base/performanceMetrics';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Conversion factor from bytes to megabytes (1 MB = 1024 * 1024 bytes) */
const BYTES_TO_MB = 1024 * 1024;

/** Conversion factor from nanoseconds to milliseconds (1 ms = 1,000,000 ns) */
const NANOSECONDS_TO_MS = 1_000_000;

// ─── Time Metrics Utils ────────────────────────────────────────────────────────

/**
 * Calculate time metrics from an array of measurements in nanoseconds.
 * @param measurements Array of time measurements in nanoseconds
 * @returns Time metrics with all values converted to milliseconds
 */
const calculateTimeMetrics = (measurements: number[]): ITimeMetrics => {
    if (measurements.length === 0) {
        return {
            average: 0,
            min: 0,
            max: 0,
            total: 0
        };
    }

    // Convert nanoseconds to milliseconds
    const convertedMeasurements = measurements.map(val => val / NANOSECONDS_TO_MS);
    const total = convertedMeasurements.reduce((sum, val) => sum + val, 0);
    return {
        average: total / measurements.length,
        min: Math.min(...convertedMeasurements),
        max: Math.max(...convertedMeasurements),
        total
    };
};

/**
 * Update existing time metrics with a new measurement.
 * @param current Current time metrics (in milliseconds)
 * @param newValue New time measurement (in nanoseconds)
 * @returns Updated time metrics (in milliseconds)
 */
const updateTimeMetrics = (current: ITimeMetrics, newValue: number): ITimeMetrics => {
    // Convert nanoseconds to milliseconds
    const convertedValue = newValue / NANOSECONDS_TO_MS;
    const currentTotal = current.total ?? 0;
    const newTotal = currentTotal + convertedValue;
    return {
        average: newTotal / ((currentTotal / current.average) + 1),
        min: Math.min(current.min, convertedValue),
        max: Math.max(current.max, convertedValue),
        total: newTotal
    };
};

// ─── Throughput Utils ─────────────────────────────────────────────────────────

/**
 * Calculate throughput metrics.
 * @param operations Number of operations performed
 * @param dataBytes Amount of data processed in bytes
 * @param timeWindowMs Time window in milliseconds
 * @returns Throughput metrics with data rates in ops/s and MB/s
 */
const calculateThroughput = (
    operations: number,
    dataBytes: number,
    timeWindowMs: number
): IThroughputMetrics => ({
    requestsPerSecond: (operations * 1000) / timeWindowMs,
    bytesPerSecond: (dataBytes * 1000) / timeWindowMs,
    operationsPerSecond: (operations * 1000) / timeWindowMs,
    dataProcessedPerSecond: (dataBytes / BYTES_TO_MB * 1000) / timeWindowMs // Convert to MB/s
});

/**
 * Calculate operations per second.
 * @param operations Number of operations performed
 * @param timeWindowMs Time window in milliseconds
 * @returns Operations per second
 */
const calculateOperationsPerSecond = (operations: number, timeWindowMs: number): number =>
    (operations * 1000) / timeWindowMs;

/**
 * Calculate data processing rate.
 * @param dataBytes Amount of data processed in bytes
 * @param timeWindowMs Time window in milliseconds
 * @returns Data processing rate in MB/s
 */
const calculateDataProcessingRate = (dataBytes: number, timeWindowMs: number): number =>
    (dataBytes / BYTES_TO_MB * 1000) / timeWindowMs; // Convert to MB/s

// ─── Rate Calculations ────────────────────────────────────────────────────────

/**
 * Calculate error rate as a ratio of errors to total operations.
 * @param errors Number of errors
 * @param total Total number of operations
 * @returns Error rate between 0 and 1
 */
const calculateErrorRate = (errors: number, total: number): number =>
    total === 0 ? 0 : errors / total;

/**
 * Calculate success rate as a ratio of successes to total operations.
 * @param successes Number of successful operations
 * @param total Total number of operations
 * @returns Success rate between 0 and 1 (defaults to 1 if total is 0)
 */
const calculateSuccessRate = (successes: number, total: number): number =>
    total === 0 ? 1 : successes / total;

// ─── Performance Analysis ──────────────────────────────────────────────────────

/**
 * Analyze performance trend based on recent measurements.
 * @param measurements Array of performance measurements
 * @returns Trend analysis with direction and change rate
 */
const analyzePerformanceTrend = (measurements: number[]): {
    trend: 'improving' | 'stable' | 'degrading';
    changeRate: number;
} => {
    if (measurements.length < 2) {
        return { trend: 'stable', changeRate: 0 };
    }

    const recentAvg = measurements.slice(-5).reduce((a, b) => a + b, 0) / Math.min(5, measurements.length);
    const previousAvg = measurements.slice(0, -5).reduce((a, b) => a + b, 0) / Math.max(1, measurements.length - 5);
    const changeRate = (recentAvg - previousAvg) / previousAvg;

    return {
        trend: changeRate < -0.1 ? 'improving' : changeRate > 0.1 ? 'degrading' : 'stable',
        changeRate
    };
};

// ─── Exports ────────────────────────────────────────────────────────────────

export const PerformanceMetricsUtils = {
    calculateTimeMetrics,
    updateTimeMetrics,
    calculateThroughput,
    calculateOperationsPerSecond,
    calculateDataProcessingRate,
    calculateErrorRate,
    calculateSuccessRate,
    analyzePerformanceTrend
};
