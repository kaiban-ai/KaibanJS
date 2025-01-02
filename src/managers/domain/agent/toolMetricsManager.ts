import { Tool } from '@langchain/core/tools';
import { CoreManager } from '../../core/coreManager';
import { MetricsManager } from '../../core/metricsManager';
import { CircularBuffer } from '../../core/metrics/CircularBuffer';
import { ERROR_KINDS, createError } from '../../../types/common/errorTypes';
import { MANAGER_CATEGORY_enum, ERROR_SEVERITY_enum } from '../../../types/common/enumTypes';
import { createBaseMetadata } from '../../../types/common/baseTypes';
import { MetricDomain, MetricType } from '../../../types/metrics/base/metricsManagerTypes';

import type { 
    IToolResourceMetrics,
    IToolPerformanceMetrics,
    IToolUsageMetrics,
    IValidationResult
} from '../../../types/tool/toolMetricTypes';
import type { IStandardCostDetails } from '../../../types/common/baseTypes';
import type { IToolMetricsManager } from '../../../types/tool/toolManagerTypes';

export class ToolMetricsManager extends CoreManager implements IToolMetricsManager {
    private static instance: ToolMetricsManager;
    private readonly metricsManager: MetricsManager;
    private readonly toolExecutions: Map<string, {
        totalExecutions: number;
        successfulExecutions: number;
        failedExecutions: number;
        totalDuration: number;
        lastExecutionTime?: number;
        lastError?: Error;
    }>;
    private readonly collectionIntervals: Map<string, NodeJS.Timeout>;
    private readonly executionHistory: CircularBuffer<{
        toolName: string;
        duration: number;
        success: boolean;
        timestamp: number;
    }>;

    private readonly DEFAULT_SAMPLING_RATE = 1000; // 1 second
    private readonly DEFAULT_HISTORY_SIZE = 1000;
    private isInitialized = false;
    public readonly category = MANAGER_CATEGORY_enum.METRICS;

    private constructor() {
        super();
        this.metricsManager = MetricsManager.getInstance();
        this.toolExecutions = new Map();
        this.collectionIntervals = new Map();
        this.executionHistory = new CircularBuffer(this.DEFAULT_HISTORY_SIZE);
        this.registerDomainManager('ToolMetricsManager', this);
    }

    public static getInstance(): ToolMetricsManager {
        if (!ToolMetricsManager.instance) {
            ToolMetricsManager.instance = new ToolMetricsManager();
        }
        return ToolMetricsManager.instance;
    }

    public async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            await this.metricsManager.trackMetric({
                domain: MetricDomain.TOOL,
                type: MetricType.SYSTEM_HEALTH,
                value: 1,
                timestamp: Date.now(),
                metadata: {
                    operation: 'initialize',
                    component: this.constructor.name
                }
            });

            this.isInitialized = true;
            this.logInfo('Tool metrics manager initialized');
        } catch (error) {
            throw createError({
                message: 'Failed to initialize tool metrics manager',
                type: ERROR_KINDS.InitializationError,
                context: { 
                    error: error instanceof Error ? error : new Error(String(error))
                }
            });
        }
    }

    public async validate(): Promise<boolean> {
        return this.isInitialized;
    }

    public async createMetrics(toolName: string): Promise<void> {
        this.toolExecutions.set(toolName, {
            totalExecutions: 0,
            successfulExecutions: 0,
            failedExecutions: 0,
            totalDuration: 0
        });

        await this.metricsManager.trackMetric({
            domain: MetricDomain.TOOL,
            type: MetricType.PERFORMANCE,
            value: 0,
            timestamp: Date.now(),
            metadata: {
                toolName,
                operation: 'createMetrics',
                baseMetrics: this.createBaseMetrics()
            }
        });
    }

    public startCollection(toolName: string, samplingRate?: number): void {
        if (this.collectionIntervals.has(toolName)) {
            this.logWarn(`Metrics collection already running for tool ${toolName}`);
            return;
        }

        const interval = setInterval(
            () => this.collectMetricsInternal(toolName),
            samplingRate || this.DEFAULT_SAMPLING_RATE
        );

        this.collectionIntervals.set(toolName, interval);
        this.logInfo(`Started metrics collection for tool ${toolName}`);
    }

    public stopCollection(toolName: string): void {
        const interval = this.collectionIntervals.get(toolName);
        if (interval) {
            clearInterval(interval);
            this.collectionIntervals.delete(toolName);
            this.logInfo(`Stopped metrics collection for tool ${toolName}`);
        }
    }

    public clearMetricsHistory(toolName: string): void {
        this.toolExecutions.delete(toolName);
    }

    public async updateMetrics(toolName: string, executionTime: number): Promise<void> {
        const metrics = this.toolExecutions.get(toolName);
        if (!metrics) return;

        metrics.totalExecutions++;
        metrics.totalDuration += executionTime;
        metrics.lastExecutionTime = Date.now();

        await this.metricsManager.trackMetric({
            domain: MetricDomain.TOOL,
            type: MetricType.PERFORMANCE,
            value: executionTime,
            timestamp: Date.now(),
            metadata: {
                toolName,
                operation: 'updateMetrics',
                metrics,
                baseMetrics: this.createBaseMetrics()
            }
        });
    }

    public async trackToolExecution(params: {
        tool: Tool;
        duration: number;
        success: boolean;
        error?: Error;
    }): Promise<void> {
        const metrics = this.toolExecutions.get(params.tool.name);
        if (!metrics) return;

        if (params.success) {
            metrics.successfulExecutions++;
        } else {
            metrics.failedExecutions++;
            metrics.lastError = params.error;
        }

        this.executionHistory.push({
            toolName: params.tool.name,
            duration: params.duration,
            success: params.success,
            timestamp: Date.now()
        });

        await this.metricsManager.trackMetric({
            domain: MetricDomain.TOOL,
            type: MetricType.PERFORMANCE,
            value: params.duration,
            timestamp: Date.now(),
            metadata: {
                toolName: params.tool.name,
                operation: 'trackToolExecution',
                success: params.success,
                error: params.error,
                metrics,
                baseMetrics: this.createBaseMetrics()
            }
        });
    }

    public async getToolMetrics(toolName: string): Promise<{
        totalExecutions: number;
        successfulExecutions: number;
        failedExecutions: number;
        averageDuration: number;
        lastExecutionTime?: number;
        lastError?: Error;
    }> {
        const metrics = this.toolExecutions.get(toolName);
        if (!metrics) {
            throw createError({
                message: `No metrics found for tool ${toolName}`,
                type: ERROR_KINDS.NotFoundError
            });
        }

        return {
            ...metrics,
            averageDuration: metrics.totalDuration / metrics.totalExecutions || 0
        };
    }

    public async getUsageFrequency(toolName: string): Promise<Record<string, number>> {
        const history = this.executionHistory.getItems()
            .filter(item => item.toolName === toolName);
        
        const hourlyStats = new Map<number, number>();
        const now = Date.now();
        const hourInMs = 3600000;

        history.forEach(item => {
            const hourBucket = Math.floor((now - item.timestamp) / hourInMs);
            hourlyStats.set(hourBucket, (hourlyStats.get(hourBucket) || 0) + 1);
        });

        return Object.fromEntries(Array.from(hourlyStats.entries())
            .map(([hour, count]) => [`${hour}h`, count]));
    }

    public calculateCostDetails(
        toolId: string,
        inputSize: number,
        outputSize: number
    ): IStandardCostDetails {
        // Standard cost calculation for tool usage
        const inputCost = inputSize * 0.0001; // $0.0001 per input unit
        const outputCost = outputSize * 0.0002; // $0.0002 per output unit

        return {
            inputCost,
            outputCost,
            totalCost: inputCost + outputCost,
            currency: 'USD',
            breakdown: {
                promptTokens: { count: inputSize, cost: inputCost },
                completionTokens: { count: outputSize, cost: outputCost }
            }
        };
    }

    private async collectMetricsInternal(toolName: string): Promise<void> {
        try {
            const metrics = await this.getToolMetrics(toolName);

            await this.metricsManager.trackMetric({
                domain: MetricDomain.TOOL,
                type: MetricType.PERFORMANCE,
                value: metrics.averageDuration,
                timestamp: Date.now(),
                metadata: {
                    toolName,
                    operation: 'collectMetrics',
                    metrics,
                    baseMetrics: this.createBaseMetrics()
                }
            });

        } catch (error) {
            this.logError(
                `Error collecting metrics for tool ${toolName}`,
                error instanceof Error ? error : new Error(String(error))
            );
        }
    }

    private createBaseMetrics() {
        return {
            timestamp: Date.now(),
            component: this.constructor.name,
            category: this.category,
            version: '1.0.0'
        };
    }
}

export default ToolMetricsManager.getInstance();