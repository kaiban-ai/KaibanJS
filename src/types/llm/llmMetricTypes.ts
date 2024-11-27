/**
 * @file llmMetricTypes.ts
 * @path KaibanJS/src/types/llm/llmMetricTypes.ts
 * @description LLM-specific metric type definitions
 */

import type { IRateLimitMetrics } from '../metrics/base/usageMetrics';
import type { ITimeMetrics, IThroughputMetrics, IErrorMetrics } from '../metrics/base/performanceMetrics';
import { createValidationResult } from '@utils/validation/validationUtils';
import type { IValidationResult } from '../common/commonValidationTypes';

/**
 * LLM-specific resource metrics
 */
export interface ILLMResourceMetrics {
    /** CPU usage percentage */
    readonly cpuUsage: number;
    /** Memory usage in bytes */
    readonly memoryUsage: number;
    /** Disk I/O statistics */
    readonly diskIO: {
        readonly read: number;
        readonly write: number;
    };
    /** Network usage statistics */
    readonly networkUsage: {
        readonly upload: number;
        readonly download: number;
    };
    /** GPU memory usage in bytes */
    readonly gpuMemoryUsage: number;
    /** Model memory allocation */
    readonly modelMemoryAllocation: {
        readonly weights: number;
        readonly cache: number;
        readonly workspace: number;
    };
    /** Timestamp of metrics collection */
    readonly timestamp: number;
}

/**
 * LLM-specific performance metrics
 */
export interface ILLMPerformanceMetrics {
    /** Time spent in execution phases */
    readonly executionTime: ITimeMetrics;
    /** Network latency metrics */
    readonly latency: ITimeMetrics;
    /** Throughput metrics */
    readonly throughput: IThroughputMetrics;
    /** Response time metrics */
    readonly responseTime: ITimeMetrics;
    /** Current inference queue length */
    readonly queueLength: number;
    /** Error rate percentage */
    readonly errorRate: number;
    /** Success rate percentage */
    readonly successRate: number;
    /** Error-related metrics */
    readonly errorMetrics: IErrorMetrics;
    /** Resource utilization metrics */
    readonly resourceUtilization: ILLMResourceMetrics;
    /** Tokens per second processing rate */
    readonly tokensPerSecond: number;
    /** Average response coherence score */
    readonly coherenceScore: number;
    /** Model temperature performance impact */
    readonly temperatureImpact: number;
    /** Timestamp of metrics collection */
    readonly timestamp: number;
}

/**
 * LLM-specific usage metrics
 */
export interface ILLMUsageMetrics {
    /** Total number of inference requests */
    readonly totalRequests: number;
    /** Number of active model instances */
    readonly activeInstances: number;
    /** Requests processed per second */
    readonly requestsPerSecond: number;
    /** Average response length in tokens */
    readonly averageResponseLength: number;
    /** Peak memory usage in bytes */
    readonly peakMemoryUsage: number;
    /** System uptime in seconds */
    readonly uptime: number;
    /** Rate limit information */
    readonly rateLimit: IRateLimitMetrics;
    /** Token usage distribution */
    readonly tokenDistribution: {
        readonly prompt: number;
        readonly completion: number;
        readonly total: number;
    };
    /** Model usage distribution */
    readonly modelDistribution: {
        readonly gpt4: number;
        readonly gpt35: number;
        readonly other: number;
    };
    /** Timestamp of metrics collection */
    readonly timestamp: number;
}

/**
 * Combined LLM metrics interface
 */
export interface ILLMMetrics {
    /** Resource usage metrics */
    readonly resources: ILLMResourceMetrics;
    /** Performance metrics */
    readonly performance: ILLMPerformanceMetrics;
    /** Usage metrics */
    readonly usage: ILLMUsageMetrics;
    /** Timestamp of metrics collection */
    readonly timestamp: number;
}

export const LLMMetricsTypeGuards = {
    isLLMResourceMetrics: (value: unknown): value is ILLMResourceMetrics => {
        if (typeof value !== 'object' || value === null) return false;
        const metrics = value as Partial<ILLMResourceMetrics>;

        return (
            typeof metrics.cpuUsage === 'number' &&
            typeof metrics.memoryUsage === 'number' &&
            typeof metrics.diskIO === 'object' &&
            metrics.diskIO !== null &&
            typeof metrics.diskIO.read === 'number' &&
            typeof metrics.diskIO.write === 'number' &&
            typeof metrics.networkUsage === 'object' &&
            metrics.networkUsage !== null &&
            typeof metrics.networkUsage.upload === 'number' &&
            typeof metrics.networkUsage.download === 'number' &&
            typeof metrics.gpuMemoryUsage === 'number' &&
            typeof metrics.modelMemoryAllocation === 'object' &&
            metrics.modelMemoryAllocation !== null &&
            typeof metrics.modelMemoryAllocation.weights === 'number' &&
            typeof metrics.modelMemoryAllocation.cache === 'number' &&
            typeof metrics.modelMemoryAllocation.workspace === 'number' &&
            typeof metrics.timestamp === 'number'
        );
    },

    isLLMPerformanceMetrics: (value: unknown): value is ILLMPerformanceMetrics => {
        if (typeof value !== 'object' || value === null) return false;
        const metrics = value as Partial<ILLMPerformanceMetrics>;

        return (
            typeof metrics.executionTime === 'object' &&
            metrics.executionTime !== null &&
            typeof metrics.latency === 'object' &&
            metrics.latency !== null &&
            typeof metrics.throughput === 'object' &&
            metrics.throughput !== null &&
            typeof metrics.responseTime === 'object' &&
            metrics.responseTime !== null &&
            typeof metrics.queueLength === 'number' &&
            typeof metrics.errorRate === 'number' &&
            typeof metrics.successRate === 'number' &&
            typeof metrics.errorMetrics === 'object' &&
            metrics.errorMetrics !== null &&
            typeof metrics.resourceUtilization === 'object' &&
            metrics.resourceUtilization !== null &&
            typeof metrics.tokensPerSecond === 'number' &&
            typeof metrics.coherenceScore === 'number' &&
            typeof metrics.temperatureImpact === 'number' &&
            typeof metrics.timestamp === 'number'
        );
    },

    isLLMUsageMetrics: (value: unknown): value is ILLMUsageMetrics => {
        if (typeof value !== 'object' || value === null) return false;
        const metrics = value as Partial<ILLMUsageMetrics>;

        return (
            typeof metrics.totalRequests === 'number' &&
            typeof metrics.activeInstances === 'number' &&
            typeof metrics.requestsPerSecond === 'number' &&
            typeof metrics.averageResponseLength === 'number' &&
            typeof metrics.peakMemoryUsage === 'number' &&
            typeof metrics.uptime === 'number' &&
            typeof metrics.rateLimit === 'object' &&
            metrics.rateLimit !== null &&
            typeof metrics.tokenDistribution === 'object' &&
            metrics.tokenDistribution !== null &&
            typeof metrics.tokenDistribution.prompt === 'number' &&
            typeof metrics.tokenDistribution.completion === 'number' &&
            typeof metrics.tokenDistribution.total === 'number' &&
            typeof metrics.modelDistribution === 'object' &&
            metrics.modelDistribution !== null &&
            typeof metrics.modelDistribution.gpt4 === 'number' &&
            typeof metrics.modelDistribution.gpt35 === 'number' &&
            typeof metrics.modelDistribution.other === 'number' &&
            typeof metrics.timestamp === 'number'
        );
    },

    isLLMMetrics: (value: unknown): value is ILLMMetrics => {
        if (typeof value !== 'object' || value === null) return false;
        const metrics = value as Partial<ILLMMetrics>;

        return (
            typeof metrics.resources === 'object' &&
            metrics.resources !== null &&
            LLMMetricsTypeGuards.isLLMResourceMetrics(metrics.resources) &&
            typeof metrics.performance === 'object' &&
            metrics.performance !== null &&
            LLMMetricsTypeGuards.isLLMPerformanceMetrics(metrics.performance) &&
            typeof metrics.usage === 'object' &&
            metrics.usage !== null &&
            LLMMetricsTypeGuards.isLLMUsageMetrics(metrics.usage) &&
            typeof metrics.timestamp === 'number'
        );
    }
};

export const LLMMetricsValidation = {
    validateLLMResourceMetrics(metrics: unknown): IValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!LLMMetricsTypeGuards.isLLMResourceMetrics(metrics)) {
            errors.push('Invalid LLM resource metrics structure');
            return createValidationResult(false, errors);
        }

        if (metrics.cpuUsage < 0 || metrics.cpuUsage > 100) {
            errors.push('CPU usage must be between 0 and 100');
        }

        if (metrics.memoryUsage < 0) {
            errors.push('Memory usage cannot be negative');
        }

        if (metrics.diskIO.read < 0) {
            errors.push('Disk read cannot be negative');
        }

        if (metrics.diskIO.write < 0) {
            errors.push('Disk write cannot be negative');
        }

        if (metrics.networkUsage.upload < 0) {
            errors.push('Network upload cannot be negative');
        }

        if (metrics.networkUsage.download < 0) {
            errors.push('Network download cannot be negative');
        }

        if (metrics.gpuMemoryUsage < 0) {
            errors.push('GPU memory usage cannot be negative');
        }

        if (metrics.modelMemoryAllocation.weights < 0) {
            errors.push('Model weights memory cannot be negative');
        }

        if (metrics.modelMemoryAllocation.cache < 0) {
            errors.push('Model cache memory cannot be negative');
        }

        if (metrics.modelMemoryAllocation.workspace < 0) {
            errors.push('Model workspace memory cannot be negative');
        }

        if (metrics.timestamp > Date.now()) {
            warnings.push('Timestamp is in the future');
        }

        return createValidationResult(errors.length === 0, errors, warnings);
    },

    validateLLMPerformanceMetrics(metrics: unknown): IValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!LLMMetricsTypeGuards.isLLMPerformanceMetrics(metrics)) {
            errors.push('Invalid LLM performance metrics structure');
            return createValidationResult(false, errors);
        }

        if (metrics.queueLength < 0) {
            errors.push('Queue length cannot be negative');
        }

        if (metrics.errorRate < 0 || metrics.errorRate > 100) {
            errors.push('Error rate must be between 0 and 100');
        }

        if (metrics.successRate < 0 || metrics.successRate > 100) {
            errors.push('Success rate must be between 0 and 100');
        }

        if (metrics.tokensPerSecond < 0) {
            errors.push('Tokens per second cannot be negative');
        }

        if (metrics.coherenceScore < 0 || metrics.coherenceScore > 1) {
            errors.push('Coherence score must be between 0 and 1');
        }

        if (metrics.temperatureImpact < -1 || metrics.temperatureImpact > 1) {
            errors.push('Temperature impact must be between -1 and 1');
        }

        if (metrics.timestamp > Date.now()) {
            warnings.push('Timestamp is in the future');
        }

        return createValidationResult(errors.length === 0, errors, warnings);
    },

    validateLLMUsageMetrics(metrics: unknown): IValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!LLMMetricsTypeGuards.isLLMUsageMetrics(metrics)) {
            errors.push('Invalid LLM usage metrics structure');
            return createValidationResult(false, errors);
        }

        if (metrics.totalRequests < 0) {
            errors.push('Total requests cannot be negative');
        }

        if (metrics.activeInstances < 0) {
            errors.push('Active instances cannot be negative');
        }

        if (metrics.requestsPerSecond < 0) {
            errors.push('Requests per second cannot be negative');
        }

        if (metrics.averageResponseLength < 0) {
            errors.push('Average response length cannot be negative');
        }

        if (metrics.peakMemoryUsage < 0) {
            errors.push('Peak memory usage cannot be negative');
        }

        if (metrics.uptime < 0) {
            errors.push('Uptime cannot be negative');
        }

        if (metrics.tokenDistribution.prompt < 0) {
            errors.push('Prompt token count cannot be negative');
        }

        if (metrics.tokenDistribution.completion < 0) {
            errors.push('Completion token count cannot be negative');
        }

        if (metrics.tokenDistribution.total < 0) {
            errors.push('Total token count cannot be negative');
        }

        if (metrics.tokenDistribution.total !== 
            metrics.tokenDistribution.prompt + metrics.tokenDistribution.completion) {
            errors.push('Total tokens must equal sum of prompt and completion tokens');
        }

        if (metrics.modelDistribution.gpt4 < 0) {
            errors.push('GPT-4 usage count cannot be negative');
        }

        if (metrics.modelDistribution.gpt35 < 0) {
            errors.push('GPT-3.5 usage count cannot be negative');
        }

        if (metrics.modelDistribution.other < 0) {
            errors.push('Other models usage count cannot be negative');
        }

        if (metrics.timestamp > Date.now()) {
            warnings.push('Timestamp is in the future');
        }

        return createValidationResult(errors.length === 0, errors, warnings);
    },

    validateLLMMetrics(metrics: unknown): IValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!LLMMetricsTypeGuards.isLLMMetrics(metrics)) {
            errors.push('Invalid LLM metrics structure');
            return createValidationResult(false, errors);
        }

        const resourceResult = this.validateLLMResourceMetrics(metrics.resources);
        errors.push(...resourceResult.errors);
        warnings.push(...resourceResult.warnings);

        const performanceResult = this.validateLLMPerformanceMetrics(metrics.performance);
        errors.push(...performanceResult.errors);
        warnings.push(...performanceResult.warnings);

        const usageResult = this.validateLLMUsageMetrics(metrics.usage);
        errors.push(...usageResult.errors);
        warnings.push(...usageResult.warnings);

        if (metrics.timestamp > Date.now()) {
            warnings.push('Timestamp is in the future');
        }

        return createValidationResult(errors.length === 0, errors, warnings);
    }
};
