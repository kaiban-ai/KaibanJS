/**
 * @file metrics.ts
 * @path src/utils/types/metrics.ts
 * @description Standardized metrics for cross-domain performance and resource tracking.
 *
 * @module utils/types
 */

// ─── Token-Level Cost Breakdown ────────────────────────────────────────────────

/**
 * Represents detailed token-level cost breakdown.
 */
export interface ITokenCostBreakdown {
  count: number;
  cost: number;
}

// ─── Comprehensive Cost Details ────────────────────────────────────────────────

/**
 * Comprehensive cost details for tracking computational expenses.
 */
export interface IStandardCostDetails {
  inputCost: number; // Input token costs
  outputCost: number; // Output token costs
  totalCost: number; // Total cumulative cost
  currency: string; // Currency for cost tracking (e.g., 'USD')
  breakdown: {
    promptTokens: ITokenCostBreakdown;
    completionTokens: ITokenCostBreakdown;
  };
}

// ─── Model Pricing Configuration ───────────────────────────────────────────────

/**
 * Configuration for model-specific pricing.
 */
export interface IModelPricingConfig {
  modelCode: string; // Unique identifier for the model
  provider: string; // Provider of the model (e.g., 'OpenAI', 'Anthropic')
  inputPricePerMillionTokens: number; // Cost per million input tokens
  outputPricePerMillionTokens: number; // Cost per million output tokens
  currency?: string; // Optional default currency
}

// ─── Cost Tracking Options ─────────────────────────────────────────────────────

/**
 * Options for configuring cost tracking granularity.
 */
export interface ICostTrackingOptions {
  enableDetailedTracking: boolean; // Enable/disable detailed cost tracking
  costPrecision?: number; // Precision for cost calculations (decimal places)
  budgetThreshold?: number; // Optional budget threshold for alerts
}

// ─── Cost Aggregation ──────────────────────────────────────────────────────────

/**
 * Utility type for aggregating costs across multiple operations.
 */
export type ICostAggregate = {
  [key: string]: IStandardCostDetails;
};

// ─── Resource Utilization Metrics ──────────────────────────────────────────────

/**
 * Comprehensive resource utilization metrics.
 */
export interface IResourceMetrics {
  cpuUsage: number; // CPU usage percentage
  memoryUsage: number; // Memory usage in MB
  diskIO: {
    read: number; // Disk read operations
    write: number; // Disk write operations
  };
  networkUsage: {
    upload: number; // Network upload bandwidth usage
    download: number; // Network download bandwidth usage
  };
  timestamp: number; // Timestamp of the metrics collection
}

// ─── Usage Metrics ─────────────────────────────────────────────────────────────

/**
 * Usage metrics for tracking system and domain-specific utilization.
 */
export interface IUsageMetrics {
  totalOperations: number; // Total number of operations
  successRate: number; // Success rate of operations
  averageDuration: number; // Average operation duration
  costDetails: IStandardCostDetails; // Cumulative cost details
  timestamp: number; // Timestamp of the metrics collection
}

// ─── Performance Metrics ───────────────────────────────────────────────────────

/**
 * Performance metrics for detailed system analysis.
 */
export interface IPerformanceMetrics {
  executionTime: {
    total: number; // Total execution time
    average: number; // Average execution time
    min: number; // Minimum execution time
    max: number; // Maximum execution time
  };
  throughput: {
    operationsPerSecond: number; // Operations processed per second
    dataProcessedPerSecond: number; // Data processed per second
  };
  errorMetrics: {
    totalErrors: number; // Total number of errors
    errorRate: number; // Error rate percentage
  };
  resourceUtilization: IResourceMetrics; // Detailed resource utilization
  timestamp: number; // Timestamp of the metrics collection
}
