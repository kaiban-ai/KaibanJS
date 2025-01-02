/**
 * @file index.ts
 * @path src/types/metrics/index.ts
 * @description Centralized exports for all metrics-related types and validation
 *
 * @module @types/metrics
 */

// ─── Base Metric Types ────────────────────────────────────────────────────────

export {
    type IBaseMetrics,
    type IMetricsCollectionOptions
} from './base/baseMetrics';

export {
    MetricDomain,
    MetricType,
    AggregationStrategy,
    type IMetricEvent,
    type ITimeFrame,
    type MutableMetrics,
    type IAggregatedMetric,
    type IMetricFilter,
    type IAggregationQuery,
    type IRolledUpMetrics,
    type IMetricsHandlerMetadata,
    type IMetricsHandlerResult,
    type IMetricsManager,
    type IMetricStorage,
    type IMetricAggregator
} from './base/metricsManagerTypes';

// ─── Error Metrics ────────────────────────────────────────────────────────────

export { type IErrorMetrics } from './base/errorMetrics';

// ─── Performance Metrics ────────────────────────────────────────────────────────

export {
    type ITimeMetrics,
    type IThroughputMetrics,
    type IPerformanceMetrics
} from './base/performanceMetrics';

// ─── Resource Metrics ──────────────────────────────────────────────────────────

export { type IResourceMetrics } from './base/resourceMetrics';

// ─── Usage Metrics ────────────────────────────────────────────────────────────

export {
    type IRateLimitMetrics,
    type IUsageMetrics
} from './base/usageMetrics';

// ─── System Health Metrics ──────────────────────────────────────────────────────

export {
    type ICoreSystemStatus,
    type ICoreSystemCapacity,
    type ICoreSystemStability,
    type ICoreSystemThresholds,
    type ICoreSystemDegradation,
    type ICoreSystemHealthMetrics,
    type ISystemMetrics
} from './base/systemHealthMetrics';
