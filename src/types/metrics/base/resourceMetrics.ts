/**
 * @file resourceMetrics.ts
 * @path KaibanJS\src\types\metrics\base\resourceMetrics.ts
 * @description Resource metrics type definitions and validation for system resource usage tracking
 * 
 * @module @types/metrics/base
 */

import { createValidationResult } from '@utils/validation/validationUtils';
import type { IValidationResult } from '../../common/commonValidationTypes';

export interface IResourceMetrics {
  readonly cpuUsage: number;
  readonly memoryUsage: number;
  readonly diskIO: {
    readonly read: number;
    readonly write: number;
  };
  readonly networkUsage: {
    readonly upload: number;
    readonly download: number;
  };
  readonly timestamp: number;
}

export const ResourceMetricsTypeGuards = {
  isResourceMetrics: (value: unknown): value is IResourceMetrics => {
    if (typeof value !== 'object' || value === null) return false;
    const metrics = value as Partial<IResourceMetrics>;
    
    return (
      typeof metrics.cpuUsage === 'number' &&
      typeof metrics.memoryUsage === 'number' &&
      typeof metrics.diskIO === 'object' &&
      typeof metrics.diskIO?.read === 'number' &&
      typeof metrics.diskIO?.write === 'number' &&
      typeof metrics.networkUsage === 'object' &&
      typeof metrics.networkUsage?.upload === 'number' &&
      typeof metrics.networkUsage?.download === 'number' &&
      typeof metrics.timestamp === 'number'
    );
  }
};

export const ResourceMetricsValidation = {
  validateResourceMetrics(metrics: unknown): IValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!ResourceMetricsTypeGuards.isResourceMetrics(metrics)) {
      errors.push('Invalid resource metrics structure');
      return createValidationResult(false, errors);
    }

    if (metrics.cpuUsage < 0 || metrics.cpuUsage > 100) {
      errors.push('CPU usage must be between 0 and 100');
    }

    if (metrics.memoryUsage < 0) {
      errors.push('Memory usage cannot be negative');
    }

    if (metrics.diskIO.read < 0 || metrics.diskIO.write < 0) {
      errors.push('Disk I/O values cannot be negative');
    }

    if (metrics.networkUsage.upload < 0 || metrics.networkUsage.download < 0) {
      errors.push('Network usage values cannot be negative');
    }

    if (metrics.timestamp > Date.now()) {
      warnings.push('Timestamp is in the future');
    }

    return createValidationResult(errors.length === 0, errors, warnings);
  }
};
