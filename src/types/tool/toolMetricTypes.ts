/**
 * @file toolMetricTypes.ts
 * @path KaibanJS/src/types/tool/toolMetricTypes.ts
 * @description Tool metrics type definitions and validation for tool performance tracking
 * 
 * @module @types/tool
 */

import { IResourceMetrics } from '../metrics/base/resourceMetrics';
import { IPerformanceMetrics, ITimeMetrics, IThroughputMetrics, IErrorMetrics } from '../metrics/base/performanceMetrics';
import { IUsageMetrics } from '../metrics/base/usageMetrics';
import { METRIC_TYPE_enum, RESOURCE_STATUS_enum, ERROR_TYPE_enum } from '../common/commonEnums';
import { createValidationResult } from '@utils/validation/validationUtils';
import type { IValidationResult } from '../common/commonValidationTypes';

// ─── Resource Metrics ────────────────────────────────────────────────────────────

export interface IToolResourceMetrics extends IResourceMetrics {
  apiRateLimits: {
    current: number;
    limit: number;
    resetIn: number;
  };
  serviceQuotas: {
    usagePercent: number;
    remaining: number;
    total: number;
  };
  connectionPool: {
    active: number;
    idle: number;
    maxSize: number;
  };
  integrationHealth: {
    availability: number;
    responseTime: number;
    connectionStatus: number;
  };
  healthStatus: {
    status: RESOURCE_STATUS_enum;
    lastHealthCheck: Date;
    issues: string[];
  };
  recoveryState: {
    inRecovery: boolean;
    lastRecoveryTime: Date;
    recoveryAttempts: number;
  };
}

// ─── Performance Metrics ─────────────────────────────────────────────────────────

export interface IToolPerformanceMetrics extends IPerformanceMetrics {
  executionMetrics: {
    latency: ITimeMetrics;
    successRate: number;
    throughput: IThroughputMetrics;
  };
  reliabilityMetrics: {
    errors: IErrorMetrics;
    recoveryTime: ITimeMetrics;
    failurePatterns: {
      types: { [key: string]: number };
      frequency: number;
      mtbf: number;
    };
  };
  responseMetrics: {
    time: ITimeMetrics;
    dataVolume: {
      total: number;
      average: number;
      peak: number;
    };
    processingRate: IThroughputMetrics;
  };
}

// ─── Usage Metrics ───────────────────────────────────────────────────────────────

export interface IToolUsageMetrics extends IUsageMetrics {
  totalRequests: number;
  activeUsers: number;
  requestsPerSecond: number;
  averageResponseSize: number;
  peakMemoryUsage: number;
  uptime: number;
  rateLimit: {
    current: number;
    limit: number;
    remaining: number;
    resetTime: number;
  };
  utilizationMetrics: {
    callFrequency: number;
    resourceConsumption: {
      cpu: number;
      memory: number;
      bandwidth: number;
    };
    peakUsage: {
      times: number[];
      values: number[];
      duration: number[];
    };
  };
  accessPatterns: {
    distribution: { [key: string]: number };
    frequency: { [key: string]: number };
    operationTypes: { [key: string]: number };
  };
  dependencies: {
    services: string[];
    resources: string[];
    versions: { [key: string]: string };
  };
}

// ─── Combined Metrics ─────────────────────────────────────────────────────────────

export interface IToolMetrics {
  resourceMetrics: IToolResourceMetrics;
  performanceMetrics: IToolPerformanceMetrics;
  usageMetrics: IToolUsageMetrics;
  timestamp: number;
}

// ─── Default Values ──────────────────────────────────────────────────────────────

export const DefaultToolMetrics = {
  createDefaultHealthStatus: (status: RESOURCE_STATUS_enum = RESOURCE_STATUS_enum.AVAILABLE): IToolResourceMetrics['healthStatus'] => ({
    status,
    lastHealthCheck: new Date(),
    issues: []
  }),

  createDefaultRecoveryState: (): IToolResourceMetrics['recoveryState'] => ({
    inRecovery: false,
    lastRecoveryTime: new Date(),
    recoveryAttempts: 0
  }),

  createDefaultTimeMetrics: (value: number = 0): ITimeMetrics => ({
    total: value,
    average: value,
    min: value,
    max: value
  }),

  createDefaultThroughputMetrics: (value: number = 0): IThroughputMetrics => ({
    operationsPerSecond: value,
    dataProcessedPerSecond: value
  })
};

// ─── Type Guards ────────────────────────────────────────────────────────────────

export const ToolMetricsTypeGuards = {
  isToolResourceMetrics: (value: unknown): value is IToolResourceMetrics => {
    if (typeof value !== 'object' || value === null) return false;
    const metrics = value as Partial<IToolResourceMetrics>;
    
    return (
      typeof metrics.apiRateLimits === 'object' &&
      typeof metrics.serviceQuotas === 'object' &&
      typeof metrics.connectionPool === 'object' &&
      typeof metrics.integrationHealth === 'object' &&
      typeof metrics.healthStatus === 'object' &&
      typeof metrics.recoveryState === 'object'
    );
  },

  isToolPerformanceMetrics: (value: unknown): value is IToolPerformanceMetrics => {
    if (typeof value !== 'object' || value === null) return false;
    const metrics = value as Partial<IToolPerformanceMetrics>;
    
    return (
      typeof metrics.executionMetrics === 'object' &&
      typeof metrics.reliabilityMetrics === 'object' &&
      typeof metrics.responseMetrics === 'object'
    );
  },

  isToolUsageMetrics: (value: unknown): value is IToolUsageMetrics => {
    if (typeof value !== 'object' || value === null) return false;
    const metrics = value as Partial<IToolUsageMetrics>;
    
    return (
      typeof metrics.totalRequests === 'number' &&
      typeof metrics.utilizationMetrics === 'object' &&
      typeof metrics.accessPatterns === 'object' &&
      typeof metrics.dependencies === 'object'
    );
  },

  isToolMetrics: (value: unknown): value is IToolMetrics => {
    if (typeof value !== 'object' || value === null) return false;
    const metrics = value as Partial<IToolMetrics>;
    
    return (
      ToolMetricsTypeGuards.isToolResourceMetrics(metrics.resourceMetrics) &&
      ToolMetricsTypeGuards.isToolPerformanceMetrics(metrics.performanceMetrics) &&
      ToolMetricsTypeGuards.isToolUsageMetrics(metrics.usageMetrics) &&
      typeof metrics.timestamp === 'number'
    );
  }
};

// ─── Validation ─────────────────────────────────────────────────────────────────

export const ToolMetricsValidation = {
  validateToolResourceMetrics(metrics: unknown): IValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!ToolMetricsTypeGuards.isToolResourceMetrics(metrics)) {
      errors.push('Invalid tool resource metrics structure');
      return createValidationResult(false, errors);
    }

    if (metrics.apiRateLimits.current > metrics.apiRateLimits.limit) {
      errors.push('API rate limit exceeded');
    }

    if (metrics.connectionPool.active > metrics.connectionPool.maxSize) {
      errors.push('Connection pool size exceeded');
    }

    if (metrics.healthStatus.status === RESOURCE_STATUS_enum.FAILED) {
      errors.push('Resource health check failed');
    }

    if (metrics.recoveryState.recoveryAttempts > 0) {
      warnings.push(`Resource has undergone ${metrics.recoveryState.recoveryAttempts} recovery attempts`);
    }

    return createValidationResult(errors.length === 0, errors, warnings);
  },

  validateToolPerformanceMetrics(metrics: unknown): IValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!ToolMetricsTypeGuards.isToolPerformanceMetrics(metrics)) {
      errors.push('Invalid tool performance metrics structure');
      return createValidationResult(false, errors);
    }

    if (metrics.executionMetrics.successRate < 0.95) {
      warnings.push('Success rate below 95%');
    }

    if (metrics.reliabilityMetrics.failurePatterns.frequency > 0.1) {
      errors.push('High failure frequency detected');
    }

    return createValidationResult(errors.length === 0, errors, warnings);
  },

  validateToolUsageMetrics(metrics: unknown): IValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!ToolMetricsTypeGuards.isToolUsageMetrics(metrics)) {
      errors.push('Invalid tool usage metrics structure');
      return createValidationResult(false, errors);
    }

    if (metrics.utilizationMetrics.resourceConsumption.cpu > 90 || 
        metrics.utilizationMetrics.resourceConsumption.memory > 90) {
      warnings.push('High resource consumption');
    }

    return createValidationResult(errors.length === 0, errors, warnings);
  },

  validateToolMetrics(metrics: unknown): IValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!ToolMetricsTypeGuards.isToolMetrics(metrics)) {
      errors.push('Invalid tool metrics structure');
      return createValidationResult(false, errors);
    }

    const resourceValidation = this.validateToolResourceMetrics(metrics.resourceMetrics);
    const performanceValidation = this.validateToolPerformanceMetrics(metrics.performanceMetrics);
    const usageValidation = this.validateToolUsageMetrics(metrics.usageMetrics);

    errors.push(...resourceValidation.errors);
    errors.push(...performanceValidation.errors);
    errors.push(...usageValidation.errors);
    warnings.push(...resourceValidation.warnings);
    warnings.push(...performanceValidation.warnings);
    warnings.push(...usageValidation.warnings);

    if (metrics.timestamp > Date.now()) {
      warnings.push('Timestamp is in the future');
    }

    return createValidationResult(errors.length === 0, errors, warnings);
  }
};
