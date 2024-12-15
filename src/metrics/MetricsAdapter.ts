/**
 * @file MetricsAdapter.ts
 * @path src/metrics/MetricsAdapter.ts
 * @description Adapter for converting between different metrics formats
 */

import { BaseCallbackHandlerInput } from '@langchain/core/callbacks/base';
import { LLMResult } from '@langchain/core/outputs';
import { ChainValues } from '@langchain/core/utils/types';
import type { 
    ILLMMetrics, 
    ILLMResourceMetrics,
    ILLMPerformanceMetrics,
    ILLMUsageMetrics 
} from '../types/llm/llmMetricTypes';
import type { IBaseMetrics } from '../types/metrics/base/baseMetrics';
import type { IResourceMetrics } from '../types/metrics/base/resourceMetrics';
import type { IPerformanceMetrics } from '../types/metrics/base/performanceMetrics';
import type { IUsageMetrics, IRateLimitMetrics } from '../types/metrics/base/usageMetrics';
import { MetricDomain, MetricType } from '../types/metrics/base/metricsManagerTypes';

/**
 * Adapter for converting between different metrics formats
 */
export class MetricsAdapter {
    /**
     * Convert Langchain callback data to our metrics format
     */
    public static fromLangchainCallback(
        input: BaseCallbackHandlerInput,
        result: LLMResult | ChainValues | undefined,
        startTime: number,
        endTime: number
    ): ILLMMetrics {
        const duration = endTime - startTime;
        const tokenCount = result && 'llmOutput' in result ? 
            (result.llmOutput?.tokenUsage?.totalTokens || 0) : 0;

        // Create resource metrics
        const resourceMetrics: ILLMResourceMetrics = {
            cpuUsage: process.cpuUsage().user / 1000000, // Convert to seconds
            memoryUsage: process.memoryUsage().heapUsed,
            diskIO: { read: 0, write: 0 }, // Not available from Langchain
            networkUsage: { upload: 0, download: 0 }, // Not available from Langchain
            gpuMemoryUsage: 0, // Not available from Langchain
            modelMemoryAllocation: {
                weights: 0,
                cache: 0,
                workspace: 0
            },
            timestamp: endTime
        };

        // Create performance metrics
        const performanceMetrics: ILLMPerformanceMetrics = {
            executionTime: {
                total: duration,
                average: duration,
                min: duration,
                max: duration
            },
            latency: {
                total: duration,
                average: duration,
                min: duration,
                max: duration
            },
            throughput: {
                operationsPerSecond: 1000 / duration,
                dataProcessedPerSecond: tokenCount / (duration / 1000)
            },
            responseTime: {
                total: duration,
                average: duration,
                min: duration,
                max: duration
            },
            queueLength: 0,
            errorRate: 0,
            successRate: 1,
            errorMetrics: {
                totalErrors: 0,
                errorRate: 0
            },
            resourceUtilization: resourceMetrics,
            tokensPerSecond: tokenCount / (duration / 1000),
            coherenceScore: 1,
            temperatureImpact: 0,
            timestamp: endTime
        };

        // Create usage metrics
        const usageMetrics: ILLMUsageMetrics = {
            totalRequests: 1,
            activeInstances: 1,
            activeUsers: 1,
            requestsPerSecond: 1000 / duration,
            averageResponseLength: tokenCount,
            averageResponseSize: 0,
            peakMemoryUsage: process.memoryUsage().heapUsed,
            uptime: duration,
            rateLimit: {
                current: 0,
                limit: 0,
                remaining: 0,
                resetTime: 0
            },
            tokenDistribution: {
                prompt: result && 'llmOutput' in result ? 
                    (result.llmOutput?.tokenUsage?.promptTokens || 0) : 0,
                completion: result && 'llmOutput' in result ? 
                    (result.llmOutput?.tokenUsage?.completionTokens || 0) : 0,
                total: tokenCount
            },
            modelDistribution: {
                gpt4: 0,
                gpt35: 0,
                other: 1
            },
            timestamp: endTime
        };

        return {
            resources: resourceMetrics,
            performance: performanceMetrics,
            usage: usageMetrics,
            timestamp: endTime
        };
    }

    /**
     * Convert LLM metrics to base metrics format
     */
    public static toBaseMetrics(metrics: ILLMMetrics | undefined): IBaseMetrics {
        if (!metrics) {
            return this.createDefaultBaseMetrics();
        }

        // Convert LLM resource metrics to base resource metrics format
        const resourceMetrics: IResourceMetrics = {
            cpuUsage: metrics.resources.cpuUsage,
            memoryUsage: metrics.resources.memoryUsage,
            diskIO: metrics.resources.diskIO,
            networkUsage: metrics.resources.networkUsage,
            timestamp: metrics.resources.timestamp
        };

        // Convert LLM performance metrics to base performance metrics format
        const performanceMetrics: IPerformanceMetrics = {
            executionTime: metrics.performance.executionTime,
            latency: metrics.performance.latency,
            throughput: metrics.performance.throughput,
            responseTime: metrics.performance.responseTime,
            queueLength: metrics.performance.queueLength,
            errorRate: metrics.performance.errorRate,
            successRate: metrics.performance.successRate,
            errorMetrics: metrics.performance.errorMetrics,
            resourceUtilization: resourceMetrics,
            timestamp: metrics.performance.timestamp
        };

        // Convert LLM usage metrics to base usage metrics format
        const usageMetrics: IUsageMetrics = {
            totalRequests: metrics.usage.totalRequests,
            activeUsers: metrics.usage.activeUsers,
            requestsPerSecond: metrics.usage.requestsPerSecond,
            averageResponseSize: metrics.usage.averageResponseSize,
            peakMemoryUsage: metrics.usage.peakMemoryUsage,
            uptime: metrics.usage.uptime,
            rateLimit: metrics.usage.rateLimit,
            timestamp: metrics.usage.timestamp
        };

        return {
            resources: resourceMetrics,
            performance: performanceMetrics,
            usage: usageMetrics,
            timestamp: metrics.timestamp
        };
    }

    /**
     * Convert base metrics to LLM metrics format
     */
    public static toLLMMetrics(metrics: IBaseMetrics): ILLMMetrics {
        // Convert base resource metrics to LLM resource metrics format
        const resourceMetrics: ILLMResourceMetrics = {
            ...metrics.resources,
            gpuMemoryUsage: 0,
            modelMemoryAllocation: {
                weights: 0,
                cache: 0,
                workspace: 0
            }
        };

        // Convert base performance metrics to LLM performance metrics format
        const performanceMetrics: ILLMPerformanceMetrics = {
            executionTime: metrics.performance.executionTime,
            latency: metrics.performance.latency,
            throughput: metrics.performance.throughput,
            responseTime: metrics.performance.responseTime,
            queueLength: metrics.performance.queueLength,
            errorRate: metrics.performance.errorRate,
            successRate: metrics.performance.successRate,
            errorMetrics: metrics.performance.errorMetrics,
            resourceUtilization: resourceMetrics,  // Use the LLM resource metrics here
            tokensPerSecond: 0,
            coherenceScore: 1,
            temperatureImpact: 0,
            timestamp: metrics.performance.timestamp
        };

        // Convert base usage metrics to LLM usage metrics format
        const usageMetrics: ILLMUsageMetrics = {
            ...metrics.usage,
            activeInstances: 0,
            averageResponseLength: 0,
            tokenDistribution: {
                prompt: 0,
                completion: 0,
                total: 0
            },
            modelDistribution: {
                gpt4: 0,
                gpt35: 0,
                other: 0
            }
        };

        return {
            resources: resourceMetrics,
            performance: performanceMetrics,
            usage: usageMetrics,
            timestamp: metrics.timestamp
        };
    }

    /**
     * Create default base metrics
     */
    private static createDefaultBaseMetrics(): IBaseMetrics {
        const defaultRateLimit: IRateLimitMetrics = {
            current: 0,
            limit: 0,
            remaining: 0,
            resetTime: 0
        };

        const defaultResource: IResourceMetrics = {
            cpuUsage: 0,
            memoryUsage: 0,
            diskIO: { read: 0, write: 0 },
            networkUsage: { upload: 0, download: 0 },
            timestamp: Date.now()
        };

        return {
            resources: defaultResource,
            performance: {
                executionTime: { total: 0, average: 0, min: 0, max: 0 },
                latency: { total: 0, average: 0, min: 0, max: 0 },
                throughput: { operationsPerSecond: 0, dataProcessedPerSecond: 0 },
                responseTime: { total: 0, average: 0, min: 0, max: 0 },
                queueLength: 0,
                errorRate: 0,
                successRate: 1,
                errorMetrics: { totalErrors: 0, errorRate: 0 },
                resourceUtilization: defaultResource,
                timestamp: Date.now()
            },
            usage: {
                totalRequests: 0,
                activeUsers: 0,
                requestsPerSecond: 0,
                averageResponseSize: 0,
                peakMemoryUsage: 0,
                uptime: 0,
                rateLimit: defaultRateLimit,
                timestamp: Date.now()
            },
            timestamp: Date.now()
        };
    }
}
