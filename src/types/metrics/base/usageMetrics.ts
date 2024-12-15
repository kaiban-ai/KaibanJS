/**
 * @file usageMetrics.ts
 * @path KaibanJS\src\types\metrics\base\usageMetrics.ts
 * @description Usage metrics type definitions and validation for system usage tracking
 * 
 * @module @types/metrics/base
 */

import { createValidationResult } from '@utils/validation/validationUtils';
import type { IValidationResult } from '../../common/validationTypes';
import type { IStandardCostDetails } from '../../common/baseTypes';

/**
 * Rate limit tracking
 */
export interface IRateLimitMetrics {
  current: number;
  limit: number;
  remaining: number;
  resetTime: number;
}

/**
 * Comprehensive usage metrics for system monitoring
 */
export interface IUsageMetrics {
  readonly totalRequests: number;
  readonly activeUsers: number;
  readonly requestsPerSecond: number;
  readonly averageResponseSize: number;
  readonly peakMemoryUsage: number;
  readonly uptime: number;
  readonly rateLimit: IRateLimitMetrics;
  readonly timestamp: number;
}

export const UsageMetricsTypeGuards = {
  isRateLimitMetrics: (value: unknown): value is IRateLimitMetrics => {
    if (typeof value !== 'object' || value === null) return false;
    const metrics = value as Partial<IRateLimitMetrics>;

    return (
      typeof metrics.current === 'number' &&
      typeof metrics.limit === 'number' &&
      typeof metrics.remaining === 'number' &&
      typeof metrics.resetTime === 'number'
    );
  },

  isUsageMetrics: (value: unknown): value is IUsageMetrics => {
    if (typeof value !== 'object' || value === null) return false;
    const metrics = value as Partial<IUsageMetrics>;

    return (
      typeof metrics.totalRequests === 'number' &&
      typeof metrics.activeUsers === 'number' &&
      typeof metrics.requestsPerSecond === 'number' &&
      typeof metrics.averageResponseSize === 'number' &&
      typeof metrics.peakMemoryUsage === 'number' &&
      typeof metrics.uptime === 'number' &&
      UsageMetricsTypeGuards.isRateLimitMetrics(metrics.rateLimit) &&
      typeof metrics.timestamp === 'number'
    );
  }
};

export const UsageMetricsValidation = {
  validateRateLimitMetrics(metrics: unknown): IValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!UsageMetricsTypeGuards.isRateLimitMetrics(metrics)) {
      errors.push('Invalid rate limit metrics structure');
      return createValidationResult(false, errors);
    }

    if (metrics.current < 0) {
      errors.push('Current rate limit usage cannot be negative');
    }

    if (metrics.limit < 0) {
      errors.push('Rate limit cannot be negative');
    }

    if (metrics.remaining < 0) {
      errors.push('Remaining rate limit cannot be negative');
    }

    if (metrics.current > metrics.limit) {
      errors.push('Current rate limit usage cannot exceed total limit');
    }

    if (metrics.remaining > metrics.limit) {
      errors.push('Remaining rate limit cannot exceed total limit');
    }

    if (metrics.current + metrics.remaining !== metrics.limit) {
      warnings.push('Current usage plus remaining should equal total limit');
    }

    if (metrics.resetTime < Date.now()) {
      warnings.push('Rate limit reset time is in the past');
    }

    return createValidationResult(errors.length === 0, errors, warnings);
  },

  validateUsageMetrics(metrics: unknown): IValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!UsageMetricsTypeGuards.isUsageMetrics(metrics)) {
      errors.push('Invalid usage metrics structure');
      return createValidationResult(false, errors);
    }

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

    // Validate rate limit metrics
    const rateLimitResult = this.validateRateLimitMetrics(metrics.rateLimit);
    errors.push(...rateLimitResult.errors);
    warnings.push(...rateLimitResult.warnings);

    if (metrics.timestamp > Date.now()) {
      warnings.push('Timestamp is in the future');
    }

    return createValidationResult(errors.length === 0, errors, warnings);
  }
};
