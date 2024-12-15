/**
 * @file performanceMetrics.ts
 * @path KaibanJS\src\types\metrics\base\performanceMetrics.ts
 * @description Performance metrics type definitions and validation for system performance tracking
 * 
 * @module @types/metrics/base
 */

import { createValidationResult } from '@utils/validation/validationUtils';
import type { IValidationResult } from '../../common/validationTypes';
import type { IResourceMetrics } from './resourceMetrics';
import { IErrorKind, IErrorSeverity } from '../../common/errorTypes';
import { RecoveryStrategyType } from '../../common/recoveryTypes';

// ─── Type Definitions ────────────────────────────────────────────────────────

/**
 * Time-based metrics with statistical aggregates
 */
export interface ITimeMetrics {
    /** Total accumulated time */
    readonly total: number;
    /** Average time across all measurements */
    readonly average: number;
    /** Minimum recorded time */
    readonly min: number;
    /** Maximum recorded time */
    readonly max: number;
}

/**
 * System throughput measurements
 */
export interface IThroughputMetrics {
    /** Number of operations completed per second */
    readonly operationsPerSecond: number;
    /** Amount of data processed per second (in bytes) */
    readonly dataProcessedPerSecond: number;
}

/**
 * Error pattern analysis
 */
export interface IErrorPattern {
    /** Type of error */
    readonly errorKind: IErrorKind;
    /** Frequency of occurrence */
    readonly frequency: number;
    /** Average time between occurrences */
    readonly meanTimeBetweenErrors: number;
    /** Associated recovery strategies */
    readonly recoveryStrategies: readonly RecoveryStrategyType[];
    /** Success rate of recovery attempts */
    readonly recoverySuccessRate: number;
}

/**
 * Error impact metrics
 */
export interface IErrorImpact {
    /** Severity level of errors */
    readonly severity: IErrorSeverity;
    /** Business impact score (0-1) */
    readonly businessImpact: number;
    /** User experience impact score (0-1) */
    readonly userExperienceImpact: number;
    /** System stability impact score (0-1) */
    readonly systemStabilityImpact: number;
    /** Resource consumption impact */
    readonly resourceImpact: {
        readonly cpu: number;
        readonly memory: number;
        readonly io: number;
    };
}

/**
 * Basic error metrics interface for backward compatibility
 */
export interface IBasicErrorMetrics {
    /** Total number of errors encountered */
    readonly totalErrors: number;
    /** Error rate as a percentage (0-1) */
    readonly errorRate: number;
}

/**
 * Enhanced error tracking and analysis metrics
 */
export interface IErrorMetrics extends IBasicErrorMetrics {
    /** Distribution of errors by type */
    readonly errorDistribution: Record<IErrorKind, number>;
    /** Distribution of errors by severity */
    readonly severityDistribution: Record<IErrorSeverity, number>;
    /** Error patterns and trends */
    readonly patterns: readonly IErrorPattern[];
    /** Impact analysis */
    readonly impact: IErrorImpact;
    /** Recovery metrics */
    readonly recovery: {
        /** Average time to recover */
        readonly meanTimeToRecover: number;
        /** Success rate of recovery attempts */
        readonly recoverySuccessRate: number;
        /** Distribution of recovery strategies */
        readonly strategyDistribution: Record<RecoveryStrategyType, number>;
        /** Failed recovery attempts */
        readonly failedRecoveries: number;
    };
    /** Error prevention metrics */
    readonly prevention: {
        /** Prevented errors count */
        readonly preventedCount: number;
        /** Prevention success rate */
        readonly preventionRate: number;
        /** Early warning triggers */
        readonly earlyWarnings: number;
    };
    /** Historical trends */
    readonly trends: {
        /** Daily error rates */
        readonly dailyRates: readonly number[];
        /** Weekly error rates */
        readonly weeklyRates: readonly number[];
        /** Monthly error rates */
        readonly monthlyRates: readonly number[];
    };
}

/**
 * Comprehensive performance metrics for system monitoring
 */
export interface IPerformanceMetrics {
    /** Time spent in execution phases */
    readonly executionTime: ITimeMetrics;
    /** System response latency measurements */
    readonly latency: ITimeMetrics;
    /** System throughput measurements */
    readonly throughput: IThroughputMetrics;
    /** End-to-end response time tracking */
    readonly responseTime: ITimeMetrics;
    /** Current operation queue length */
    readonly queueLength: number;
    /** Overall error rate (0-1) */
    readonly errorRate: number;
    /** Overall success rate (0-1) */
    readonly successRate: number;
    /** Detailed error metrics */
    readonly errorMetrics: IBasicErrorMetrics | IErrorMetrics;
    /** Resource utilization metrics */
    readonly resourceUtilization: IResourceMetrics;
    /** Timestamp of metrics collection */
    readonly timestamp: number;
}

// ─── Type Guards ────────────────────────────────────────────────────────────

export const PerformanceMetricsTypeGuards = {
    isTimeMetrics(value: unknown): value is ITimeMetrics {
        if (!value || typeof value !== 'object') return false;
        const metrics = value as unknown as Partial<ITimeMetrics>;

        return !!(
            typeof metrics.total === 'number' &&
            typeof metrics.average === 'number' &&
            typeof metrics.min === 'number' &&
            typeof metrics.max === 'number'
        );
    },

    isThroughputMetrics(value: unknown): value is IThroughputMetrics {
        if (!value || typeof value !== 'object') return false;
        const metrics = value as unknown as Partial<IThroughputMetrics>;

        return !!(
            typeof metrics.operationsPerSecond === 'number' &&
            typeof metrics.dataProcessedPerSecond === 'number'
        );
    },

    isBasicErrorMetrics(value: unknown): value is IBasicErrorMetrics {
        if (!value || typeof value !== 'object') return false;
        const metrics = value as unknown as Partial<IBasicErrorMetrics>;

        return !!(
            typeof metrics.totalErrors === 'number' &&
            typeof metrics.errorRate === 'number'
        );
    },

    isErrorMetrics(value: unknown): value is IErrorMetrics {
        if (!this.isBasicErrorMetrics(value)) return false;
        const metrics = value as unknown as Partial<IErrorMetrics>;

        // Early return if any required property is missing
        if (!metrics.errorDistribution || !metrics.severityDistribution || !metrics.patterns ||
            !metrics.impact || !metrics.recovery || !metrics.prevention || !metrics.trends) {
            return false;
        }

        // Check array properties
        if (!Array.isArray(metrics.patterns)) {
            return false;
        }

        // Check nested objects
        const recovery = metrics.recovery as unknown as Partial<IErrorMetrics['recovery']>;
        if (!recovery || typeof recovery !== 'object' ||
            typeof recovery.meanTimeToRecover !== 'number' ||
            typeof recovery.recoverySuccessRate !== 'number' ||
            typeof recovery.failedRecoveries !== 'number' ||
            !recovery.strategyDistribution || typeof recovery.strategyDistribution !== 'object') {
            return false;
        }

        const prevention = metrics.prevention as unknown as Partial<IErrorMetrics['prevention']>;
        if (!prevention || typeof prevention !== 'object' ||
            typeof prevention.preventedCount !== 'number' ||
            typeof prevention.preventionRate !== 'number' ||
            typeof prevention.earlyWarnings !== 'number') {
            return false;
        }

        const impact = metrics.impact as unknown as Partial<IErrorImpact>;
        if (!impact || typeof impact !== 'object' ||
            typeof impact.businessImpact !== 'number' ||
            typeof impact.userExperienceImpact !== 'number' ||
            typeof impact.systemStabilityImpact !== 'number' ||
            !impact.resourceImpact || typeof impact.resourceImpact !== 'object') {
            return false;
        }

        const trends = metrics.trends as unknown as Partial<IErrorMetrics['trends']>;
        if (!trends || typeof trends !== 'object' ||
            !Array.isArray(trends.dailyRates) ||
            !Array.isArray(trends.weeklyRates) ||
            !Array.isArray(trends.monthlyRates)) {
            return false;
        }

        return true;
    },

    isPerformanceMetrics(value: unknown): value is IPerformanceMetrics {
        if (!value || typeof value !== 'object') return false;
        const metrics = value as unknown as Partial<IPerformanceMetrics>;

        // Early return if any required property is missing
        if (!metrics.executionTime || !metrics.latency || !metrics.throughput ||
            !metrics.responseTime || !metrics.errorMetrics || !metrics.resourceUtilization) {
            return false;
        }

        // Check numeric properties
        if (typeof metrics.queueLength !== 'number' ||
            typeof metrics.errorRate !== 'number' ||
            typeof metrics.successRate !== 'number' ||
            typeof metrics.timestamp !== 'number') {
            return false;
        }

        // Check complex properties
        return !!(
            this.isTimeMetrics(metrics.executionTime) &&
            this.isTimeMetrics(metrics.latency) &&
            this.isThroughputMetrics(metrics.throughput) &&
            this.isTimeMetrics(metrics.responseTime) &&
            this.isBasicErrorMetrics(metrics.errorMetrics) &&
            typeof metrics.resourceUtilization === 'object' &&
            metrics.resourceUtilization !== null
        );
    }
};

// ─── Validation Functions ────────────────────────────────────────────────────

export const PerformanceMetricsValidation = {
    validateTimeMetrics(metrics: unknown): IValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!PerformanceMetricsTypeGuards.isTimeMetrics(metrics)) {
            errors.push('Invalid time metrics structure');
            return createValidationResult(false, errors);
        }

        const timeMetrics = metrics as ITimeMetrics;

        if (timeMetrics.min > timeMetrics.max) {
            errors.push('Minimum value cannot be greater than maximum value');
        }

        if (timeMetrics.average < timeMetrics.min || timeMetrics.average > timeMetrics.max) {
            errors.push('Average value must be between minimum and maximum values');
        }

        if (timeMetrics.total < 0) {
            errors.push('Total time cannot be negative');
        }

        return createValidationResult(errors.length === 0, errors, warnings);
    },

    validateErrorMetrics(metrics: unknown): IValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!PerformanceMetricsTypeGuards.isBasicErrorMetrics(metrics)) {
            errors.push('Invalid error metrics structure');
            return createValidationResult(false, errors);
        }

        const errorMetrics = metrics as IBasicErrorMetrics | IErrorMetrics;

        if (errorMetrics.errorRate < 0 || errorMetrics.errorRate > 1) {
            errors.push('Error rate must be between 0 and 1');
        }

        if (PerformanceMetricsTypeGuards.isErrorMetrics(errorMetrics)) {
            const enhancedMetrics = errorMetrics as IErrorMetrics;
            
            if (enhancedMetrics.recovery.recoverySuccessRate < 0 || enhancedMetrics.recovery.recoverySuccessRate > 1) {
                errors.push('Recovery success rate must be between 0 and 1');
            }

            if (enhancedMetrics.prevention.preventionRate < 0 || enhancedMetrics.prevention.preventionRate > 1) {
                errors.push('Prevention rate must be between 0 and 1');
            }

            if (enhancedMetrics.impact.businessImpact < 0 || enhancedMetrics.impact.businessImpact > 1) {
                errors.push('Business impact must be between 0 and 1');
            }
        }

        return createValidationResult(errors.length === 0, errors, warnings);
    },

    validatePerformanceMetrics(metrics: unknown): IValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!PerformanceMetricsTypeGuards.isPerformanceMetrics(metrics)) {
            errors.push('Invalid performance metrics structure');
            return createValidationResult(false, errors);
        }

        const perfMetrics = metrics as IPerformanceMetrics;

        // Validate time metrics
        const timeMetricsResults = [
            this.validateTimeMetrics(perfMetrics.executionTime),
            this.validateTimeMetrics(perfMetrics.latency),
            this.validateTimeMetrics(perfMetrics.responseTime)
        ];

        timeMetricsResults.forEach(result => {
            errors.push(...result.errors);
            warnings.push(...result.warnings);
        });

        // Validate error metrics
        const errorMetricsResult = this.validateErrorMetrics(perfMetrics.errorMetrics);
        errors.push(...errorMetricsResult.errors);
        warnings.push(...errorMetricsResult.warnings);

        // Validate throughput
        if (perfMetrics.throughput.operationsPerSecond < 0) {
            errors.push('Operations per second cannot be negative');
        }

        if (perfMetrics.throughput.dataProcessedPerSecond < 0) {
            errors.push('Data processed per second cannot be negative');
        }

        if (perfMetrics.queueLength < 0) {
            errors.push('Queue length cannot be negative');
        }

        if (perfMetrics.errorRate < 0 || perfMetrics.errorRate > 1) {
            errors.push('Error rate must be between 0 and 1');
        }

        if (perfMetrics.successRate < 0 || perfMetrics.successRate > 1) {
            errors.push('Success rate must be between 0 and 1');
        }

        if (Math.abs(perfMetrics.errorRate + perfMetrics.successRate - 1) > 0.000001) {
            warnings.push('Error rate and success rate should sum to 1');
        }

        if (perfMetrics.timestamp > Date.now()) {
            warnings.push('Timestamp is in the future');
        }

        return createValidationResult(errors.length === 0, errors, warnings);
    }
};
