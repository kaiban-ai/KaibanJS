/**
 * @file metricEvents.ts
 * @description Type definitions for metric events
 */

import { MetricDomain, MetricType } from './metricTypes';

export interface IMetricEvent {
    domain: MetricDomain;
    type: MetricType;
    value: number;
    metadata: Record<string, any>;
    timestamp?: Date | number;
}
