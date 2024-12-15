/**
 * @file systemHealthMetrics.ts
 * @path src/types/metrics/base/systemHealthMetrics.ts
 * @description System health metrics type definitions and validation
 *
 * @module @types/metrics/base
 */

import { createValidationResult } from '@utils/validation/validationUtils';
import type { IValidationResult } from '../../common/validationTypes';
import type { IResourceMetrics } from './resourceMetrics';
import type { IPerformanceMetrics } from './performanceMetrics';

// ─── System Health Types ────────────────────────────────────────────────────────

export interface ISystemStatus {
    readonly isHealthy: boolean;
    readonly isStable: boolean;
    readonly isResponsive: boolean;
    readonly lastHealthCheck: number;
    readonly uptime: number;
}

export interface ISystemCapacity {
    readonly maxConcurrentOperations: number;
    readonly currentLoad: number;
    readonly availableCapacity: number;
    readonly scalingFactor: number;
}

export interface ISystemStability {
    readonly crashCount: number;
    readonly recoveryCount: number;
    readonly lastIncident: number;
    readonly meanTimeBetweenFailures: number;
    readonly meanTimeToRecover: number;
}

export interface ISystemThresholds {
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

export interface ISystemDegradation {
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
 * Comprehensive system health metrics
 */
export interface ISystemHealthMetrics {
    /** Current system status */
    readonly status: ISystemStatus;
    /** System capacity metrics */
    readonly capacity: ISystemCapacity;
    /** System stability metrics */
    readonly stability: ISystemStability;
    /** System thresholds */
    readonly thresholds: ISystemThresholds;
    /** System degradation metrics */
    readonly degradation: ISystemDegradation;
    /** Resource utilization */
    readonly resources: IResourceMetrics;
    /** Performance metrics */
    readonly performance: IPerformanceMetrics;
    /** Timestamp of metrics collection */
    readonly timestamp: number;
}

// ─── Type Guards ────────────────────────────────────────────────────────────

export const SystemHealthTypeGuards = {
    isSystemStatus(value: unknown): value is ISystemStatus {
        if (!value || typeof value !== 'object') return false;
        const status = value as Partial<ISystemStatus>;

        return !!(
            typeof status.isHealthy === 'boolean' &&
            typeof status.isStable === 'boolean' &&
            typeof status.isResponsive === 'boolean' &&
            typeof status.lastHealthCheck === 'number' &&
            typeof status.uptime === 'number'
        );
    },

    isSystemCapacity(value: unknown): value is ISystemCapacity {
        if (!value || typeof value !== 'object') return false;
        const capacity = value as Partial<ISystemCapacity>;

        return !!(
            typeof capacity.maxConcurrentOperations === 'number' &&
            typeof capacity.currentLoad === 'number' &&
            typeof capacity.availableCapacity === 'number' &&
            typeof capacity.scalingFactor === 'number'
        );
    },

    isSystemStability(value: unknown): value is ISystemStability {
        if (!value || typeof value !== 'object') return false;
        const stability = value as Partial<ISystemStability>;

        return !!(
            typeof stability.crashCount === 'number' &&
            typeof stability.recoveryCount === 'number' &&
            typeof stability.lastIncident === 'number' &&
            typeof stability.meanTimeBetweenFailures === 'number' &&
            typeof stability.meanTimeToRecover === 'number'
        );
    },

    isSystemThresholds(value: unknown): value is ISystemThresholds {
        if (!value || typeof value !== 'object') return false;
        const thresholds = value as Partial<ISystemThresholds>;

        return !!(
            thresholds.cpu &&
            typeof thresholds.cpu.warning === 'number' &&
            typeof thresholds.cpu.critical === 'number' &&
            thresholds.memory &&
            typeof thresholds.memory.warning === 'number' &&
            typeof thresholds.memory.critical === 'number' &&
            thresholds.errorRate &&
            typeof thresholds.errorRate.warning === 'number' &&
            typeof thresholds.errorRate.critical === 'number' &&
            thresholds.responseTime &&
            typeof thresholds.responseTime.warning === 'number' &&
            typeof thresholds.responseTime.critical === 'number'
        );
    },

    isSystemDegradation(value: unknown): value is ISystemDegradation {
        if (!value || typeof value !== 'object') return false;
        const degradation = value as Partial<ISystemDegradation>;

        return !!(
            degradation.performance &&
            typeof degradation.performance.latencyIncrease === 'number' &&
            typeof degradation.performance.throughputDecrease === 'number' &&
            typeof degradation.performance.errorRateIncrease === 'number' &&
            degradation.resources &&
            typeof degradation.resources.cpuDegradation === 'number' &&
            typeof degradation.resources.memoryLeak === 'number' &&
            typeof degradation.resources.ioBottleneck === 'number' &&
            degradation.service &&
            typeof degradation.service.availabilityImpact === 'number' &&
            typeof degradation.service.reliabilityImpact === 'number' &&
            typeof degradation.service.qualityImpact === 'number'
        );
    },

    isSystemHealthMetrics(value: unknown): value is ISystemHealthMetrics {
        if (!value || typeof value !== 'object') return false;
        const metrics = value as Partial<ISystemHealthMetrics>;

        return !!(
            this.isSystemStatus(metrics.status) &&
            this.isSystemCapacity(metrics.capacity) &&
            this.isSystemStability(metrics.stability) &&
            this.isSystemThresholds(metrics.thresholds) &&
            this.isSystemDegradation(metrics.degradation) &&
            typeof metrics.timestamp === 'number'
        );
    }
};

// ─── Validation Functions ────────────────────────────────────────────────────

export const SystemHealthValidation = {
    validateSystemHealthMetrics(metrics: unknown): IValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!SystemHealthTypeGuards.isSystemHealthMetrics(metrics)) {
            errors.push('Invalid system health metrics structure');
            return createValidationResult(false, errors);
        }

        const healthMetrics = metrics as ISystemHealthMetrics;

        // Validate capacity metrics
        if (healthMetrics.capacity.currentLoad > healthMetrics.capacity.maxConcurrentOperations) {
            errors.push('Current load exceeds maximum concurrent operations');
        }

        if (healthMetrics.capacity.availableCapacity < 0) {
            errors.push('Available capacity cannot be negative');
        }

        // Validate stability metrics
        if (healthMetrics.stability.recoveryCount > healthMetrics.stability.crashCount) {
            warnings.push('Recovery count exceeds crash count');
        }

        if (healthMetrics.stability.meanTimeToRecover < 0) {
            errors.push('Mean time to recover cannot be negative');
        }

        // Validate thresholds
        if (healthMetrics.thresholds.cpu.warning >= healthMetrics.thresholds.cpu.critical) {
            warnings.push('CPU warning threshold should be lower than critical threshold');
        }

        if (healthMetrics.thresholds.memory.warning >= healthMetrics.thresholds.memory.critical) {
            warnings.push('Memory warning threshold should be lower than critical threshold');
        }

        // Validate degradation metrics
        if (healthMetrics.degradation.performance.latencyIncrease < 0) {
            errors.push('Latency increase cannot be negative');
        }

        if (healthMetrics.degradation.resources.memoryLeak < 0) {
            errors.push('Memory leak cannot be negative');
        }

        if (healthMetrics.degradation.service.availabilityImpact < 0 || 
            healthMetrics.degradation.service.availabilityImpact > 1) {
            errors.push('Availability impact must be between 0 and 1');
        }

        // Validate timestamp
        if (healthMetrics.timestamp > Date.now()) {
            warnings.push('Timestamp is in the future');
        }

        return createValidationResult(errors.length === 0, errors, warnings);
    }
};
