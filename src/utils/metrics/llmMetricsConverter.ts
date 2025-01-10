/**
 * @file llmMetricsConverter.ts
 * @path src/utils/metrics/llmMetricsConverter.ts
 * @description Utility functions for converting metrics to LLM-specific formats
 */

import type { IMetricEvent } from '../../types/metrics/base/metricTypes';
import { METRIC_DOMAIN_enum, METRIC_TYPE_enum } from '../../types/metrics/base/metricEnums';

export interface ILLMMetricGroup {
    latency: IMetricEvent;
    throughput: IMetricEvent;
    cpu: IMetricEvent;
    memory: IMetricEvent;
}

export const createLLMMetrics = (
    modelId: string,
    tokenCount: number = 0,
    startTime: number = Date.now()
): ILLMMetricGroup => {
    const timestamp = Date.now();
    const duration = timestamp - startTime;

    return {
        latency: {
            timestamp,
            domain: METRIC_DOMAIN_enum.LLM,
            type: METRIC_TYPE_enum.LATENCY,
            value: duration,
            metadata: {
                component: 'llm',
                operation: 'execution',
                modelId
            }
        },
        throughput: {
            timestamp,
            domain: METRIC_DOMAIN_enum.LLM,
            type: METRIC_TYPE_enum.THROUGHPUT,
            value: tokenCount / (duration / 1000), // tokens per second
            metadata: {
                component: 'llm',
                operation: 'processing',
                modelId,
                tokenCount
            }
        },
        cpu: {
            timestamp,
            domain: METRIC_DOMAIN_enum.LLM,
            type: METRIC_TYPE_enum.CPU,
            value: process.cpuUsage().user / 1000000, // Convert to seconds
            metadata: {
                component: 'llm',
                operation: 'resource',
                modelId
            }
        },
        memory: {
            timestamp,
            domain: METRIC_DOMAIN_enum.LLM,
            type: METRIC_TYPE_enum.MEMORY,
            value: process.memoryUsage().heapUsed,
            metadata: {
                component: 'llm',
                operation: 'resource',
                modelId
            }
        }
    };
};
