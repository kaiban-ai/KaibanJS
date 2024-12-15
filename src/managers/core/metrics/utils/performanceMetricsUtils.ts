/**
 * @file performanceMetricsUtils.ts
 * @path src/managers/core/metrics/utils/performanceMetricsUtils.ts
 * @description Utility functions for performance metrics calculations
 *
 * @module @managers/core/metrics/utils
 */

import type { ITimeMetrics, IThroughputMetrics } from '../../../../types/metrics/base/performanceMetrics';

// ─── Constants ────────────────────────────────────────────────────────────────

const BYTES_TO_MB = 1024 * 1024;
const NANOSECONDS_TO_MS = 1_000_000;

// ─── Time Metrics Utils ────────────────────────────────────────────────────────

const calculateTimeMetrics = (measurements: number[]): ITimeMetrics => {
    if (measurements.length === 0) {
        return {
            total: 0,
            average: 0,
            min: 0,
            max: 0
        };
    }

    const total = measurements.reduce((sum, val) => sum + val, 0);
    return {
        total,
        average: total / measurements.length,
        min: Math.min(...measurements),
        max: Math.max(...measurements)
    };
};

const updateTimeMetrics = (current: ITimeMetrics, newValue: number): ITimeMetrics => ({
    total: current.total + newValue,
    average: (current.total + newValue) / ((current.total / current.average) + 1),
    min: Math.min(current.min, newValue),
    max: Math.max(current.max, newValue)
});

// ─── Throughput Utils ─────────────────────────────────────────────────────────

const calculateThroughput = (
    operations: number,
    dataBytes: number,
    timeWindowMs: number
): IThroughputMetrics => ({
    operationsPerSecond: (operations * 1000) / timeWindowMs,
    dataProcessedPerSecond: (dataBytes * 1000) / timeWindowMs
});

const calculateOperationsPerSecond = (operations: number, timeWindowMs: number): number =>
    (operations * 1000) / timeWindowMs;

const calculateDataProcessingRate = (dataBytes: number, timeWindowMs: number): number =>
    (dataBytes * 1000) / timeWindowMs;

// ─── Rate Calculations ────────────────────────────────────────────────────────

const calculateErrorRate = (errors: number, total: number): number =>
    total === 0 ? 0 : errors / total;

const calculateSuccessRate = (successes: number, total: number): number =>
    total === 0 ? 1 : successes / total;

// ─── Performance Analysis ──────────────────────────────────────────────────────

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
