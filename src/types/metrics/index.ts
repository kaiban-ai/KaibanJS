/**
 * @file index.ts
 * @description Metrics type exports
 */

export {
    METRIC_DOMAIN_enum,
    METRIC_TYPE_enum,
    MetricDomain,
    IMetricType,
    IMetricEvent,
    IBaseMetrics,
    IMetricsManager
} from './base/metricTypes';

// Re-export from common types for backward compatibility
export {
    METRIC_DOMAIN_enum as METRIC_DOMAIN_enum_DEPRECATED,
    METRIC_TYPE_enum as METRIC_TYPE_enum_DEPRECATED
} from '../common/enumTypes';
