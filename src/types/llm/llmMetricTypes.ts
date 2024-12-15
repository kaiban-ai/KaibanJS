/**
 * @file llmMetricTypes.ts
 * @path src/types/llm/llmMetricTypes.ts
 * @description LLM-specific metrics type definitions extending base metrics
 */

import { 
    ITimeMetrics, 
    IThroughputMetrics, 
    IErrorMetrics, 
    IPerformanceMetrics,
    IErrorPattern,
    IErrorImpact
} from '../metrics/base/performanceMetrics';
import { IUsageMetrics, IRateLimitMetrics } from '../metrics/base/usageMetrics';
import { IResourceMetrics } from '../metrics/base/resourceMetrics';
import { IErrorKind, IErrorSeverity } from '../common/errorTypes';
import { RecoveryStrategyType } from '../common/recoveryTypes';

// ─── LLM-Specific Metrics ────────────────────────────────────────────────────

export interface ITokenDistribution {
    readonly prompt: number;
    readonly completion: number;
    readonly total: number;
}

export interface IModelDistribution {
    readonly gpt4: number;
    readonly gpt35: number;
    readonly other: number;
}

export interface ILLMUsageMetrics extends IUsageMetrics {
    readonly tokenDistribution: ITokenDistribution;
    readonly modelDistribution: IModelDistribution;
    readonly activeInstances: number;
}

export interface ILLMResourceMetrics extends IResourceMetrics {
    readonly gpuMemoryUsage: number;
    readonly modelMemoryAllocation: {
        readonly weights: number;
        readonly cache: number;
        readonly workspace: number;
    };
}

export interface ILLMErrorMetrics extends IErrorMetrics {
    readonly errorDistribution: Record<IErrorKind, number>;
    readonly severityDistribution: Record<IErrorSeverity, number>;
    readonly patterns: readonly IErrorPattern[];
    readonly impact: IErrorImpact;
    readonly recovery: {
        readonly meanTimeToRecover: number;
        readonly recoverySuccessRate: number;
        readonly strategyDistribution: Record<RecoveryStrategyType, number>;
        readonly failedRecoveries: number;
    };
    readonly prevention: {
        readonly preventedCount: number;
        readonly preventionRate: number;
        readonly earlyWarnings: number;
    };
    readonly trends: {
        readonly dailyRates: readonly number[];
        readonly weeklyRates: readonly number[];
        readonly monthlyRates: readonly number[];
    };
}

export interface ILLMPerformanceMetrics extends IPerformanceMetrics {
    readonly tokensPerSecond: number;
    readonly coherenceScore: number;
    readonly temperatureImpact: number;
    readonly errorMetrics: ILLMErrorMetrics;
}

export interface ILLMMetrics {
    readonly resources: ILLMResourceMetrics;
    readonly performance: ILLMPerformanceMetrics;
    readonly usage: ILLMUsageMetrics;
    readonly timestamp: number;
}

// ─── Validation ────────────────────────────────────────────────────────────

export const LLMMetricsValidation = {
    validateLLMMetrics(metrics: unknown): { isValid: boolean; errors: string[]; warnings: string[] } {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!metrics || typeof metrics !== 'object') {
            errors.push('Invalid metrics object');
            return { isValid: false, errors, warnings };
        }

        const llmMetrics = metrics as ILLMMetrics;

        // Validate token distribution
        if (!llmMetrics.usage.tokenDistribution) {
            errors.push('Missing token distribution');
        } else {
            const { prompt, completion, total } = llmMetrics.usage.tokenDistribution;
            if (prompt + completion !== total) {
                warnings.push('Token distribution sum mismatch');
            }
        }

        // Validate model distribution
        if (!llmMetrics.usage.modelDistribution) {
            errors.push('Missing model distribution');
        }

        // Validate GPU memory usage
        if (llmMetrics.resources.gpuMemoryUsage < 0) {
            errors.push('Invalid GPU memory usage');
        }

        // Validate model memory allocation
        if (!llmMetrics.resources.modelMemoryAllocation) {
            errors.push('Missing model memory allocation');
        } else {
            const { weights, cache, workspace } = llmMetrics.resources.modelMemoryAllocation;
            if (weights < 0 || cache < 0 || workspace < 0) {
                errors.push('Invalid model memory allocation values');
            }
        }

        // Validate performance metrics
        if (llmMetrics.performance.tokensPerSecond < 0) {
            errors.push('Invalid tokens per second');
        }
        if (llmMetrics.performance.coherenceScore < 0 || llmMetrics.performance.coherenceScore > 1) {
            errors.push('Invalid coherence score');
        }

        // Validate error metrics
        if (!llmMetrics.performance.errorMetrics) {
            errors.push('Missing error metrics');
        } else {
            const { errorRate, recoverySuccessRate, preventionRate } = llmMetrics.performance.errorMetrics;
            if (errorRate < 0 || errorRate > 1) {
                errors.push('Invalid error rate');
            }
            if (recoverySuccessRate < 0 || recoverySuccessRate > 1) {
                errors.push('Invalid recovery success rate');
            }
            if (preventionRate < 0 || preventionRate > 1) {
                errors.push('Invalid prevention rate');
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }
};
