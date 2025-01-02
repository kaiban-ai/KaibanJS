/**
* @file metricsValidator.ts
* @path src/managers/validation/metricsValidator.ts
* @description Metrics validation implementation for error, system health, team, and task metrics
*
* @module @managers/validation
*/

import { z } from 'zod';
import { CoreManager } from '../core/coreManager';
import { MANAGER_CATEGORY_enum } from '../../types/common/enumTypes';
import { MetricDomain, MetricType } from '../../types/metrics/base/metricsManagerTypes';
import { ERROR_KINDS } from '../../types/common/errorTypes';
import { createBaseMetadata } from '../../types/common/baseTypes';

import type { IErrorMetrics } from '../../types/metrics/base/performanceMetrics';
import type { ISystemHealthMetrics } from '../../types/metrics/base/enhancedMetricsTypes';
import type { IValidationResult } from '../../types/common/validationTypes';
import type { ITeamMetrics } from '../../types/team/teamMetricTypes';
import type { 
    ITaskResourceMetrics,
    ITaskPerformanceMetrics,
    ITaskUsageMetrics
} from '../../types/task/taskMetricTypes';
import { TaskMetricsTypeGuards } from '../../types/task/taskMetricTypes';

// ─── Zod Schemas ────────────────────────────────────────────────────────────

const errorMetricsSchema = z.object({
    errorRate: z.number().min(0).max(1),
    errorDistribution: z.record(z.number().min(0).max(1)),
    severityDistribution: z.record(z.number().min(0).max(1)),
    patterns: z.array(z.object({
        errorKind: z.string(),
        frequency: z.number().min(0),
        meanTimeBetweenErrors: z.number().min(0),
        recoveryStrategies: z.array(z.string())
    })).optional(),
    impact: z.object({
        severity: z.string(),
        businessImpact: z.number().min(0).max(1),
        userExperienceImpact: z.number().min(0).max(1),
        systemStabilityImpact: z.number().min(0).max(1),
        resourceImpact: z.object({
            cpu: z.number().min(0),
            memory: z.number().min(0),
            io: z.number().min(0)
        })
    }).optional()
});

const systemHealthSchema = z.object({
    timestamp: z.number(),
    cpu: z.object({
        usage: z.number().min(0).max(1),
        temperature: z.number().optional(),
        loadAverage: z.array(z.number())
    }),
    memory: z.object({
        used: z.number().min(0),
        total: z.number().min(0),
        free: z.number().min(0)
    }),
    disk: z.object({
        read: z.number().min(0),
        write: z.number().min(0),
        free: z.number().min(0),
        total: z.number().min(0)
    }),
    network: z.object({
        upload: z.number().min(0),
        download: z.number().min(0)
    }),
    processMetrics: z.object({
        uptime: z.number().min(0),
        memoryUsage: z.any(),
        cpuUsage: z.any()
    })
});

const taskResourceMetricsSchema = z.object({
    cpuUsage: z.number().min(0).max(100),
    memoryUsage: z.number().min(0),
    diskIO: z.object({
        read: z.number().min(0),
        write: z.number().min(0)
    }),
    networkUsage: z.object({
        upload: z.number().min(0),
        download: z.number().min(0)
    }),
    timestamp: z.number()
});

const taskPerformanceMetricsSchema = z.object({
    executionTime: z.object({
        total: z.number().min(0),
        average: z.number().min(0),
        min: z.number().min(0),
        max: z.number().min(0)
    }),
    latency: z.object({
        total: z.number().min(0),
        average: z.number().min(0),
        min: z.number().min(0),
        max: z.number().min(0)
    }),
    throughput: z.object({
        operationsPerSecond: z.number().min(0),
        dataProcessedPerSecond: z.number().min(0)
    }),
    responseTime: z.object({
        total: z.number().min(0),
        average: z.number().min(0),
        min: z.number().min(0),
        max: z.number().min(0)
    }),
    queueLength: z.number().min(0),
    errorRate: z.number().min(0).max(100),
    successRate: z.number().min(0).max(100),
    errorMetrics: z.any(),
    resourceUtilization: taskResourceMetricsSchema,
    timestamp: z.number()
});

const taskUsageMetricsSchema = z.object({
    totalRequests: z.number().min(0),
    activeUsers: z.number().min(0),
    requestsPerSecond: z.number().min(0),
    averageResponseSize: z.number().min(0),
    peakMemoryUsage: z.number().min(0),
    uptime: z.number().min(0),
    rateLimit: z.object({
        current: z.number().min(0),
        limit: z.number().min(0),
        remaining: z.number().min(0),
        resetTime: z.number().min(0)
    }),
    timestamp: z.number()
});

// ─── Metrics Validator ─────────────────────────────────────────────────────────

export class MetricsValidator extends CoreManager {
    private static instance: MetricsValidator | null = null;
    public readonly category = MANAGER_CATEGORY_enum.VALIDATION;

    private constructor() {
        super();
        this.registerDomainManager('MetricsValidator', this);
    }

    public static getInstance(): MetricsValidator {
        if (!MetricsValidator.instance) {
            MetricsValidator.instance = new MetricsValidator();
        }
        return MetricsValidator.instance;
    }

    public async validateErrorMetrics(metrics: IErrorMetrics): Promise<IValidationResult> {
        const result = await this.safeExecute(async () => {
            const startTime = Date.now();
            const errors: string[] = [];
            const warnings: string[] = [];

            try {
                await errorMetricsSchema.parseAsync(metrics);
            } catch (error) {
                if (error instanceof z.ZodError) {
                    errors.push(...error.errors.map(e => e.message));
                }
            }

            const totalErrorDist = Object.values(metrics.errorDistribution).reduce((a, b) => a + b, 0);
            if (Math.abs(totalErrorDist - 1) > 0.001) {
                errors.push('Error distribution must sum to 1');
            }

            const totalSeverityDist = Object.values(metrics.severityDistribution).reduce((a, b) => a + b, 0);
            if (Math.abs(totalSeverityDist - 1) > 0.001) {
                errors.push('Severity distribution must sum to 1');
            }

            if (metrics.patterns) {
                metrics.patterns.forEach((pattern, index) => {
                    if (!Object.values(ERROR_KINDS).includes(pattern.errorKind)) {
                        errors.push(`Invalid error kind in pattern ${index}: ${pattern.errorKind}`);
                    }
                });
            }

            await this.metricsManager.trackMetric({
                domain: MetricDomain.WORKFLOW,
                type: MetricType.PERFORMANCE,
                value: Date.now() - startTime,
                timestamp: startTime,
                metadata: {
                    component: this.constructor.name,
                    operation: 'validateErrorMetrics',
                    errors: errors.length,
                    warnings: warnings.length
                }
            });

            return {
                isValid: errors.length === 0,
                errors,
                warnings,
                metadata: createBaseMetadata('MetricsValidator', 'validateErrorMetrics')
            };
        }, 'validateErrorMetrics');

        if (!result.success || !result.data) {
            throw result.metadata.error || new Error('Error metrics validation failed');
        }

        return result.data;
    }

    public async validateSystemHealth(metrics: ISystemHealthMetrics): Promise<IValidationResult> {
        const result = await this.safeExecute(async () => {
            const startTime = Date.now();
            const errors: string[] = [];
            const warnings: string[] = [];

            try {
                await systemHealthSchema.parseAsync(metrics);
            } catch (error) {
                if (error instanceof z.ZodError) {
                    errors.push(...error.errors.map(e => e.message));
                }
            }

            if (metrics.cpu.usage > 0.9) warnings.push('High CPU usage detected');
            if (metrics.cpu.temperature && metrics.cpu.temperature > 80) {
                warnings.push('High CPU temperature detected');
            }

            if (metrics.memory.free / metrics.memory.total < 0.1) {
                warnings.push('Low available memory');
            }
            if (metrics.memory.used > metrics.memory.total) {
                errors.push('Used memory exceeds total memory');
            }

            await this.metricsManager.trackMetric({
                domain: MetricDomain.WORKFLOW,
                type: MetricType.PERFORMANCE,
                value: Date.now() - startTime,
                timestamp: startTime,
                metadata: {
                    component: this.constructor.name,
                    operation: 'validateSystemHealth',
                    errors: errors.length,
                    warnings: warnings.length
                }
            });

            return {
                isValid: errors.length === 0,
                errors,
                warnings,
                metadata: createBaseMetadata('MetricsValidator', 'validateSystemHealth')
            };
        }, 'validateSystemHealth');

        if (!result.success || !result.data) {
            throw result.metadata.error || new Error('System health validation failed');
        }

        return result.data;
    }

    public async validateTaskResourceMetrics(metrics: ITaskResourceMetrics): Promise<IValidationResult> {
        const result = await this.safeExecute(async () => {
            const startTime = Date.now();
            const errors: string[] = [];
            const warnings: string[] = [];

            if (!TaskMetricsTypeGuards.isTaskResourceMetrics(metrics)) {
                errors.push('Invalid task resource metrics structure');
                return {
                    isValid: false,
                    errors,
                    warnings,
                    metadata: createBaseMetadata('MetricsValidator', 'validateTaskResourceMetrics')
                };
            }

            try {
                await taskResourceMetricsSchema.parseAsync(metrics);
            } catch (error) {
                if (error instanceof z.ZodError) {
                    errors.push(...error.errors.map(e => e.message));
                }
            }

            if (metrics.cpuUsage > 90) warnings.push('High CPU usage detected');
            if (metrics.timestamp > Date.now()) warnings.push('Timestamp is in the future');

            await this.metricsManager.trackMetric({
                domain: MetricDomain.TASK,
                type: MetricType.PERFORMANCE,
                value: Date.now() - startTime,
                timestamp: startTime,
                metadata: {
                    component: this.constructor.name,
                    operation: 'validateTaskResourceMetrics',
                    errors: errors.length,
                    warnings: warnings.length
                }
            });

            return {
                isValid: errors.length === 0,
                errors,
                warnings,
                metadata: createBaseMetadata('MetricsValidator', 'validateTaskResourceMetrics')
            };
        }, 'validateTaskResourceMetrics');

        if (!result.success || !result.data) {
            throw result.metadata.error || new Error('Task resource metrics validation failed');
        }

        return result.data;
    }

    public async validateTaskPerformanceMetrics(metrics: ITaskPerformanceMetrics): Promise<IValidationResult> {
        const result = await this.safeExecute(async () => {
            const startTime = Date.now();
            const errors: string[] = [];
            const warnings: string[] = [];

            if (!TaskMetricsTypeGuards.isTaskPerformanceMetrics(metrics)) {
                errors.push('Invalid task performance metrics structure');
                return {
                    isValid: false,
                    errors,
                    warnings,
                    metadata: createBaseMetadata('MetricsValidator', 'validateTaskPerformanceMetrics')
                };
            }

            try {
                await taskPerformanceMetricsSchema.parseAsync(metrics);
            } catch (error) {
                if (error instanceof z.ZodError) {
                    errors.push(...error.errors.map(e => e.message));
                }
            }

            if (metrics.errorRate > 50) warnings.push('High error rate detected');
            if (metrics.successRate + metrics.errorRate > 100) {
                errors.push('Success rate and error rate sum exceeds 100%');
            }
            if (metrics.timestamp > Date.now()) warnings.push('Timestamp is in the future');

            await this.metricsManager.trackMetric({
                domain: MetricDomain.TASK,
                type: MetricType.PERFORMANCE,
                value: Date.now() - startTime,
                timestamp: startTime,
                metadata: {
                    component: this.constructor.name,
                    operation: 'validateTaskPerformanceMetrics',
                    errors: errors.length,
                    warnings: warnings.length
                }
            });

            return {
                isValid: errors.length === 0,
                errors,
                warnings,
                metadata: createBaseMetadata('MetricsValidator', 'validateTaskPerformanceMetrics')
            };
        }, 'validateTaskPerformanceMetrics');

        if (!result.success || !result.data) {
            throw result.metadata.error || new Error('Task performance metrics validation failed');
        }

        return result.data;
    }

    public async validateTaskUsageMetrics(metrics: ITaskUsageMetrics): Promise<IValidationResult> {
        const result = await this.safeExecute(async () => {
            const startTime = Date.now();
            const errors: string[] = [];
            const warnings: string[] = [];

            if (!TaskMetricsTypeGuards.isTaskUsageMetrics(metrics)) {
                errors.push('Invalid task usage metrics structure');
                return {
                    isValid: false,
                    errors,
                    warnings,
                    metadata: createBaseMetadata('MetricsValidator', 'validateTaskUsageMetrics')
                };
            }

            try {
                await taskUsageMetricsSchema.parseAsync(metrics);
            } catch (error) {
                if (error instanceof z.ZodError) {
                    errors.push(...error.errors.map(e => e.message));
                }
            }

            if (metrics.rateLimit.remaining === 0) warnings.push('Rate limit exhausted');
            if (metrics.rateLimit.current > metrics.rateLimit.limit) {
                errors.push('Current rate exceeds limit');
            }
            if (metrics.timestamp > Date.now()) warnings.push('Timestamp is in the future');

            await this.metricsManager.trackMetric({
                domain: MetricDomain.TASK,
                type: MetricType.PERFORMANCE,
                value: Date.now() - startTime,
                timestamp: startTime,
                metadata: {
                    component: this.constructor.name,
                    operation: 'validateTaskUsageMetrics',
                    errors: errors.length,
                    warnings: warnings.length
                }
            });

            return {
                isValid: errors.length === 0,
                errors,
                warnings,
                metadata: createBaseMetadata('MetricsValidator', 'validateTaskUsageMetrics')
            };
        }, 'validateTaskUsageMetrics');

        if (!result.success || !result.data) {
            throw result.metadata.error || new Error('Task usage metrics validation failed');
        }

        return result.data;
    }
}

export default MetricsValidator.getInstance();
