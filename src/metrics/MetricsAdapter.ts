/**
 * @file MetricsAdapter.ts
 * @path src/metrics/MetricsAdapter.ts
 * @description Adapter for converting external metrics to our standardized format
 */

import { BaseCallbackHandlerInput } from '@langchain/core/callbacks/base';
import { LLMResult } from '@langchain/core/outputs';
import { ChainValues } from '@langchain/core/utils/types';
import type { IMetricEvent } from '../types/metrics/base/metricTypes';
import { METRIC_DOMAIN_enum, METRIC_TYPE_enum } from '../types/metrics/base/metricEnums';

/**
 * Adapter for converting external metrics to our standardized format
 */
export class MetricsAdapter {
    /**
     * Convert Langchain callback data to our metrics format
     */
    public static fromLangchainCallback(
        _input: BaseCallbackHandlerInput,
        result: LLMResult | ChainValues | undefined,
        startTime: number,
        endTime: number
    ): IMetricEvent[] {
        const duration = endTime - startTime;
        const tokenCount = result && 'llmOutput' in result ? 
            (result.llmOutput?.tokenUsage?.totalTokens || 0) : 0;

        return [
            // Latency metric
            {
                timestamp: endTime,
                domain: METRIC_DOMAIN_enum.LLM,
                type: METRIC_TYPE_enum.LATENCY,
                value: duration,
                metadata: {
                    component: 'llm',
                    operation: 'execution'
                }
            },
            // Throughput metric
            {
                timestamp: endTime,
                domain: METRIC_DOMAIN_enum.LLM,
                type: METRIC_TYPE_enum.THROUGHPUT,
                value: tokenCount / (duration / 1000),
                metadata: {
                    component: 'llm',
                    operation: 'processing'
                }
            },
            // Token usage metric
            {
                timestamp: endTime,
                domain: METRIC_DOMAIN_enum.LLM,
                type: METRIC_TYPE_enum.USAGE,
                value: tokenCount,
                metadata: {
                    component: 'llm',
                    operation: 'tokens',
                    promptTokens: result && 'llmOutput' in result ? 
                        (result.llmOutput?.tokenUsage?.promptTokens || 0) : 0,
                    completionTokens: result && 'llmOutput' in result ? 
                        (result.llmOutput?.tokenUsage?.completionTokens || 0) : 0
                }
            }
        ];
    }
}
