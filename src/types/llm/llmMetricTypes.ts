/**
 * @file llmMetricTypes.ts
 * @path src/types/llm/llmMetricTypes.ts
 * @description LLM-specific metrics type definitions extending base metrics
 */

import { IPerformanceMetrics } from '../metrics/base/performanceMetrics';
import { IUsageMetrics } from '../metrics/base/usageMetrics';
import { IResourceMetrics } from '../metrics/base/resourceMetrics';
import { IErrorKind, IErrorSeverity } from '../common/errorTypes';

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

export interface ILLMErrorMetrics {
    // Basic error tracking
    readonly count: number;
    readonly rate: number;
    readonly lastError: number;
    
    // Error types
    readonly byType: Record<IErrorKind, number>;
    readonly bySeverity: Record<IErrorSeverity, number>;
    
    // Performance impact
    readonly avgLatencyIncrease: number;
    readonly avgMemoryUsage: number;
    readonly avgCpuUsage: number;
    
    // Time windows (last 24h)
    readonly hourlyErrors: number[];
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
            const errorMetrics = llmMetrics.performance.errorMetrics;
            
            if (errorMetrics.rate < 0 || errorMetrics.rate > 1) {
                errors.push('Invalid error rate');
            }
            if (errorMetrics.avgMemoryUsage < 0 || errorMetrics.avgMemoryUsage > 1) {
                errors.push('Invalid average memory usage');
            }
            if (errorMetrics.avgCpuUsage < 0 || errorMetrics.avgCpuUsage > 1) {
                errors.push('Invalid average CPU usage');
            }
            if (errorMetrics.avgLatencyIncrease < 0) {
                errors.push('Invalid average latency increase');
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }
};
