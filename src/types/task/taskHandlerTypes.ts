/**
 * @file taskHandlerTypes.ts
 * @path KaibanJS/src/types/task/taskHandlerTypes.ts
 * @description Task handler type definitions and interfaces
 * 
 * @module @types/task
 */

import type { IBaseMetrics } from '../metrics/base/baseMetrics';
import type { ITaskResourceMetrics, ITaskPerformanceMetrics, ITaskUsageMetrics } from './taskMetricTypes';
import type { IBaseHandlerMetadata } from '../common/commonMetadataTypes';
import type { IAgentType } from '../agent/agentTypes';
import type { ITaskType } from './taskBaseTypes';
import type { ILLMUsageStats } from '../llm/llmResponseTypes';
import type { IStandardCostDetails } from '../common/commonMetricTypes';
import type { IResourceMetrics } from '../metrics/base/resourceMetrics';

/**
 * Task metrics interface
 */
export interface ITaskMetrics extends IBaseMetrics {
    // Core metrics
    resources: ITaskResourceMetrics;
    performance: ITaskPerformanceMetrics;
    usage: ITaskUsageMetrics;

    // Timing metrics
    startTime: number;
    endTime: number;
    duration: number;
    iterationCount: number;

    // Cost and usage metrics
    costs: IStandardCostDetails;
    llmUsage: ILLMUsageStats;
}

/**
 * Task handler metadata
 */
export interface ITaskHandlerMetadata extends IBaseHandlerMetadata {
    stepId?: string;
    priority?: number;
    deadline?: number;
    retryCount?: number;
}

/**
 * Task handler result
 */
export interface ITaskHandlerResult<T = unknown> {
    success: boolean;
    data: T;
    metadata?: ITaskHandlerMetadata;
}

/**
 * Task execution parameters
 */
export interface ITaskExecutionParams {
    task: ITaskType;
    agent: IAgentType;
    metadata?: ITaskHandlerMetadata;
    input?: unknown;
    options?: {
        timeout?: number;
        retries?: number;
        signal?: AbortSignal;
        strict?: boolean;
    };
}

/**
 * Task validation context
 */
export interface ITaskValidationContext {
    taskId: string;
    metadata?: ITaskHandlerMetadata;
    metrics?: ITaskMetrics;
}

/**
 * Task execution context
 */
export interface ITaskExecutionContext {
    taskId: string;
    agentId?: string;
    metadata?: ITaskHandlerMetadata;
    timestamp: number;
}

/**
 * Task validation result
 */
export interface ITaskValidationResult {
    isValid: boolean;
    errors: string[];
    context?: {
        taskId: string;
        taskStatus: string;
        validationTime: number;
    };
}

/**
 * Create default task metrics
 */
export function createDefaultTaskMetrics(): ITaskMetrics {
    const now = Date.now();
    return {
        // Base metrics (from IBaseMetrics)
        resource: {
            cpuUsage: 0,
            memoryUsage: 0,
            diskIO: { read: 0, write: 0 },
            networkUsage: { upload: 0, download: 0 },
            timestamp: now
        },
        timestamp: now,

        // Task-specific metrics
        startTime: now,
        endTime: now,
        duration: 0,
        iterationCount: 0,
        resources: {
            cpuUsage: 0,
            memoryUsage: 0,
            diskIO: { read: 0, write: 0 },
            networkUsage: { upload: 0, download: 0 },
            timestamp: now
        },
        performance: {
            executionTime: { total: 0, average: 0, min: 0, max: 0 },
            latency: { total: 0, average: 0, min: 0, max: 0 },
            throughput: { operationsPerSecond: 0, dataProcessedPerSecond: 0 },
            responseTime: { total: 0, average: 0, min: 0, max: 0 },
            queueLength: 0,
            errorRate: 0,
            successRate: 0,
            errorMetrics: { totalErrors: 0, errorRate: 0 },
            resourceUtilization: {
                cpuUsage: 0,
                memoryUsage: 0,
                diskIO: { read: 0, write: 0 },
                networkUsage: { upload: 0, download: 0 },
                timestamp: now
            },
            timestamp: now
        },
        usage: {
            totalRequests: 0,
            activeUsers: 0,
            requestsPerSecond: 0,
            averageResponseSize: 0,
            peakMemoryUsage: 0,
            uptime: 0,
            rateLimit: {
                current: 0,
                limit: 0,
                remaining: 0,
                resetTime: now
            },
            timestamp: now
        },
        costs: {
            inputCost: 0,
            outputCost: 0,
            totalCost: 0,
            currency: 'USD',
            breakdown: {
                promptTokens: { count: 0, cost: 0 },
                completionTokens: { count: 0, cost: 0 }
            }
        },
        llmUsage: {
            inputTokens: 0,
            outputTokens: 0,
            callsCount: 0,
            callsErrorCount: 0,
            parsingErrors: 0,
            totalLatency: 0,
            averageLatency: 0,
            lastUsed: now,
            memoryUtilization: {
                peakMemoryUsage: 0,
                averageMemoryUsage: 0,
                cleanupEvents: 0
            },
            costBreakdown: {
                input: 0,
                output: 0,
                total: 0,
                currency: 'USD'
            }
        }
    };
}
