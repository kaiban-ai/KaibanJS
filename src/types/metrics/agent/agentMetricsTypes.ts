/**
 * @file agentMetricsTypes.ts
 * @description Type definitions for agent metrics
 */

import { MetricDomain, MetricType } from '../base/metricTypes';

export interface IAgentMetrics {
    performance: {
        duration: number;
        responseTime: number;
        throughput: number;
    };
    resources: {
        usage: number;
        cpuUsage: number;
        memoryUsage: number;
        diskIO: number;
        networkUsage: number;
    };
    usage: {
        state: {
            transitionCount: number;
            currentState: string;
            stateTime: number;
            taskStats: {
                completed: number;
                failed: number;
                pending: number;
            };
        };
    };
    errors?: {
        count: number;
        type: string;
        severity: string;
        timestamp: number;
        message: string;
    }[];
}

export interface IMetricsHandlerResult<T> {
    data: T[];
    timestamp: number;
    domain: MetricDomain;
    type: MetricType;
    success: boolean;
    error?: {
        message: string;
        code: string;
    };
}
