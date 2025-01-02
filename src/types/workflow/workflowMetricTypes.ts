/**
 * @file workflowMetricTypes.ts
 * @path src/types/workflow/workflowMetricTypes.ts
 * @description Workflow-specific metric type definitions
 *
 * @module @types/workflow
 */

import type { IUsageMetrics } from '../metrics/base/usageMetrics';
import type { ITimeMetrics, IThroughputMetrics } from '../metrics/base/performanceMetrics';
import type { IValidationResult } from '../common/validationTypes';
import { createValidationResult } from '../common/validationTypes';

// ─── Resource Metrics ─────────────────────────────────────────────────────────

/**
 * Workflow-specific resource metrics
 */
export interface IWorkflowResourceMetrics {
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
    /** Number of concurrent workflows */
    readonly concurrentWorkflows: number;
    /** Resource allocation per workflow */
    readonly resourceAllocation: {
        readonly cpu: number;
        readonly memory: number;
    };
    /** Timestamp of metrics collection */
    readonly timestamp: number;
}

// ─── Performance Metrics ───────────────────────────────────────────────────────

/**
 * Workflow-specific performance metrics
 */
export interface IWorkflowPerformanceMetrics {
    /** Time spent in execution phases */
    readonly executionTime: ITimeMetrics;
    /** Network latency metrics */
    readonly latency: ITimeMetrics;
    /** Throughput metrics */
    readonly throughput: IThroughputMetrics;
    /** Response time metrics */
    readonly responseTime: ITimeMetrics;
    /** Current workflow queue length */
    readonly queueLength: number;
    /** Error rate percentage */
    readonly errorRate: number;
    /** Success rate percentage */
    readonly successRate: number;
    /** Resource utilization metrics */
    readonly resourceUtilization: IWorkflowResourceMetrics;
    /** Workflow completion rate */
    readonly completionRate: number;
    /** Average steps per workflow */
    readonly averageStepsPerWorkflow: number;
    /** Timestamp of metrics collection */
    readonly timestamp: number;
}

// ─── Usage Metrics ────────────────────────────────────────────────────────────

/**
 * Workflow-specific usage metrics
 * Extends IUsageMetrics to include workflow-specific metrics while maintaining base usage metrics
 */
export interface IWorkflowUsageMetrics extends IUsageMetrics {
    /** Total number of workflow executions */
    readonly totalExecutions: number;
    /** Number of active workflows */
    readonly activeWorkflows: number;
    /** Workflows processed per second */
    readonly workflowsPerSecond: number;
    /** Average workflow complexity score */
    readonly averageComplexity: number;
    /** Workflow distribution by type */
    readonly workflowDistribution: {
        readonly sequential: number;
        readonly parallel: number;
        readonly conditional: number;
    };
}

// ─── Type Guards ────────────────────────────────────────────────────────────

/**
 * Type guards for workflow metrics
 */
export const WorkflowMetricsTypeGuards = {
    isWorkflowResourceMetrics: (value: unknown): value is IWorkflowResourceMetrics => {
        if (typeof value !== 'object' || value === null) return false;
        const metrics = value as Partial<IWorkflowResourceMetrics>;

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
            typeof metrics.concurrentWorkflows === 'number' &&
            typeof metrics.resourceAllocation === 'object' &&
            metrics.resourceAllocation !== null &&
            typeof metrics.resourceAllocation.cpu === 'number' &&
            typeof metrics.resourceAllocation.memory === 'number' &&
            typeof metrics.timestamp === 'number'
        );
    },

    isWorkflowPerformanceMetrics: (value: unknown): value is IWorkflowPerformanceMetrics => {
        if (typeof value !== 'object' || value === null) return false;
        const metrics = value as Partial<IWorkflowPerformanceMetrics>;

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
            typeof metrics.resourceUtilization === 'object' &&
            metrics.resourceUtilization !== null &&
            typeof metrics.completionRate === 'number' &&
            typeof metrics.averageStepsPerWorkflow === 'number' &&
            typeof metrics.timestamp === 'number'
        );
    },

    isWorkflowUsageMetrics: (value: unknown): value is IWorkflowUsageMetrics => {
        if (typeof value !== 'object' || value === null) return false;
        const metrics = value as Partial<IWorkflowUsageMetrics>;

        return (
            // Base IUsageMetrics properties
            typeof metrics.totalRequests === 'number' &&
            typeof metrics.activeUsers === 'number' &&
            typeof metrics.requestsPerSecond === 'number' &&
            typeof metrics.averageResponseSize === 'number' &&
            typeof metrics.peakMemoryUsage === 'number' &&
            typeof metrics.uptime === 'number' &&
            typeof metrics.rateLimit === 'object' &&
            metrics.rateLimit !== null &&
            typeof metrics.timestamp === 'number' &&
            // Workflow-specific properties
            typeof metrics.totalExecutions === 'number' &&
            typeof metrics.activeWorkflows === 'number' &&
            typeof metrics.workflowsPerSecond === 'number' &&
            typeof metrics.averageComplexity === 'number' &&
            typeof metrics.workflowDistribution === 'object' &&
            metrics.workflowDistribution !== null &&
            typeof metrics.workflowDistribution.sequential === 'number' &&
            typeof metrics.workflowDistribution.parallel === 'number' &&
            typeof metrics.workflowDistribution.conditional === 'number'
        );
    }
} as const;

// ─── Validation Functions ────────────────────────────────────────────────────

/**
 * Validation utilities for workflow metrics
 */
export const WorkflowMetricsValidation = {
    validateWorkflowResourceMetrics(metrics: unknown): IValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!WorkflowMetricsTypeGuards.isWorkflowResourceMetrics(metrics)) {
            errors.push('Invalid workflow resource metrics structure');
            return createValidationResult({
                isValid: false,
                errors,
                metadata: { validatorName: 'WorkflowResourceMetricsValidator' }
            });
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

        if (metrics.concurrentWorkflows < 0) {
            errors.push('Concurrent workflows cannot be negative');
        }

        if (metrics.resourceAllocation.cpu < 0 || metrics.resourceAllocation.cpu > 100) {
            errors.push('CPU allocation must be between 0 and 100');
        }

        if (metrics.resourceAllocation.memory < 0) {
            errors.push('Memory allocation cannot be negative');
        }

        if (metrics.timestamp > Date.now()) {
            warnings.push('Timestamp is in the future');
        }

        return createValidationResult({
            isValid: errors.length === 0,
            errors,
            warnings,
            metadata: { validatorName: 'WorkflowResourceMetricsValidator' }
        });
    },

    validateWorkflowPerformanceMetrics(metrics: unknown): IValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!WorkflowMetricsTypeGuards.isWorkflowPerformanceMetrics(metrics)) {
            errors.push('Invalid workflow performance metrics structure');
            return createValidationResult({
                isValid: false,
                errors,
                metadata: { validatorName: 'WorkflowPerformanceMetricsValidator' }
            });
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

        if (metrics.completionRate < 0 || metrics.completionRate > 100) {
            errors.push('Completion rate must be between 0 and 100');
        }

        if (metrics.averageStepsPerWorkflow < 0) {
            errors.push('Average steps per workflow cannot be negative');
        }

        if (metrics.timestamp > Date.now()) {
            warnings.push('Timestamp is in the future');
        }

        return createValidationResult({
            isValid: errors.length === 0,
            errors,
            warnings,
            metadata: { validatorName: 'WorkflowPerformanceMetricsValidator' }
        });
    },

    validateWorkflowUsageMetrics(metrics: unknown): IValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!WorkflowMetricsTypeGuards.isWorkflowUsageMetrics(metrics)) {
            errors.push('Invalid workflow usage metrics structure');
            return createValidationResult({
                isValid: false,
                errors,
                metadata: { validatorName: 'WorkflowUsageMetricsValidator' }
            });
        }

        // Validate base IUsageMetrics properties
        if (metrics.totalRequests < 0) {
            errors.push('Total requests cannot be negative');
        }

        if (metrics.activeUsers < 0) {
            errors.push('Active users cannot be negative');
        }

        if (metrics.requestsPerSecond < 0) {
            errors.push('Requests per second cannot be negative');
        }

        if (metrics.averageResponseSize < 0) {
            errors.push('Average response size cannot be negative');
        }

        if (metrics.peakMemoryUsage < 0) {
            errors.push('Peak memory usage cannot be negative');
        }

        if (metrics.uptime < 0) {
            errors.push('Uptime cannot be negative');
        }

        // Validate workflow-specific properties
        if (metrics.totalExecutions < 0) {
            errors.push('Total executions cannot be negative');
        }

        if (metrics.activeWorkflows < 0) {
            errors.push('Active workflows cannot be negative');
        }

        if (metrics.workflowsPerSecond < 0) {
            errors.push('Workflows per second cannot be negative');
        }

        if (metrics.averageComplexity < 0) {
            errors.push('Average complexity cannot be negative');
        }

        if (metrics.workflowDistribution.sequential < 0) {
            errors.push('Sequential workflow count cannot be negative');
        }

        if (metrics.workflowDistribution.parallel < 0) {
            errors.push('Parallel workflow count cannot be negative');
        }

        if (metrics.workflowDistribution.conditional < 0) {
            errors.push('Conditional workflow count cannot be negative');
        }

        if (metrics.timestamp > Date.now()) {
            warnings.push('Timestamp is in the future');
        }

        return createValidationResult({
            isValid: errors.length === 0,
            errors,
            warnings,
            metadata: { validatorName: 'WorkflowUsageMetricsValidator' }
        });
    }
} as const;
