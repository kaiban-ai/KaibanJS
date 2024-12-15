/**
 * @file systemHealthUtils.ts
 * @path src/managers/core/metrics/utils/systemHealthUtils.ts
 * @description Utility functions for system health metrics calculations
 *
 * @module @managers/core/metrics/utils
 */

import type { 
    ISystemStatus,
    ISystemCapacity,
    ISystemStability,
    ISystemThresholds,
    ISystemDegradation
} from '../../../../types/metrics/base/systemHealthMetrics';
import type { IResourceMetrics } from '../../../../types/metrics/base/resourceMetrics';
import type { IPerformanceMetrics } from '../../../../types/metrics/base/performanceMetrics';

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_THRESHOLDS: ISystemThresholds = {
    cpu: { warning: 70, critical: 90 },
    memory: { warning: 70, critical: 90 },
    errorRate: { warning: 0.05, critical: 0.1 },
    responseTime: { warning: 1000, critical: 5000 }
};

// ─── Status Calculations ────────────────────────────────────────────────────────

const calculateSystemStatus = (
    resources: IResourceMetrics,
    performance: IPerformanceMetrics,
    thresholds: ISystemThresholds,
    startTime: number
): ISystemStatus => {
    const isHealthy = 
        resources.cpuUsage < thresholds.cpu.critical &&
        resources.memoryUsage < thresholds.memory.critical &&
        performance.errorRate < thresholds.errorRate.critical &&
        performance.latency.average < thresholds.responseTime.critical;

    const isStable = 
        resources.cpuUsage < thresholds.cpu.warning &&
        resources.memoryUsage < thresholds.memory.warning &&
        performance.errorRate < thresholds.errorRate.warning &&
        performance.latency.average < thresholds.responseTime.warning;

    const isResponsive = performance.latency.average < thresholds.responseTime.warning;

    return {
        isHealthy,
        isStable,
        isResponsive,
        lastHealthCheck: Date.now(),
        uptime: Date.now() - startTime
    };
};

// ─── Capacity Calculations ─────────────────────────────────────────────────────

const calculateSystemCapacity = (
    resources: IResourceMetrics,
    performance: IPerformanceMetrics,
    maxOperations: number
): ISystemCapacity => {
    const currentLoad = performance.queueLength;
    const resourceUtilization = Math.max(
        resources.cpuUsage / 100,
        resources.memoryUsage / (1024 * 1024 * 1024)
    );
    const availableCapacity = Math.max(0, maxOperations - currentLoad);
    const scalingFactor = Math.min(1, (1 - resourceUtilization) * (maxOperations / (currentLoad + 1)));

    return {
        maxConcurrentOperations: maxOperations,
        currentLoad,
        availableCapacity,
        scalingFactor
    };
};

// ─── Stability Calculations ─────────────────────────────────────────────────────

const calculateSystemStability = (
    crashes: number[],
    recoveries: number[],
    now: number
): ISystemStability => {
    const crashCount = crashes.length;
    const recoveryCount = recoveries.length;
    const lastIncident = crashes.length > 0 ? Math.max(...crashes) : 0;

    // Calculate MTBF and MTTR
    let meanTimeBetweenFailures = 0;
    if (crashes.length > 1) {
        const intervals = crashes.slice(1).map((time, i) => time - crashes[i]);
        meanTimeBetweenFailures = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
    }

    let meanTimeToRecover = 0;
    if (recoveries.length > 0 && crashes.length > 0) {
        const recoveryTimes = recoveries.map((recovery, i) => {
            const crash = crashes[i];
            return crash ? recovery - crash : 0;
        });
        meanTimeToRecover = recoveryTimes.reduce((sum, val) => sum + val, 0) / recoveryTimes.length;
    }

    return {
        crashCount,
        recoveryCount,
        lastIncident,
        meanTimeBetweenFailures,
        meanTimeToRecover
    };
};

// ─── Degradation Calculations ───────────────────────────────────────────────────

const calculateSystemDegradation = (
    currentMetrics: { resources: IResourceMetrics; performance: IPerformanceMetrics },
    baselineMetrics: { resources: IResourceMetrics; performance: IPerformanceMetrics }
): ISystemDegradation => {
    const performance = {
        latencyIncrease: Math.max(0, (currentMetrics.performance.latency.average - 
            baselineMetrics.performance.latency.average) / baselineMetrics.performance.latency.average),
        throughputDecrease: Math.max(0, (baselineMetrics.performance.throughput.operationsPerSecond - 
            currentMetrics.performance.throughput.operationsPerSecond) / baselineMetrics.performance.throughput.operationsPerSecond),
        errorRateIncrease: Math.max(0, currentMetrics.performance.errorRate - baselineMetrics.performance.errorRate)
    };

    const resources = {
        cpuDegradation: Math.max(0, (currentMetrics.resources.cpuUsage - baselineMetrics.resources.cpuUsage) / 100),
        memoryLeak: Math.max(0, (currentMetrics.resources.memoryUsage - baselineMetrics.resources.memoryUsage) / 
            baselineMetrics.resources.memoryUsage),
        ioBottleneck: Math.max(0, 
            ((currentMetrics.resources.diskIO.read + currentMetrics.resources.diskIO.write) -
            (baselineMetrics.resources.diskIO.read + baselineMetrics.resources.diskIO.write)) /
            (baselineMetrics.resources.diskIO.read + baselineMetrics.resources.diskIO.write || 1))
    };

    const service = {
        availabilityImpact: Math.min(1, Math.max(0, performance.errorRateIncrease)),
        reliabilityImpact: Math.min(1, Math.max(0, (performance.latencyIncrease + performance.errorRateIncrease) / 2)),
        qualityImpact: Math.min(1, Math.max(0, 
            (performance.latencyIncrease + performance.throughputDecrease + performance.errorRateIncrease) / 3))
    };

    return {
        performance,
        resources,
        service
    };
};

// ─── Exports ────────────────────────────────────────────────────────────────

export const SystemHealthUtils = {
    DEFAULT_THRESHOLDS,
    calculateSystemStatus,
    calculateSystemCapacity,
    calculateSystemStability,
    calculateSystemDegradation
};
