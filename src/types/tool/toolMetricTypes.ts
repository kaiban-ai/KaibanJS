/**
 * @file toolMetricTypes.ts
 * @path KaibanJS/src/types/tool/toolMetricTypes.ts
 * @description Tool metric type definitions and validation
 */

import type { IMetricEvent } from '../metrics/base/metricTypes';
import { METRIC_DOMAIN_enum, METRIC_TYPE_enum } from '../metrics/base/metricEnums';
import { createValidationResult, createValidationMetadata } from '../common/validationTypes';
import type { IValidationResult } from '../common/validationTypes';
import { VALIDATION_ERROR_enum, VALIDATION_WARNING_enum } from '../common/enumTypes';

export interface IToolMetricGroup {
    latency: IMetricEvent;
    throughput: IMetricEvent;
    cpu: IMetricEvent;
    memory: IMetricEvent;
}

export const createToolMetrics = (toolId: string): IToolMetricGroup => {
    const timestamp = Date.now();

    return {
        latency: {
            timestamp,
            domain: METRIC_DOMAIN_enum.SYSTEM,
            type: METRIC_TYPE_enum.LATENCY,
            value: 0,
            metadata: {
                toolId,
                component: 'tool',
                operation: 'execution'
            }
        },
        throughput: {
            timestamp,
            domain: METRIC_DOMAIN_enum.SYSTEM,
            type: METRIC_TYPE_enum.THROUGHPUT,
            value: 0,
            metadata: {
                toolId,
                component: 'tool',
                operation: 'processing'
            }
        },
        cpu: {
            timestamp,
            domain: METRIC_DOMAIN_enum.SYSTEM,
            type: METRIC_TYPE_enum.CPU,
            value: 0,
            metadata: {
                toolId,
                component: 'tool',
                operation: 'resource'
            }
        },
        memory: {
            timestamp,
            domain: METRIC_DOMAIN_enum.SYSTEM,
            type: METRIC_TYPE_enum.MEMORY,
            value: 0,
            metadata: {
                toolId,
                component: 'tool',
                operation: 'resource'
            }
        }
    };
};

// ─── Validation Functions ────────────────────────────────────────────────────

export const validateToolMetrics = (metrics: IToolMetricGroup): IValidationResult => {
    const errors: VALIDATION_ERROR_enum[] = [];
    const warnings: VALIDATION_WARNING_enum[] = [];

    // Validate latency
    if (metrics.latency.value < 0) {
        errors.push(VALIDATION_ERROR_enum.VALUE_OUT_OF_RANGE);
    }

    // Validate CPU usage
    if (metrics.cpu.value < 0 || metrics.cpu.value > 100) {
        errors.push(VALIDATION_ERROR_enum.VALUE_OUT_OF_RANGE);
    }

    // Validate memory usage
    if (metrics.memory.value < 0) {
        errors.push(VALIDATION_ERROR_enum.VALUE_OUT_OF_RANGE);
    }

    return createValidationResult({
        isValid: errors.length === 0,
        errors,
        warnings,
        metadata: createValidationMetadata({
            component: 'tool',
            operation: 'metrics_validation',
            validatedFields: ['latency', 'cpu', 'memory']
        })
    });
};
