/**
 * @file performanceMetrics.ts
 * @path KaibanJS\src\types\metrics\base\performanceMetrics.ts
 * @description Performance metrics type definitions and validation for system performance tracking
 * 
 * @module @types/metrics/base
 */

import { createValidationResult } from '@utils/validation/validationUtils';
import type { IValidationResult } from '../../common/commonValidationTypes';
import type { IResourceMetrics } from '../../common/commonMetricTypes';

/**
 * Time-based metrics with statistical aggregates
 */
export interface ITimeMetrics {
  /** Total accumulated time */
  total: number;
  /** Average time across all measurements */
  average: number;
  /** Minimum recorded time */
  min: number;
  /** Maximum recorded time */
  max: number;
}

/**
 * System throughput measurements
 */
export interface IThroughputMetrics {
  /** Number of operations completed per second */
  operationsPerSecond: number;
  /** Amount of data processed per second (in bytes) */
  dataProcessedPerSecond: number;
}

/**
 * Error tracking and analysis metrics
 */
export interface IErrorMetrics {
  /** Total number of errors encountered */
  totalErrors: number;
  /** Error rate as a percentage (0-1) */
  errorRate: number;
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
  readonly errorMetrics: IErrorMetrics;
  /** Resource utilization metrics */
  readonly resourceUtilization: IResourceMetrics;
  /** Timestamp of metrics collection */
  readonly timestamp: number;
}

export const PerformanceMetricsTypeGuards = {
  isTimeMetrics: (value: unknown): value is ITimeMetrics => {
    if (typeof value !== 'object' || value === null) return false;
    const metrics = value as Partial<ITimeMetrics>;

    return (
      typeof metrics.total === 'number' &&
      typeof metrics.average === 'number' &&
      typeof metrics.min === 'number' &&
      typeof metrics.max === 'number'
    );
  },

  isThroughputMetrics: (value: unknown): value is IThroughputMetrics => {
    if (typeof value !== 'object' || value === null) return false;
    const metrics = value as Partial<IThroughputMetrics>;

    return (
      typeof metrics.operationsPerSecond === 'number' &&
      typeof metrics.dataProcessedPerSecond === 'number'
    );
  },

  isErrorMetrics: (value: unknown): value is IErrorMetrics => {
    if (typeof value !== 'object' || value === null) return false;
    const metrics = value as Partial<IErrorMetrics>;

    return (
      typeof metrics.totalErrors === 'number' &&
      typeof metrics.errorRate === 'number'
    );
  },

  isPerformanceMetrics: (value: unknown): value is IPerformanceMetrics => {
    if (typeof value !== 'object' || value === null) return false;
    const metrics = value as Partial<IPerformanceMetrics>;

    return (
      PerformanceMetricsTypeGuards.isTimeMetrics(metrics.executionTime) &&
      PerformanceMetricsTypeGuards.isTimeMetrics(metrics.latency) &&
      PerformanceMetricsTypeGuards.isThroughputMetrics(metrics.throughput) &&
      PerformanceMetricsTypeGuards.isTimeMetrics(metrics.responseTime) &&
      typeof metrics.queueLength === 'number' &&
      typeof metrics.errorRate === 'number' &&
      typeof metrics.successRate === 'number' &&
      PerformanceMetricsTypeGuards.isErrorMetrics(metrics.errorMetrics) &&
      typeof metrics.resourceUtilization === 'object' &&
      typeof metrics.timestamp === 'number'
    );
  }
};

export const PerformanceMetricsValidation = {
  validateTimeMetrics(metrics: unknown): IValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!PerformanceMetricsTypeGuards.isTimeMetrics(metrics)) {
      errors.push('Invalid time metrics structure');
      return createValidationResult(false, errors);
    }

    if (metrics.min > metrics.max) {
      errors.push('Minimum value cannot be greater than maximum value');
    }

    if (metrics.average < metrics.min || metrics.average > metrics.max) {
      errors.push('Average value must be between minimum and maximum values');
    }

    if (metrics.total < 0) {
      errors.push('Total time cannot be negative');
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

    // Validate time metrics
    const timeMetricsResults = [
      this.validateTimeMetrics(metrics.executionTime),
      this.validateTimeMetrics(metrics.latency),
      this.validateTimeMetrics(metrics.responseTime)
    ];

    timeMetricsResults.forEach(result => {
      errors.push(...result.errors);
      warnings.push(...result.warnings);
    });

    // Validate throughput
    if (metrics.throughput.operationsPerSecond < 0) {
      errors.push('Operations per second cannot be negative');
    }

    if (metrics.throughput.dataProcessedPerSecond < 0) {
      errors.push('Data processed per second cannot be negative');
    }

    if (metrics.queueLength < 0) {
      errors.push('Queue length cannot be negative');
    }

    if (metrics.errorRate < 0 || metrics.errorRate > 1) {
      errors.push('Error rate must be between 0 and 1');
    }

    if (metrics.successRate < 0 || metrics.successRate > 1) {
      errors.push('Success rate must be between 0 and 1');
    }

    if (Math.abs(metrics.errorRate + metrics.successRate - 1) > 0.000001) {
      warnings.push('Error rate and success rate should sum to 1');
    }

    // Validate error metrics
    if (metrics.errorMetrics.totalErrors < 0) {
      errors.push('Total errors cannot be negative');
    }

    if (metrics.errorMetrics.errorRate < 0 || metrics.errorMetrics.errorRate > 1) {
      errors.push('Error metrics error rate must be between 0 and 1');
    }

    if (metrics.timestamp > Date.now()) {
      warnings.push('Timestamp is in the future');
    }

    return createValidationResult(errors.length === 0, errors, warnings);
  }
};
