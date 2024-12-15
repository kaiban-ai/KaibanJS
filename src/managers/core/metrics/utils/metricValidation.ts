/**
 * @file metricValidation.ts
 * @description Validation utilities for metrics
 */

import { MetricDomain, MetricType } from '../../../../types/metrics/base/metricsManagerTypes';
import type { IMetricEvent } from '../../../../types/metrics/base/metricsManagerTypes';
import type { IValidationResult } from '../../../../types/common/validationTypes';
import { createValidationResult } from '../../../../utils/validation/validationUtils';

export function validateMetricEvent(event: IMetricEvent): IValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!event || typeof event !== 'object') {
        errors.push('Invalid metric event structure');
        return createValidationResult(false, errors, warnings, 'metricEventValidator');
    }

    if (!Object.values(MetricDomain).includes(event.domain)) {
        errors.push(`Invalid metric domain: ${event.domain}`);
    }

    if (!Object.values(MetricType).includes(event.type)) {
        errors.push(`Invalid metric type: ${event.type}`);
    }

    if (typeof event.value !== 'number' && typeof event.value !== 'string') {
        errors.push('Metric value must be number or string');
    }

    if (typeof event.timestamp !== 'number') {
        errors.push('Timestamp must be a number');
    }

    if (event.timestamp > Date.now()) {
        warnings.push('Timestamp is in the future');
    }

    if (typeof event.metadata !== 'object' || event.metadata === null) {
        errors.push('Metadata must be an object');
    }

    return createValidationResult(
        errors.length === 0,
        errors,
        warnings,
        'metricEventValidator'
    );
}
