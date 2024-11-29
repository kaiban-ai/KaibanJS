/**
 * @file llmMetricTypes.ts
 * @path KaibanJS/src/types/llm/llmMetricTypes.ts
 * @description LLM-specific metric type definitions and validation
 */

import type { IRateLimitMetrics } from '../metrics/base/usageMetrics';
import type { ITimeMetrics, IThroughputMetrics, IErrorMetrics } from '../metrics/base/performanceMetrics';
import { 
    createValidationResult, 
    createValidationError, 
    createValidationWarning,
    createValidationMetadata,
    type ValidationErrorType,
    type ValidationWarningType,
    type IValidationResult
} from '../common/commonValidationTypes';

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
    /** Number of active users */
    readonly activeUsers: number;
    /** Requests processed per second */
    readonly requestsPerSecond: number;
    /** Average response length in tokens */
    readonly averageResponseLength: number;
    /** Average response size in bytes */
    readonly averageResponseSize: number;
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

/**
 * Type guards for LLM metrics
 */
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
            typeof metrics.activeUsers === 'number' &&
            typeof metrics.requestsPerSecond === 'number' &&
            typeof metrics.averageResponseLength === 'number' &&
            typeof metrics.averageResponseSize === 'number' &&
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

/**
 * Validation functions for LLM metrics
 */
export const LLMMetricsValidation = {
    validateLLMResourceMetrics(metrics: unknown): IValidationResult {
        const errors: ValidationErrorType[] = [];
        const warnings: ValidationWarningType[] = [];

        if (!LLMMetricsTypeGuards.isLLMResourceMetrics(metrics)) {
            errors.push(createValidationError({
                code: 'INVALID_STRUCTURE',
                message: '❌ Invalid LLM resource metrics structure'
            }));
        } else {
            if (metrics.cpuUsage < 0 || metrics.cpuUsage > 100) {
                errors.push(createValidationError({
                    code: 'INVALID_CPU_USAGE',
                    message: '❌ CPU usage must be between 0 and 100'
                }));
            }

            if (metrics.memoryUsage < 0) {
                errors.push(createValidationError({
                    code: 'INVALID_MEMORY_USAGE',
                    message: '❌ Memory usage cannot be negative'
                }));
            }

            if (metrics.diskIO.read < 0) {
                errors.push(createValidationError({
                    code: 'INVALID_DISK_READ',
                    message: '❌ Disk read cannot be negative'
                }));
            }

            if (metrics.diskIO.write < 0) {
                errors.push(createValidationError({
                    code: 'INVALID_DISK_WRITE',
                    message: '❌ Disk write cannot be negative'
                }));
            }

            if (metrics.networkUsage.upload < 0) {
                errors.push(createValidationError({
                    code: 'INVALID_NETWORK_UPLOAD',
                    message: '❌ Network upload cannot be negative'
                }));
            }

            if (metrics.networkUsage.download < 0) {
                errors.push(createValidationError({
                    code: 'INVALID_NETWORK_DOWNLOAD',
                    message: '❌ Network download cannot be negative'
                }));
            }

            if (metrics.gpuMemoryUsage < 0) {
                errors.push(createValidationError({
                    code: 'INVALID_GPU_MEMORY',
                    message: '❌ GPU memory usage cannot be negative'
                }));
            }

            if (metrics.modelMemoryAllocation.weights < 0) {
                errors.push(createValidationError({
                    code: 'INVALID_MODEL_WEIGHTS',
                    message: '❌ Model weights memory cannot be negative'
                }));
            }

            if (metrics.modelMemoryAllocation.cache < 0) {
                errors.push(createValidationError({
                    code: 'INVALID_MODEL_CACHE',
                    message: '❌ Model cache memory cannot be negative'
                }));
            }

            if (metrics.modelMemoryAllocation.workspace < 0) {
                errors.push(createValidationError({
                    code: 'INVALID_MODEL_WORKSPACE',
                    message: '❌ Model workspace memory cannot be negative'
                }));
            }

            if (metrics.timestamp > Date.now()) {
                warnings.push(createValidationWarning({
                    code: 'FUTURE_TIMESTAMP',
                    message: '⚠️ Timestamp is in the future'
                }));
            }
        }

        return createValidationResult({
            isValid: errors.length === 0,
            errors,
            warnings,
            metadata: createValidationMetadata({
                component: 'LLMMetricsValidation',
                operation: 'validateResource',
                validatedFields: [
                    'cpuUsage',
                    'memoryUsage',
                    'diskIO',
                    'networkUsage',
                    'gpuMemoryUsage',
                    'modelMemoryAllocation',
                    'timestamp'
                ]
            })
        });
    },

    validateLLMPerformanceMetrics(metrics: unknown): IValidationResult {
        const errors: ValidationErrorType[] = [];
        const warnings: ValidationWarningType[] = [];

        if (!LLMMetricsTypeGuards.isLLMPerformanceMetrics(metrics)) {
            errors.push(createValidationError({
                code: 'INVALID_STRUCTURE',
                message: '❌ Invalid LLM performance metrics structure'
            }));
        } else {
            if (metrics.queueLength < 0) {
                errors.push(createValidationError({
                    code: 'INVALID_QUEUE_LENGTH',
                    message: '❌ Queue length cannot be negative'
                }));
            }

            if (metrics.errorRate < 0 || metrics.errorRate > 100) {
                errors.push(createValidationError({
                    code: 'INVALID_ERROR_RATE',
                    message: '❌ Error rate must be between 0 and 100'
                }));
            }

            if (metrics.successRate < 0 || metrics.successRate > 100) {
                errors.push(createValidationError({
                    code: 'INVALID_SUCCESS_RATE',
                    message: '❌ Success rate must be between 0 and 100'
                }));
            }

            if (metrics.tokensPerSecond < 0) {
                errors.push(createValidationError({
                    code: 'INVALID_TOKENS_PER_SECOND',
                    message: '❌ Tokens per second cannot be negative'
                }));
            }

            if (metrics.coherenceScore < 0 || metrics.coherenceScore > 1) {
                errors.push(createValidationError({
                    code: 'INVALID_COHERENCE_SCORE',
                    message: '❌ Coherence score must be between 0 and 1'
                }));
            }

            if (metrics.temperatureImpact < -1 || metrics.temperatureImpact > 1) {
                errors.push(createValidationError({
                    code: 'INVALID_TEMPERATURE_IMPACT',
                    message: '❌ Temperature impact must be between -1 and 1'
                }));
            }

            if (metrics.timestamp > Date.now()) {
                warnings.push(createValidationWarning({
                    code: 'FUTURE_TIMESTAMP',
                    message: '⚠️ Timestamp is in the future'
                }));
            }
        }

        return createValidationResult({
            isValid: errors.length === 0,
            errors,
            warnings,
            metadata: createValidationMetadata({
                component: 'LLMMetricsValidation',
                operation: 'validatePerformance',
                validatedFields: [
                    'queueLength',
                    'errorRate',
                    'successRate',
                    'tokensPerSecond',
                    'coherenceScore',
                    'temperatureImpact',
                    'timestamp'
                ]
            })
        });
    },

    validateLLMUsageMetrics(metrics: unknown): IValidationResult {
        const errors: ValidationErrorType[] = [];
        const warnings: ValidationWarningType[] = [];

        if (!LLMMetricsTypeGuards.isLLMUsageMetrics(metrics)) {
            errors.push(createValidationError({
                code: 'INVALID_STRUCTURE',
                message: '❌ Invalid LLM usage metrics structure'
            }));
        } else {
            if (metrics.totalRequests < 0) {
                errors.push(createValidationError({
                    code: 'INVALID_TOTAL_REQUESTS',
                    message: '❌ Total requests cannot be negative'
                }));
            }

            if (metrics.activeInstances < 0) {
                errors.push(createValidationError({
                    code: 'INVALID_ACTIVE_INSTANCES',
                    message: '❌ Active instances cannot be negative'
                }));
            }

            if (metrics.activeUsers < 0) {
                errors.push(createValidationError({
                    code: 'INVALID_ACTIVE_USERS',
                    message: '❌ Active users cannot be negative'
                }));
            }

            if (metrics.requestsPerSecond < 0) {
                errors.push(createValidationError({
                    code: 'INVALID_REQUESTS_PER_SECOND',
                    message: '❌ Requests per second cannot be negative'
                }));
            }

            if (metrics.averageResponseLength < 0) {
                errors.push(createValidationError({
                    code: 'INVALID_RESPONSE_LENGTH',
                    message: '❌ Average response length cannot be negative'
                }));
            }

            if (metrics.averageResponseSize < 0) {
                errors.push(createValidationError({
                    code: 'INVALID_RESPONSE_SIZE',
                    message: '❌ Average response size cannot be negative'
                }));
            }

            if (metrics.peakMemoryUsage < 0) {
                errors.push(createValidationError({
                    code: 'INVALID_PEAK_MEMORY',
                    message: '❌ Peak memory usage cannot be negative'
                }));
            }

            if (metrics.uptime < 0) {
                errors.push(createValidationError({
                    code: 'INVALID_UPTIME',
                    message: '❌ Uptime cannot be negative'
                }));
            }

            if (metrics.tokenDistribution.prompt < 0) {
                errors.push(createValidationError({
                    code: 'INVALID_PROMPT_TOKENS',
                    message: '❌ Prompt token count cannot be negative'
                }));
            }

            if (metrics.tokenDistribution.completion < 0) {
                errors.push(createValidationError({
                    code: 'INVALID_COMPLETION_TOKENS',
                    message: '❌ Completion token count cannot be negative'
                }));
            }

            if (metrics.tokenDistribution.total < 0) {
                errors.push(createValidationError({
                    code: 'INVALID_TOTAL_TOKENS',
                    message: '❌ Total token count cannot be negative'
                }));
            }

            if (metrics.tokenDistribution.total !== 
                metrics.tokenDistribution.prompt + metrics.tokenDistribution.completion) {
                errors.push(createValidationError({
                    code: 'INVALID_TOKEN_SUM',
                    message: '❌ Total tokens must equal sum of prompt and completion tokens'
                }));
            }

            if (metrics.modelDistribution.gpt4 < 0) {
                errors.push(createValidationError({
                    code: 'INVALID_GPT4_USAGE',
                    message: '❌ GPT-4 usage count cannot be negative'
                }));
            }

            if (metrics.modelDistribution.gpt35 < 0) {
                errors.push(createValidationError({
                    code: 'INVALID_GPT35_USAGE',
                    message: '❌ GPT-3.5 usage count cannot be negative'
                }));
            }

            if (metrics.modelDistribution.other < 0) {
                errors.push(createValidationError({
                    code: 'INVALID_OTHER_MODELS_USAGE',
                    message: '❌ Other models usage count cannot be negative'
                }));
            }

            if (metrics.timestamp > Date.now()) {
                warnings.push(createValidationWarning({
                    code: 'FUTURE_TIMESTAMP',
                    message: '⚠️ Timestamp is in the future'
                }));
            }
        }

        return createValidationResult({
            isValid: errors.length === 0,
            errors,
            warnings,
            metadata: createValidationMetadata({
                component: 'LLMMetricsValidation',
                operation: 'validateUsage',
                validatedFields: [
                    'totalRequests',
                    'activeInstances',
                    'activeUsers',
                    'requestsPerSecond',
                    'averageResponseLength',
                    'averageResponseSize',
                    'peakMemoryUsage',
                    'uptime',
                    'tokenDistribution',
                    'modelDistribution',
                    'timestamp'
                ]
            })
        });
    },

    validateLLMMetrics(metrics: unknown): IValidationResult {
        const errors: ValidationErrorType[] = [];
        const warnings: ValidationWarningType[] = [];

        if (!LLMMetricsTypeGuards.isLLMMetrics(metrics)) {
            errors.push(createValidationError({
                code: 'INVALID_STRUCTURE',
                message: '❌ Invalid LLM metrics structure'
            }));
        } else {
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
                warnings.push(createValidationWarning({
                    code: 'FUTURE_TIMESTAMP',
                    message: '⚠️ Timestamp is in the future'
                }));
            }
        }

        return createValidationResult({
            isValid: errors.length === 0,
            errors,
            warnings,
            metadata: createValidationMetadata({
                component: 'LLMMetricsValidation',
                operation: 'validateMetrics',
                validatedFields: [
                    'resources',
                    'performance',
                    'usage',
                    'timestamp'
                ]
            })
        });
    }
};
