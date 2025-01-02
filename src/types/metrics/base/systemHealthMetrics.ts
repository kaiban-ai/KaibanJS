/**
 * @file systemHealthMetrics.ts
 * @path src/types/metrics/base/systemHealthMetrics.ts
 * @description Core system health metrics type definitions
 */

import type { IValidationResult } from '../../common/validationTypes';

/**
 * System metrics interface
 */
export interface ISystemMetrics {
    readonly timestamp: number;
    readonly cpu: {
        readonly usage: number;
        readonly temperature?: number;
        readonly loadAverage: number[];
    };
    readonly memory: {
        readonly used: number;
        readonly total: number;
        readonly free: number;
    };
    readonly disk: {
        readonly read: number;
        readonly write: number;
        readonly free: number;
        readonly total: number;
    };
    readonly network: {
        readonly upload: number;
        readonly download: number;
    };
    readonly process: {
        readonly uptime: number;
        readonly memoryUsage: NodeJS.MemoryUsage;
        readonly cpuUsage: NodeJS.CpuUsage;
    };
}

/**
 * Core system thresholds interface
 */
export interface ICoreSystemThresholds {
    readonly cpu: {
        readonly warning: number;
        readonly critical: number;
    };
    readonly memory: {
        readonly warning: number;
        readonly critical: number;
    };
    readonly errorRate: {
        readonly warning: number;
        readonly critical: number;
    };
    readonly responseTime: {
        readonly warning: number;
        readonly critical: number;
    };
}

/**
 * Core system status interface
 */
export interface ICoreSystemStatus {
    readonly isHealthy: boolean;
    readonly isStable: boolean;
    readonly isResponsive: boolean;
    readonly lastHealthCheck: number;
    readonly uptime: number;
}

/**
 * Core system capacity interface
 */
export interface ICoreSystemCapacity {
    readonly maxConcurrentOperations: number;
    readonly currentLoad: number;
    readonly availableCapacity: number;
    readonly scalingFactor: number;
}

/**
 * Core system stability interface
 */
export interface ICoreSystemStability {
    readonly crashCount: number;
    readonly lastIncident: number;
    readonly meanTimeBetweenFailures: number;
}

/**
 * Core system degradation interface
 */
export interface ICoreSystemDegradation {
    readonly performance: {
        readonly latencyIncrease: number;
        readonly throughputDecrease: number;
        readonly errorRateIncrease: number;
    };
    readonly resources: {
        readonly cpuDegradation: number;
        readonly memoryLeak: number;
        readonly ioBottleneck: number;
    };
    readonly service: {
        readonly availabilityImpact: number;
        readonly reliabilityImpact: number;
        readonly qualityImpact: number;
    };
}

/**
 * Core system health metrics interface
 */
export interface ICoreSystemHealthMetrics {
    readonly metrics: ISystemMetrics;
    readonly status: ICoreSystemStatus;
    readonly capacity: ICoreSystemCapacity;
    readonly stability: ICoreSystemStability;
    readonly thresholds: ICoreSystemThresholds;
    readonly degradation: ICoreSystemDegradation;
    readonly timestamp: number;
}

/**
 * Type guards for system health metrics
 */
export const SystemHealthTypeGuards = {
    isSystemMetrics(value: unknown): value is ISystemMetrics {
        if (!value || typeof value !== 'object') return false;
        const metrics = value as Partial<ISystemMetrics>;

        return !!(
            typeof metrics.timestamp === 'number' &&
            metrics.cpu &&
            typeof metrics.cpu.usage === 'number' &&
            Array.isArray(metrics.cpu.loadAverage) &&
            metrics.memory &&
            typeof metrics.memory.used === 'number' &&
            typeof metrics.memory.total === 'number' &&
            typeof metrics.memory.free === 'number' &&
            metrics.disk &&
            typeof metrics.disk.read === 'number' &&
            typeof metrics.disk.write === 'number' &&
            typeof metrics.disk.free === 'number' &&
            typeof metrics.disk.total === 'number' &&
            metrics.network &&
            typeof metrics.network.upload === 'number' &&
            typeof metrics.network.download === 'number' &&
            metrics.process &&
            typeof metrics.process.uptime === 'number' &&
            metrics.process.memoryUsage &&
            metrics.process.cpuUsage
        );
    },

    isCoreSystemHealthMetrics(value: unknown): value is ICoreSystemHealthMetrics {
        if (!value || typeof value !== 'object') return false;
        const health = value as Partial<ICoreSystemHealthMetrics>;

        return !!(
            this.isSystemMetrics(health.metrics) &&
            health.status &&
            typeof health.status.isHealthy === 'boolean' &&
            typeof health.status.isStable === 'boolean' &&
            typeof health.status.isResponsive === 'boolean' &&
            typeof health.status.lastHealthCheck === 'number' &&
            typeof health.status.uptime === 'number' &&
            health.capacity &&
            typeof health.capacity.maxConcurrentOperations === 'number' &&
            typeof health.capacity.currentLoad === 'number' &&
            typeof health.capacity.availableCapacity === 'number' &&
            typeof health.capacity.scalingFactor === 'number' &&
            health.stability &&
            typeof health.stability.crashCount === 'number' &&
            typeof health.stability.lastIncident === 'number' &&
            typeof health.stability.meanTimeBetweenFailures === 'number' &&
            health.thresholds &&
            health.degradation &&
            typeof health.timestamp === 'number'
        );
    }
};

/**
 * Validate system health metrics
 */
export function validateSystemHealth(metrics: unknown): IValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!SystemHealthTypeGuards.isCoreSystemHealthMetrics(metrics)) {
        return {
            isValid: false,
            errors: ['Invalid system health metrics structure'],
            warnings: []
        };
    }

    const health = metrics as ICoreSystemHealthMetrics;

    // Validate raw metrics
    if (health.metrics.memory.used > health.metrics.memory.total) {
        errors.push('Used memory cannot exceed total memory');
    }

    if (health.metrics.disk.free > health.metrics.disk.total) {
        errors.push('Free disk space cannot exceed total disk space');
    }

    // Validate capacity
    if (health.capacity.currentLoad > health.capacity.maxConcurrentOperations) {
        errors.push('Current load exceeds maximum concurrent operations');
    }

    if (health.capacity.availableCapacity < 0) {
        errors.push('Available capacity cannot be negative');
    }

    // Validate stability
    if (health.stability.meanTimeBetweenFailures < 0) {
        errors.push('Mean time between failures cannot be negative');
    }

    // Validate degradation
    if (health.degradation.performance.latencyIncrease < 0) {
        errors.push('Latency increase cannot be negative');
    }

    if (health.degradation.resources.memoryLeak < 0) {
        errors.push('Memory leak cannot be negative');
    }

    if (health.degradation.service.availabilityImpact < 0 || 
        health.degradation.service.availabilityImpact > 1) {
        errors.push('Availability impact must be between 0 and 1');
    }

    // Validate timestamp
    if (health.timestamp > Date.now()) {
        warnings.push('Timestamp is in the future');
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
}
