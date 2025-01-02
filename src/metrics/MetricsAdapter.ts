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
import type { IRateLimitMetrics } from '../types/metrics/base/usageMetrics';
import { ERROR_KINDS } from '../types/common/errorTypes';
import { ERROR_SEVERITY_enum } from '../types/common/enumTypes';

/**
 * Adapter for converting between different metrics formats
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
    ): ILLMMetrics {
        const duration = endTime - startTime;
        const tokenCount = result && 'llmOutput' in result ? 
            (result.llmOutput?.tokenUsage?.totalTokens || 0) : 0;

        // Create resource metrics
        const resourceMetrics: ILLMResourceMetrics = {
            component: 'llm',
            category: 'resource',
            version: '1.0.0',
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
            component: 'llm',
            category: 'performance',
            version: '1.0.0',
            responseTime: {
                average: duration,
                min: duration,
                max: duration,
                total: duration
            },
            throughput: {
                requestsPerSecond: 1000 / duration,
                bytesPerSecond: tokenCount * 2, // Rough estimate: 2 bytes per token
                operationsPerSecond: 1000 / duration,
                dataProcessedPerSecond: tokenCount / (duration / 1000)
            },
            errorMetrics: {
                count: 0,
                rate: 0,
                lastError: 0,
                byType: Object.values(ERROR_KINDS).reduce(
                    (acc, key) => ({ ...acc, [key]: 0 }),
                    {} as Record<string, number>
                ),
                bySeverity: Object.values(ERROR_SEVERITY_enum).reduce(
                    (acc, key) => ({ ...acc, [key]: 0 }),
                    {} as Record<string, number>
                ),
                avgLatencyIncrease: 0,
                avgMemoryUsage: 0,
                avgCpuUsage: 0,
                hourlyErrors: new Array(24).fill(0)
            },
            tokensPerSecond: tokenCount / (duration / 1000),
            coherenceScore: 1,
            temperatureImpact: 0,
            timestamp: endTime
        };

        // Create usage metrics
        const usageMetrics: ILLMUsageMetrics = {
            component: 'llm',
            category: 'usage',
            version: '1.0.0',
            totalRequests: 1,
            activeInstances: 1,
            activeUsers: 1,
            requestsPerSecond: 1000 / duration,
            averageResponseSize: tokenCount,
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

        return {
            component: metrics.resources.component,
            category: metrics.resources.category,
            version: metrics.resources.version,
            timestamp: metrics.timestamp
        };
    }

    /**
     * Convert base metrics to LLM metrics format
     */
    public static toLLMMetrics(metrics: IBaseMetrics): ILLMMetrics {
        // Create default metrics with base values
        const defaultRateLimit: IRateLimitMetrics = {
            current: 0,
            limit: 0,
            remaining: 0,
            resetTime: 0
        };

        return {
            resources: {
                component: metrics.component,
                category: metrics.category,
                version: metrics.version,
                cpuUsage: 0,
                memoryUsage: 0,
                diskIO: { read: 0, write: 0 },
                networkUsage: { upload: 0, download: 0 },
                gpuMemoryUsage: 0,
                modelMemoryAllocation: {
                    weights: 0,
                    cache: 0,
                    workspace: 0
                },
                timestamp: metrics.timestamp
            },
            performance: {
                component: metrics.component,
                category: metrics.category,
                version: metrics.version,
                responseTime: {
                    average: 0,
                    min: 0,
                    max: 0,
                    total: 0
                },
                throughput: {
                    requestsPerSecond: 0,
                    bytesPerSecond: 0,
                    operationsPerSecond: 0,
                    dataProcessedPerSecond: 0
                },
                errorMetrics: {
                    count: 0,
                    rate: 0,
                    lastError: 0,
                    byType: Object.values(ERROR_KINDS).reduce(
                        (acc, key) => ({ ...acc, [key]: 0 }),
                        {} as Record<string, number>
                    ),
                    bySeverity: Object.values(ERROR_SEVERITY_enum).reduce(
                        (acc, key) => ({ ...acc, [key]: 0 }),
                        {} as Record<string, number>
                    ),
                    avgLatencyIncrease: 0,
                    avgMemoryUsage: 0,
                    avgCpuUsage: 0,
                    hourlyErrors: new Array(24).fill(0)
                },
                tokensPerSecond: 0,
                coherenceScore: 1,
                temperatureImpact: 0,
                timestamp: metrics.timestamp
            },
            usage: {
                component: metrics.component,
                category: metrics.category,
                version: metrics.version,
                totalRequests: 0,
                activeInstances: 0,
                activeUsers: 0,
                requestsPerSecond: 0,
                averageResponseSize: 0,
                peakMemoryUsage: 0,
                uptime: 0,
                rateLimit: defaultRateLimit,
                tokenDistribution: {
                    prompt: 0,
                    completion: 0,
                    total: 0
                },
                modelDistribution: {
                    gpt4: 0,
                    gpt35: 0,
                    other: 0
                },
                timestamp: metrics.timestamp
            },
            timestamp: metrics.timestamp
        };
    }

    /**
     * Create default base metrics
     */
    private static createDefaultBaseMetrics(): IBaseMetrics {
        return {
            component: 'llm',
            category: 'metrics',
            version: '1.0.0',
            timestamp: Date.now()
        };
    }
}
