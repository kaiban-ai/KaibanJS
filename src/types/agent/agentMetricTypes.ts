/**
 * @file agentMetricTypes.ts
 * @path KaibanJS/src/types/agent/agentMetricTypes.ts
 * @description Simplified agent metrics type definitions and validation
 */

import { 
    createValidationResult,
    createValidationMetadata,
    type IValidationResult 
} from '../common/validationTypes';
import { VALIDATION_ERROR_enum, VALIDATION_WARNING_enum } from '../common/enumTypes';
import type { IMetricEvent } from '../metrics/base/metricTypes';
import { METRIC_DOMAIN_enum, METRIC_TYPE_enum } from '../metrics/base/metricEnums';

interface IBaseAgentMetadata {
    agentId: string;
    component: string;
    operation: string;
}

export interface IAgentPerformanceMetrics {
    latency: number;
    throughput: number;
    successRate: number;
    errorRate: number;
}

export interface IAgentResourceMetrics {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkUsage: number;
}

export interface IAgentUsageMetrics {
    totalRequests: number;
    requestsPerSecond: number;
    totalTokens: number;
    tokensPerSecond: number;
}

export interface IAgentMetrics {
    readonly performance: IAgentPerformanceMetrics;
    readonly resources: IAgentResourceMetrics;
    readonly usage: IAgentUsageMetrics;
    readonly iterations: number;
    readonly executionTime: number;
    readonly llmMetrics: unknown;
    readonly thinkingMetrics?: {
        reasoningTime: number;
        reasoningSteps: number;
        reasoningCost: number;
        reasoningTokens: number;
        startTime: number;
    };
}

export interface IAgentMetricGroup {
    latency: IMetricEvent;
    throughput: IMetricEvent;
    cpu: IMetricEvent;
    memory: IMetricEvent;
}

export const createAgentMetrics = (agentId: string): IAgentMetricGroup => {
    const timestamp = Date.now();

    return {
        latency: {
            timestamp,
            domain: METRIC_DOMAIN_enum.AGENT,
            type: METRIC_TYPE_enum.LATENCY,
            value: 0,
            metadata: {
                agentId,
                component: 'agent',
                operation: 'execution'
            }
        },
        throughput: {
            timestamp,
            domain: METRIC_DOMAIN_enum.AGENT,
            type: METRIC_TYPE_enum.THROUGHPUT,
            value: 0,
            metadata: {
                agentId,
                component: 'agent',
                operation: 'processing'
            }
        },
        cpu: {
            timestamp,
            domain: METRIC_DOMAIN_enum.AGENT,
            type: METRIC_TYPE_enum.CPU,
            value: 0,
            metadata: {
                agentId,
                component: 'agent',
                operation: 'resource'
            }
        },
        memory: {
            timestamp,
            domain: METRIC_DOMAIN_enum.AGENT,
            type: METRIC_TYPE_enum.MEMORY,
            value: 0,
            metadata: {
                agentId,
                component: 'agent',
                operation: 'resource'
            }
        }
    };
};

export const validateAgentMetrics = (metrics: IAgentMetricGroup): IValidationResult => {
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
            component: 'AgentMetricsValidator',
            operation: 'validate',
            validatedFields: ['latency', 'throughput', 'cpu', 'memory']
        })
    });
};
