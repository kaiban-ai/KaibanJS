/**
 * @file errorMetrics.ts
 * @path src/types/metrics/base/errorMetrics.ts
 * @description Error-specific metrics type definitions and validation
 */

import { createValidationResult } from '@utils/validation/validationUtils';
import type { IValidationResult } from '../../common/validationTypes';
import { 
    IErrorKind,
    IErrorSeverity,
    ERROR_KINDS 
} from '../../common/errorTypes';
import { 
    RecoveryStrategyType,
    RecoveryPhase,
    IResourceUsage,
    IRecoveryMetrics as IBaseRecoveryMetrics,
    IStrategyMetrics as IBaseStrategyMetrics,
    ITimeBasedMetrics as IBaseTimeBasedMetrics,
    IMetricCount as IBaseMetricCount,
    IErrorPattern as IBaseErrorPattern
} from '../../common/recoveryTypes';
import { ERROR_SEVERITY_enum } from '../../common/enumTypes';
import { 
    ITimeMetrics,
    IThroughputMetrics,
    IErrorMetrics as IBaseErrorMetrics,
    IErrorPattern as IPerformanceErrorPattern,
    IErrorImpact
} from './performanceMetrics';
import { IResourceMetrics } from './resourceMetrics';

// ─── Error Distribution Metrics ────────────────────────────────────────────────

export interface IErrorDistributionMetrics {
    readonly byType: Record<IErrorKind, number>;
    readonly bySeverity: Record<IErrorSeverity, number>;
    readonly byComponent: Record<string, number>;
    readonly byPhase: Record<string, number>;
    readonly byRecoveryStrategy: Record<RecoveryStrategyType, number>;
}

// ─── Error Recovery Metrics ────────────────────────────────────────────────────

export interface IRecoveryMetrics extends Omit<IBaseRecoveryMetrics, 'averageRecoveryTime'> {
    readonly meanTimeToRecover: number;
    readonly recoverySuccessRate: number;
    readonly strategyDistribution: Record<RecoveryStrategyType, number>;
}

export type IStrategyMetrics = IBaseStrategyMetrics;
export type ITimeBasedMetrics = IBaseTimeBasedMetrics;
export type IMetricCount = IBaseMetricCount;

// ─── Error Impact Metrics ─────────────────────────────────────────────────────

export interface IDetailedErrorImpact extends IErrorImpact {
    readonly performance: {
        readonly latencyIncrease: number;
        readonly throughputDecrease: number;
        readonly errorRateIncrease: number;
    };
    readonly resources: {
        readonly cpuSpike: number;
        readonly memoryLeak: number;
        readonly ioOverhead: number;
    };
    readonly service: {
        readonly availability: number;
        readonly reliability: number;
        readonly userSatisfaction: number;
    };
    readonly cost: {
        readonly operational: number;
        readonly recovery: number;
    };
}

// ─── Error Pattern Analysis ────────────────────────────────────────────────────

export interface IDetailedErrorPattern extends IPerformanceErrorPattern {
    readonly context: {
        readonly preconditions: readonly string[];
        readonly triggers: readonly string[];
        readonly symptoms: readonly string[];
    };
    readonly impact: IDetailedErrorImpact;
    readonly trends: {
        readonly frequency: readonly number[];
        readonly impact: readonly number[];
        readonly recovery: readonly number[];
        readonly timestamps: readonly number[];
    };
}

// ─── Comprehensive Error Metrics ─────────────────────────────────────────────────

export interface IEnhancedErrorMetrics extends IBaseErrorMetrics {
    readonly errorDistribution: Record<IErrorKind, number>;
    readonly severityDistribution: Record<IErrorSeverity, number>;
    readonly distribution: IErrorDistributionMetrics;
    readonly patterns: readonly IDetailedErrorPattern[];
    readonly impact: IDetailedErrorImpact;
    readonly recovery: IRecoveryMetrics;
    readonly prevention: {
        readonly preventedCount: number;
        readonly preventionRate: number;
        readonly earlyWarnings: number;
    };
    readonly performance: {
        readonly errorDetection: ITimeMetrics;
        readonly errorHandling: ITimeMetrics;
        readonly errorRecovery: ITimeMetrics;
        readonly throughput: IThroughputMetrics;
    };
    readonly resources: {
        readonly errorHandling: IResourceMetrics;
        readonly recovery: IResourceMetrics;
    };
    readonly trends: {
        readonly dailyRates: readonly number[];
        readonly weeklyRates: readonly number[];
        readonly monthlyRates: readonly number[];
        readonly hourlyRates?: readonly number[];
    };
    readonly analysis: {
        readonly rootCauses: Record<string, number>;
        readonly correlations: ReadonlyArray<{
            readonly factors: readonly string[];
            readonly strength: number;
        }>;
        readonly predictions: ReadonlyArray<{
            readonly pattern: string;
            readonly probability: number;
            readonly timeframe: string;
        }>;
    };
}

// ─── Type Guards ────────────────────────────────────────────────────────────

export const ErrorMetricsTypeGuards = {
    isErrorDistributionMetrics(value: unknown): value is IErrorDistributionMetrics {
        if (!value || typeof value !== 'object') return false;
        const metrics = value as unknown as Partial<IErrorDistributionMetrics>;

        return !!(
            metrics.byType &&
            metrics.bySeverity &&
            metrics.byComponent &&
            metrics.byPhase &&
            metrics.byRecoveryStrategy &&
            typeof metrics.byType === 'object' &&
            typeof metrics.bySeverity === 'object' &&
            typeof metrics.byComponent === 'object' &&
            typeof metrics.byPhase === 'object' &&
            typeof metrics.byRecoveryStrategy === 'object'
        );
    },

    isRecoveryMetrics(value: unknown): value is IRecoveryMetrics {
        if (!value || typeof value !== 'object') return false;
        const metrics = value as unknown as Partial<IRecoveryMetrics>;

        // Early return if any required property is missing
        if (!metrics.strategyMetrics || !metrics.timeBasedMetrics) {
            return false;
        }

        return !!(
            typeof metrics.totalAttempts === 'number' &&
            typeof metrics.successfulRecoveries === 'number' &&
            typeof metrics.failedRecoveries === 'number' &&
            typeof metrics.meanTimeToRecover === 'number' &&
            typeof metrics.recoverySuccessRate === 'number' &&
            typeof metrics.strategyMetrics === 'object' &&
            typeof metrics.timeBasedMetrics === 'object'
        );
    },

    isDetailedErrorImpact(value: unknown): value is IDetailedErrorImpact {
        if (!value || typeof value !== 'object') return false;
        const impact = value as unknown as Partial<IDetailedErrorImpact>;

        // Early return if any required property is missing
        if (!impact.performance || !impact.resources || !impact.service || !impact.cost) {
            return false;
        }

        // Check nested objects
        const performance = impact.performance as unknown as Partial<IDetailedErrorImpact['performance']>;
        const resources = impact.resources as unknown as Partial<IDetailedErrorImpact['resources']>;
        const service = impact.service as unknown as Partial<IDetailedErrorImpact['service']>;
        const cost = impact.cost as unknown as Partial<IDetailedErrorImpact['cost']>;

        return !!(
            typeof performance.latencyIncrease === 'number' &&
            typeof performance.throughputDecrease === 'number' &&
            typeof performance.errorRateIncrease === 'number' &&
            typeof resources.cpuSpike === 'number' &&
            typeof resources.memoryLeak === 'number' &&
            typeof resources.ioOverhead === 'number' &&
            typeof service.availability === 'number' &&
            typeof service.reliability === 'number' &&
            typeof service.userSatisfaction === 'number' &&
            typeof cost.operational === 'number' &&
            typeof cost.recovery === 'number'
        );
    },

    isDetailedErrorPattern(value: unknown): value is IDetailedErrorPattern {
        if (!value || typeof value !== 'object') return false;
        const pattern = value as unknown as Partial<IDetailedErrorPattern>;

        // Early return if any required property is missing
        if (!pattern.context || !pattern.impact || !pattern.trends) {
            return false;
        }

        // Check nested objects
        const context = pattern.context as unknown as Partial<IDetailedErrorPattern['context']>;
        const trends = pattern.trends as unknown as Partial<IDetailedErrorPattern['trends']>;

        // Check array properties
        if (!Array.isArray(context.preconditions) ||
            !Array.isArray(context.triggers) ||
            !Array.isArray(context.symptoms) ||
            !Array.isArray(trends.frequency) ||
            !Array.isArray(trends.impact) ||
            !Array.isArray(trends.recovery) ||
            !Array.isArray(trends.timestamps)) {
            return false;
        }

        return !!(this.isDetailedErrorImpact(pattern.impact));
    },

    isEnhancedErrorMetrics(value: unknown): value is IEnhancedErrorMetrics {
        if (!value || typeof value !== 'object') return false;
        const metrics = value as unknown as Partial<IEnhancedErrorMetrics>;
        
        // Early return if any required property is missing
        if (!metrics.distribution || !metrics.patterns || !metrics.impact ||
            !metrics.recovery || !metrics.performance ||
            !metrics.resources || !metrics.trends || !metrics.analysis) {
            return false;
        }

        // Check array properties
        if (!Array.isArray(metrics.patterns) ||
            !Array.isArray(metrics.trends.dailyRates) ||
            !Array.isArray(metrics.trends.weeklyRates) ||
            !Array.isArray(metrics.trends.monthlyRates) ||
            !Array.isArray(metrics.analysis.correlations) ||
            !Array.isArray(metrics.analysis.predictions)) {
            return false;
        }

        // Check nested objects
        const performance = metrics.performance as unknown as Partial<IEnhancedErrorMetrics['performance']>;
        const resources = metrics.resources as unknown as Partial<IEnhancedErrorMetrics['resources']>;

        if (!performance.errorDetection || !performance.errorHandling ||
            !performance.errorRecovery || !performance.throughput ||
            !resources.errorHandling || !resources.recovery) {
            return false;
        }

        return !!(
            this.isErrorDistributionMetrics(metrics.distribution) &&
            metrics.patterns.every(pattern => this.isDetailedErrorPattern(pattern)) &&
            this.isDetailedErrorImpact(metrics.impact) &&
            this.isRecoveryMetrics(metrics.recovery)
        );
    }
};

// ─── Validation Functions ────────────────────────────────────────────────────

export const ErrorMetricsValidation = {
    validateErrorDistributionMetrics(metrics: unknown): IValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!ErrorMetricsTypeGuards.isErrorDistributionMetrics(metrics)) {
            errors.push('Invalid error distribution metrics structure');
            return createValidationResult(false, errors);
        }

        // Validate distribution totals match
        const totalByType = Object.values(metrics.byType).reduce<number>((sum, val) => sum + (val as number), 0);
        const totalBySeverity = Object.values(metrics.bySeverity).reduce<number>((sum, val) => sum + (val as number), 0);
        const totalByComponent = Object.values(metrics.byComponent).reduce<number>((sum, val) => sum + (val as number), 0);

        if (totalByType !== totalBySeverity || totalByType !== totalByComponent) {
            warnings.push('Error distribution totals do not match across categories');
        }

        return createValidationResult(errors.length === 0, errors, warnings);
    },

    validateRecoveryMetrics(metrics: unknown): IValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!ErrorMetricsTypeGuards.isRecoveryMetrics(metrics)) {
            errors.push('Invalid recovery metrics structure');
            return createValidationResult(false, errors);
        }

        // Validate success rate calculation
        const expectedSuccessRate = metrics.successfulRecoveries / (metrics.totalAttempts || 1);
        if (Math.abs(metrics.recoverySuccessRate - expectedSuccessRate) > 0.000001) {
            errors.push('Recovery success rate does not match successes/attempts ratio');
        }

        // Validate failures count
        if (metrics.failedRecoveries !== metrics.totalAttempts - metrics.successfulRecoveries) {
            errors.push('Failed recoveries count does not match total attempts minus successful recoveries');
        }

        // Validate rate limits
        if (metrics.recoverySuccessRate < 0 || metrics.recoverySuccessRate > 1) {
            errors.push('Recovery success rate must be between 0 and 1');
        }

        // Validate strategy metrics
        const totalStrategyAttempts = Object.values(metrics.strategyMetrics)
            .reduce<number>((sum, val) => sum + val.attempts, 0);
        if (totalStrategyAttempts !== metrics.totalAttempts) {
            warnings.push('Strategy metrics total attempts does not match total attempts');
        }

        return createValidationResult(errors.length === 0, errors, warnings);
    },

    validateDetailedErrorImpact(metrics: unknown): IValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!ErrorMetricsTypeGuards.isDetailedErrorImpact(metrics)) {
            errors.push('Invalid detailed error impact metrics structure');
            return createValidationResult(false, errors);
        }

        // Validate rate limits
        if (metrics.service.availability < 0 || metrics.service.availability > 1) {
            errors.push('Service availability must be between 0 and 1');
        }

        if (metrics.service.reliability < 0 || metrics.service.reliability > 1) {
            errors.push('Service reliability must be between 0 and 1');
        }

        if (metrics.service.userSatisfaction < 0 || metrics.service.userSatisfaction > 1) {
            errors.push('User satisfaction must be between 0 and 1');
        }

        // Validate resource impact
        if (metrics.resources.cpuSpike < 0) {
            errors.push('CPU spike cannot be negative');
        }

        if (metrics.resources.memoryLeak < 0) {
            errors.push('Memory leak cannot be negative');
        }

        if (metrics.resources.ioOverhead < 0) {
            errors.push('IO overhead cannot be negative');
        }

        // Validate cost relationships
        const totalCost = metrics.cost.operational + metrics.cost.recovery;
        if (totalCost < 0) {
            errors.push('Total cost cannot be negative');
        }

        return createValidationResult(errors.length === 0, errors, warnings);
    },

    validateDetailedErrorPattern(metrics: unknown): IValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!ErrorMetricsTypeGuards.isDetailedErrorPattern(metrics)) {
            errors.push('Invalid detailed error pattern metrics structure');
            return createValidationResult(false, errors);
        }

        // Validate trend arrays
        if (metrics.trends.frequency.length !== metrics.trends.timestamps.length) {
            errors.push('Frequency and timestamp arrays must have the same length');
        }

        if (metrics.trends.impact.length !== metrics.trends.timestamps.length) {
            errors.push('Impact and timestamp arrays must have the same length');
        }

        if (metrics.trends.recovery.length !== metrics.trends.timestamps.length) {
            errors.push('Recovery and timestamp arrays must have the same length');
        }

        // Validate impact metrics
        const impactValidation = this.validateDetailedErrorImpact(metrics.impact);
        errors.push(...impactValidation.errors);
        warnings.push(...impactValidation.warnings);

        return createValidationResult(errors.length === 0, errors, warnings);
    },

    validateEnhancedErrorMetrics(metrics: unknown): IValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!ErrorMetricsTypeGuards.isEnhancedErrorMetrics(metrics)) {
            errors.push('Invalid enhanced error metrics structure');
            return createValidationResult(false, errors);
        }

        // Validate component metrics
        const validations = [
            this.validateErrorDistributionMetrics(metrics.distribution),
            this.validateDetailedErrorImpact(metrics.impact),
            this.validateRecoveryMetrics(metrics.recovery)
        ];

        validations.forEach(result => {
            errors.push(...result.errors);
            warnings.push(...result.warnings);
        });

        // Validate patterns
        metrics.patterns.forEach((pattern: IDetailedErrorPattern, index: number) => {
            const patternValidation = this.validateDetailedErrorPattern(pattern);
            patternValidation.errors.forEach(error => 
                errors.push(`Pattern ${index}: ${error}`));
            patternValidation.warnings.forEach(warning => 
                warnings.push(`Pattern ${index}: ${warning}`));
        });

        // Validate trend arrays
        if (metrics.trends.dailyRates.length !== metrics.trends.weeklyRates.length) {
            warnings.push('Daily and weekly trend arrays have different lengths');
        }

        if (metrics.trends.monthlyRates.length !== metrics.trends.weeklyRates.length) {
            warnings.push('Monthly and weekly trend arrays have different lengths');
        }

        // Validate analysis
        if (metrics.analysis.correlations.some((c: { strength: number }) => c.strength < -1 || c.strength > 1)) {
            errors.push('Correlation strength must be between -1 and 1');
        }

        if (metrics.analysis.predictions.some((p: { probability: number }) => p.probability < 0 || p.probability > 1)) {
            errors.push('Prediction probability must be between 0 and 1');
        }

        return createValidationResult(errors.length === 0, errors, warnings);
    }
};
