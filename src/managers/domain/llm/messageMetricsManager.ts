/**
* @file messageMetricsManager.ts
* @path src/managers/domain/llm/messageMetricsManager.ts
* @description Message metrics management integrating Langchain LLM metrics
*/

import { CoreManager } from '../../core/coreManager';
import { createValidationResult } from '../../../types/common/validationTypes';
import type { IValidationResult } from '../../../types/common/validationTypes';
import { createBaseMetadata } from '../../../types/common/baseTypes';
import type { IBaseManagerMetadata } from '../../../types/agent/agentManagerTypes';
import { MANAGER_CATEGORY_enum } from '../../../types/common/enumTypes';
import { ERROR_KINDS, ERROR_SEVERITY_enum, type IErrorKind, type IErrorSeverity } from '../../../types/common/errorTypes';

// Initialize error type records with all possible values
const createErrorTypeRecord = () => Object.values(ERROR_KINDS).reduce((acc, kind) => ({
    ...acc,
    [kind]: 0
}), {} as Record<IErrorKind, number>);

const createErrorSeverityRecord = () => Object.values(ERROR_SEVERITY_enum).reduce((acc, severity) => ({
    ...acc,
    [severity]: 0
}), {} as Record<IErrorSeverity, number>);
import {
    ILLMMetrics,
    ILLMResourceMetrics,
    ILLMPerformanceMetrics,
    ILLMUsageMetrics,
    LLMMetricsValidation
} from '../../../types/llm/llmMetricTypes';

// ─── Types ───────────────────────────────────────────────────────────────────────

export interface IMessageMetricsCollection {
    resources: ILLMResourceMetrics[];
    performance: ILLMPerformanceMetrics[];
    usage: ILLMUsageMetrics[];
    timestamp: number;
}

// ─── Manager Implementation ──────────────────────────────────────────────────────

export class MessageMetricsManager extends CoreManager {
    private static instance: MessageMetricsManager;
    private readonly metricsHistory: Map<string, IMessageMetricsCollection>;
    private readonly realtimeMetrics: Map<string, {
        lastUpdate: number;
        metrics: IMessageMetricsCollection;
    }>;
    public readonly category = MANAGER_CATEGORY_enum.METRICS;

    protected constructor() {
        super();
        this.metricsHistory = new Map();
        this.realtimeMetrics = new Map();
        this.registerDomainManager('MessageMetricsManager', this);
        this.initializePeriodicTasks();
    }

    public async initialize(params?: Record<string, unknown>): Promise<void> {
        try {
            this.logInfo('Initializing MessageMetricsManager', { params });
            await super.initialize(params);
            await this.initializePeriodicTasks();
            this.logInfo('MessageMetricsManager initialized successfully');
        } catch (error) {
            await this.handleError(error, 'Failed to initialize MessageMetricsManager');
            throw error;
        }
    }

    protected async cleanup(): Promise<void> {
        try {
            this.logInfo('Cleaning up MessageMetricsManager');
            this.metricsHistory.clear();
            this.realtimeMetrics.clear();
            this.logInfo('MessageMetricsManager cleanup completed');
        } catch (error) {
            await this.handleError(error, 'Failed to cleanup MessageMetricsManager');
            throw error;
        }
    }

    public async validate(_params: unknown): Promise<boolean> {
        return true;
    }

    public getMetadata(): IBaseManagerMetadata {
        const baseMetadata = createBaseMetadata(this.constructor.name, 'metrics');
        return {
            ...baseMetadata,
            category: this.category,
            operation: 'metrics',
            duration: 0,
            status: 'success',
            agent: {
                id: '',
                name: this.constructor.name,
                role: 'metrics',
                status: ''
            }
        };
    }

    public static getInstance(): MessageMetricsManager {
        if (!MessageMetricsManager.instance) {
            MessageMetricsManager.instance = new MessageMetricsManager();
        }
        return MessageMetricsManager.instance;
    }

    private initializePeriodicTasks(): Promise<void> {
        return new Promise<void>((resolve) => {
            this.logInfo('Initializing periodic tasks');
            // Aggregate realtime metrics every 5 minutes
            setInterval(() => this.aggregateRealtimeMetrics(), 300000);
            resolve();
        });
    }

    // ─── Collection Methods ────────────────────────────────────────────────────────

    public async collectLLMMetrics(
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

            return createValidationResult({
                isValid: true,
                errors: [],
                warnings: []
            });
        } catch (error) {
            const errorMessage = `Failed to collect message metrics: ${error instanceof Error ? error.message : String(error)}`;
            await this.handleError(error, errorMessage);
            return createValidationResult({
                isValid: false,
                errors: [errorMessage]
            });
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
            const errorRate = metrics.performance.errorMetrics?.rate || 0;
            if (errorRate > 10) {
                this.logWarn(`High error rate for message ${messageId}: ${errorRate}%`);
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
            await this.handleError(error, 'Failed to monitor metrics');
        }
    }

    private async analyzePerformanceTrends(messageId: string): Promise<void> {
        const messageMetrics = this.metricsHistory.get(messageId);
        if (!messageMetrics || messageMetrics.performance.length < 5) return;

        const recentMetrics = messageMetrics.performance.slice(-5);
        
        // Analyze error rate trend
        const avgErrorRate = recentMetrics.reduce((sum, m) => sum + (m.errorMetrics?.rate || 0), 0) / 5;
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
            component: this.constructor.name,
            category: 'RESOURCE',
            version: '1.0.0',
            timestamp: Date.now(),
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
            }
        };

        // Return metrics with shared resource metrics for both properties
        return {
            resources: resourceMetrics,
            performance: {
                component: this.constructor.name,
                category: 'PERFORMANCE',
                version: '1.0.0',
                timestamp: Date.now(),
                responseTime: metrics.performance[len - 1].responseTime,
                throughput: metrics.performance[len - 1].throughput,
                tokensPerSecond: metrics.performance.reduce((sum, m) => sum + m.tokensPerSecond, 0) / len,
                coherenceScore: metrics.performance.reduce((sum, m) => sum + m.coherenceScore, 0) / len,
                temperatureImpact: metrics.performance.reduce((sum, m) => sum + m.temperatureImpact, 0) / len,
                errorMetrics: {
                    ...metrics.performance[len - 1].errorMetrics,
                    rate: metrics.performance.reduce((sum, m) => sum + (m.errorMetrics?.rate || 0), 0) / len
                }
            },
            usage: {
                component: this.constructor.name,
                category: 'USAGE',
                version: '1.0.0',
                timestamp: Date.now(),
                totalRequests: metrics.usage[len - 1].totalRequests,
                activeInstances: metrics.usage[len - 1].activeInstances,
                activeUsers: metrics.usage[len - 1].activeUsers,
                requestsPerSecond: metrics.usage.reduce((sum, m) => sum + m.requestsPerSecond, 0) / len,
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
                }
            },
            timestamp: Date.now()
        };
    }

    // ─── Performance Metrics Update ───────────────────────────────────────────────

    public async updatePerformanceMetrics(messageId: string, metrics: Partial<ILLMPerformanceMetrics>): Promise<void> {
        try {
            this.logInfo('Updating performance metrics', { messageId });
            
            const messageMetrics = this.metricsHistory.get(messageId) || {
                resources: [],
                performance: [],
                usage: [],
                timestamp: Date.now()
            };

            const currentPerformance = messageMetrics.performance[messageMetrics.performance.length - 1] || {
                component: this.constructor.name,
                category: 'PERFORMANCE',
                version: '1.0.0',
                timestamp: Date.now(),
                responseTime: {
                    average: 0,
                    min: 0,
                    max: 0
                },
                throughput: {
                    requestsPerSecond: 0,
                    bytesPerSecond: 0
                },
                tokensPerSecond: 0,
                coherenceScore: 0,
                temperatureImpact: 0,
                errorMetrics: {
                    count: 0,
                    rate: 0,
                    lastError: Date.now(),
                    byType: createErrorTypeRecord(),
                    bySeverity: createErrorSeverityRecord(),
                    avgLatencyIncrease: 0,
                    avgMemoryUsage: 0,
                    avgCpuUsage: 0,
                    hourlyErrors: new Array(24).fill(0)
                }
            };

            // Update performance metrics with new values while preserving existing ones
            const updatedPerformance = {
                ...currentPerformance,
                ...metrics,
                timestamp: Date.now()
            };

            // Validate the updated metrics
            const validationResult = await this.validate(updatedPerformance);
            if (!validationResult) {
                throw new Error('Invalid performance metrics update');
            }

            messageMetrics.performance.push(updatedPerformance);
            this.metricsHistory.set(messageId, messageMetrics);

            // Update realtime metrics if they exist
            const realtimeData = this.realtimeMetrics.get(messageId);
            if (realtimeData) {
                realtimeData.metrics.performance.push(updatedPerformance);
                realtimeData.lastUpdate = Date.now();
                this.realtimeMetrics.set(messageId, realtimeData);
            }

            this.logInfo('Performance metrics updated successfully', { messageId });

        } catch (error) {
            await this.handleError(error, 'Failed to update performance metrics');
            throw error;
        }
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
