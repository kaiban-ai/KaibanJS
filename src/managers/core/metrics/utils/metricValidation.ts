/**
 * @file metricValidation.ts
 * @description Validation utilities for metrics
 */

import type { IMetricEvent } from '../../../../types/metrics/base/metricTypes';
import { METRIC_TYPE_enum } from '../../../../types/metrics/base/metricEnums';

export function validateMetricValue(metric: IMetricEvent): boolean {
    switch (metric.type) {
        case METRIC_TYPE_enum.LATENCY:
        case METRIC_TYPE_enum.THROUGHPUT:
        case METRIC_TYPE_enum.USAGE:
            return validatePositiveMetric(metric);

        case METRIC_TYPE_enum.CPU:
            return validateCPUMetric(metric);

        case METRIC_TYPE_enum.MEMORY:
            return validateMemoryMetric(metric);

        case METRIC_TYPE_enum.STATE_TRANSITION:
            return validateStateMetric(metric);

        case METRIC_TYPE_enum.SUCCESS:
        case METRIC_TYPE_enum.ERROR:
            return validateBinaryMetric(metric);

        default:
            return validateBasicMetric(metric);
    }
}

function validateBasicMetric(metric: IMetricEvent): boolean {
    return typeof metric.value === 'number' && 
           validateMetricMetadata(metric);
}

function validatePositiveMetric(metric: IMetricEvent): boolean {
    return typeof metric.value === 'number' && 
           metric.value >= 0 &&
           validateMetricMetadata(metric) &&
           validateRequiredMetadata(metric, ['component', 'operation']);
}

function validateCPUMetric(metric: IMetricEvent): boolean {
    return typeof metric.value === 'number' && 
           metric.value >= 0 &&
           metric.value <= 100 &&
           validateMetricMetadata(metric) &&
           validateRequiredMetadata(metric, ['component', 'operation']);
}

function validateMemoryMetric(metric: IMetricEvent): boolean {
    return typeof metric.value === 'number' && 
           metric.value >= 0 &&
           validateMetricMetadata(metric) &&
           validateRequiredMetadata(metric, ['component', 'operation']);
}

function validateStateMetric(metric: IMetricEvent): boolean {
    return typeof metric.value === 'number' &&
           validateMetricMetadata(metric) &&
           validateRequiredMetadata(metric, ['component', 'operation', 'from', 'to']);
}

function validateBinaryMetric(metric: IMetricEvent): boolean {
    return typeof metric.value === 'number' &&
           (metric.value === 0 || metric.value === 1) &&
           validateMetricMetadata(metric) &&
           validateRequiredMetadata(metric, ['component', 'operation']);
}

export function validateMetricTimestamp(metric: IMetricEvent): boolean {
    return typeof metric.timestamp === 'number' && 
           metric.timestamp > 0 && 
           metric.timestamp <= Date.now();
}

export function validateMetricMetadata(metric: IMetricEvent): boolean {
    return metric.metadata !== undefined && 
           typeof metric.metadata === 'object' && 
           metric.metadata !== null;
}

function validateRequiredMetadata(metric: IMetricEvent, fields: string[]): boolean {
    return fields.every(field => 
        metric.metadata && 
        field in metric.metadata && 
        typeof metric.metadata[field] === 'string' &&
        metric.metadata[field].length > 0
    );
}
