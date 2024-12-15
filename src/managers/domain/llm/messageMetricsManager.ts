/**
 * @file messageMetricsManager.ts
 * @path src/managers/domain/llm/messageMetricsManager.ts
 * @description Message metrics management integrating Langchain LLM metrics
 */

import { CoreManager } from '../../core/coreManager';
import { createValidationResult } from '../../../utils/validation/validationUtils';
import type { IValidationResult } from '../../../types/common/commonValidationTypes';
import type { IStandardCostDetails } from '../../../types/common/commonMetricTypes';
import { MESSAGE_ERROR_TYPE_enum } from '../../../types/common/commonEnums';
import {
    ILLMMetrics,
    ILLMResourceMetrics,
    ILLMPerformanceMetrics,
    ILLMUsageMetrics,
    LLMMetricsTypeGuards,
    LLMMetricsValidation
} from '../../../types/llm/llmMetricTypes';

// ─── Types ───────────────────────────────────────────────────────────────────────

interface IMessageMetricsCollection {
    resources: ILLMResourceMetrics[];
    performance: ILLMPerformanceMetrics[];
    usage: ILLMUsageMetrics[];
    timestamp: number;
}

interface IBatchMetricsOptions {
    startTime: number;
    endTime: number;
    aggregateBy?: 'minute' | 'hour' | 'day';
}

// ─── Manager Implementation ──────────────────────────────────────────────────────

export class MessageMetricsManager extends CoreManager {
    private static instance: MessageMetricsManager;
    private readonly metricsHistory: Map<string, IMessageMetricsCollection>;
    private readonly realtimeMetrics: Map<string, {
        lastUpdate: number;
        metrics: IMessageMetricsCollection;
    }>;

    private constructor() {
        super();
        this.metricsHistory = new Map();
        this.realtimeMetrics = new Map();
        this.registerDomainManager('MessageMetricsManager', this);
        this.initializePeriodicTasks();
    }

    public static getInstance(): MessageMetricsManager {
        if (!MessageMetricsManager.instance) {
            MessageMetricsManager.instance = new MessageMetricsManager();
        }
        return MessageMetricsManager.instance;
    }

    private initializePeriodicTasks(): void {
        // Aggregate realtime metrics every 5 minutes
        setInterval(() => this.aggregateRealtimeMetrics(), 300000);
    }

    // ─── Collection Methods ────────────────────────────────────────────────────────

    public async collectMetrics(
        messageId: string,
        metrics: ILLMMetrics
    ): Promise<IValidationResult> {
        try {
            const validationResult = LLMMetricsValidation.validateLLMMetrics(metrics);
            if (!validationResult.isValid) {
                return validationResult;
            }

            await this.storeMetrics(messageId, metrics);
            await this.monitorMetrics(messageId, metrics);

            return createValidationResult(true, [], []);
        } catch (error) {
            const errorMessage = `Failed to collect message metrics: ${error instanceof Error ? error.message : String(error)}`;
            this.logError(errorMessage, undefined, undefined, error instanceof Error ? error : undefined);
            return createValidationResult(false, [errorMessage]);
        }
    }

    private async storeMetrics(messageId: string, metrics: ILLMMetrics): Promise<void> {
        const messageMetrics = this.metricsHistory.get(messageId) || {
            resources: [],
            performance: [],
            usage: [],
            timestamp: Date.now()
        };

        messageMetrics.resources.push(metrics.resources);
        messageMetrics.performance.push(metrics.performance);
        messageMetrics.usage.push(metrics.usage);
        messageMetrics.timestamp = Date.now();

        this.metricsHistory.set(messageId, messageMetrics);
        this.updateRealtimeMetrics(messageId, metrics);
    }

    // ─── Monitoring Methods ────────────────────────────────────────────────────────

    private async monitorMetrics(messageId: string, metrics: ILLMMetrics): Promise<void> {
        try {
            // Resource monitoring
            if (metrics.resources.cpuUsage > 80) {
                this.logWarn(`High CPU usage for message ${messageId}: ${metrics.resources.cpuUsage}%`);
            }

            if (metrics.resources.memoryUsage > 1000000000) { // 1GB
                this.logWarn(`High memory usage for message ${messageId}: ${metrics.resources.memoryUsage} bytes`);
            }

            // Performance monitoring
            if (metrics.performance.errorRate > 10) {
                this.logWarn(`High error rate for message ${messageId}: ${metrics.performance.errorRate}%`);
            }

            if (metrics.performance.tokensPerSecond < 10) {
                this.logWarn(`Low processing speed for message ${messageId}: ${metrics.performance.tokensPerSecond} tokens/s`);
            }

            // Usage monitoring
            if (metrics.usage.tokenDistribution.total > 4000) {
                this.logWarn(`High token usage for message ${messageId}: ${metrics.usage.tokenDistribution.total} tokens`);
            }

            await this.analyzePerformanceTrends(messageId);
        } catch (error) {
            this.logError(
                `Failed to monitor metrics: ${error instanceof Error ? error.message : String(error)}`,
                undefined,
                undefined,
                error instanceof Error ? error : undefined
            );
        }
    }

    private async analyzePerformanceTrends(messageId: string): Promise<void> {
        const messageMetrics = this.metricsHistory.get(messageId);
        if (!messageMetrics || messageMetrics.performance.length < 5) return;

        const recentMetrics = messageMetrics.performance.slice(-5);
        
        // Analyze error rate trend
        const avgErrorRate = recentMetrics.reduce((sum, m) => sum + m.errorRate, 0) / 5;
        if (avgErrorRate > 5) {
            this.logWarn(`Increasing error rate trend for message ${messageId}: ${avgErrorRate}% average`);
        }

        // Analyze processing speed trend
        const avgTokensPerSecond = recentMetrics.reduce((sum, m) => sum + m.tokensPerSecond, 0) / 5;
        if (avgTokensPerSecond < 15) {
            this.logWarn(`Decreasing processing speed trend for message ${messageId}: ${avgTokensPerSecond} tokens/s average`);
        }
    }

    // ─── Realtime Processing ───────────────────────────────────────────────────────

    private updateRealtimeMetrics(messageId: string, metrics: ILLMMetrics): void {
        const current = this.realtimeMetrics.get(messageId) || {
            lastUpdate: Date.now(),
            metrics: {
                resources: [],
                performance: [],
                usage: [],
                timestamp: Date.now()
            }
        };

        current.metrics.resources.push(metrics.resources);
        current.metrics.performance.push(metrics.performance);
        current.metrics.usage.push(metrics.usage);
        current.lastUpdate = Date.now();

        this.realtimeMetrics.set(messageId, current);
    }

    private async aggregateRealtimeMetrics(): Promise<void> {
        const now = Date.now();
        for (const [messageId, data] of this.realtimeMetrics.entries()) {
            if (now - data.lastUpdate > 300000) { // 5 minutes
                const aggregated = this.calculateAggregatedMetrics(data.metrics);
                await this.storeMetrics(messageId, aggregated);
                this.realtimeMetrics.delete(messageId);
            }
        }
    }

    private calculateAggregatedMetrics(metrics: IMessageMetricsCollection): ILLMMetrics {
        const len = metrics.resources.length;
        if (len === 0) {
            throw new Error('No metrics to aggregate');
        }

        // Calculate shared resource metrics used for both properties
        const resourceMetrics: ILLMResourceMetrics = {
            cpuUsage: metrics.resources.reduce((sum, m) => sum + m.cpuUsage, 0) / len,
            memoryUsage: metrics.resources.reduce((sum, m) => sum + m.memoryUsage, 0) / len,
            diskIO: {
                read: metrics.resources.reduce((sum, m) => sum + m.diskIO.read, 0) / len,
                write: metrics.resources.reduce((sum, m) => sum + m.diskIO.write, 0) / len
            },
            networkUsage: {
                upload: metrics.resources.reduce((sum, m) => sum + m.networkUsage.upload, 0) / len,
                download: metrics.resources.reduce((sum, m) => sum + m.networkUsage.download, 0) / len
            },
            gpuMemoryUsage: metrics.resources.reduce((sum, m) => sum + m.gpuMemoryUsage, 0) / len,
            modelMemoryAllocation: {
                weights: metrics.resources.reduce((sum, m) => sum + m.modelMemoryAllocation.weights, 0) / len,
                cache: metrics.resources.reduce((sum, m) => sum + m.modelMemoryAllocation.cache, 0) / len,
                workspace: metrics.resources.reduce((sum, m) => sum + m.modelMemoryAllocation.workspace, 0) / len
            },
            timestamp: Date.now()
        };

        // Return metrics with shared resource metrics for both properties
        return {
            // Both properties reference the same metrics object
            resources: resourceMetrics,
            performance: {
                executionTime: metrics.performance[len - 1].executionTime,
                latency: metrics.performance[len - 1].latency,
                throughput: metrics.performance[len - 1].throughput,
                responseTime: metrics.performance[len - 1].responseTime,
                queueLength: metrics.performance.reduce((sum, m) => sum + m.queueLength, 0) / len,
                errorRate: metrics.performance.reduce((sum, m) => sum + m.errorRate, 0) / len,
                successRate: metrics.performance.reduce((sum, m) => sum + m.successRate, 0) / len,
                errorMetrics: metrics.performance[len - 1].errorMetrics,
                resourceUtilization: metrics.performance[len - 1].resourceUtilization,
                tokensPerSecond: metrics.performance.reduce((sum, m) => sum + m.tokensPerSecond, 0) / len,
                coherenceScore: metrics.performance.reduce((sum, m) => sum + m.coherenceScore, 0) / len,
                temperatureImpact: metrics.performance.reduce((sum, m) => sum + m.temperatureImpact, 0) / len,
                timestamp: Date.now()
            },
            usage: {
                totalRequests: metrics.usage[len - 1].totalRequests,
                activeInstances: metrics.usage[len - 1].activeInstances,
                activeUsers: metrics.usage[len - 1].activeUsers,
                requestsPerSecond: metrics.usage.reduce((sum, m) => sum + m.requestsPerSecond, 0) / len,
                averageResponseLength: metrics.usage.reduce((sum, m) => sum + m.averageResponseLength, 0) / len,
                averageResponseSize: metrics.usage.reduce((sum, m) => sum + m.averageResponseSize, 0) / len,
                peakMemoryUsage: Math.max(...metrics.usage.map(m => m.peakMemoryUsage)),
                uptime: metrics.usage[len - 1].uptime,
                rateLimit: metrics.usage[len - 1].rateLimit,
                tokenDistribution: {
                    prompt: metrics.usage.reduce((sum, m) => sum + m.tokenDistribution.prompt, 0),
                    completion: metrics.usage.reduce((sum, m) => sum + m.tokenDistribution.completion, 0),
                    total: metrics.usage.reduce((sum, m) => sum + m.tokenDistribution.total, 0)
                },
                modelDistribution: {
                    gpt4: metrics.usage.reduce((sum, m) => sum + m.modelDistribution.gpt4, 0),
                    gpt35: metrics.usage.reduce((sum, m) => sum + m.modelDistribution.gpt35, 0),
                    other: metrics.usage.reduce((sum, m) => sum + m.modelDistribution.other, 0)
                },
                timestamp: Date.now()
            },
            timestamp: Date.now()
        };
    }

    // ─── Utility Methods ──────────────────────────────────────────────────────────

    public getMetrics(messageId: string): IMessageMetricsCollection | undefined {
        return this.metricsHistory.get(messageId);
    }

    public clearMetrics(messageId: string): void {
        this.metricsHistory.delete(messageId);
        this.realtimeMetrics.delete(messageId);
    }

    public getMetricsHistorySize(): number {
        return this.metricsHistory.size;
    }
}

export default MessageMetricsManager.getInstance();
