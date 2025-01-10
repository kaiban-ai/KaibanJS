/**
 * @file metricTypes.ts
 * @path src/types/metrics/base/metricTypes.ts
 * @description Simplified metric type definitions
 */

import { METRIC_DOMAIN_enum, METRIC_TYPE_enum } from './metricEnums';

export interface IMetricEvent {
    timestamp: number;
    domain: METRIC_DOMAIN_enum;
    type: METRIC_TYPE_enum;
    value: number;
    metadata?: Record<string, unknown>;
}

export interface IBaseMetrics {
    startTime: number;
    success: boolean;
    duration?: number;
    metadata?: Record<string, unknown>;
}
