/**
 * @file metricsManager.ts
 * @path KaibanJS/src/managers/core/metricsManager.ts
 * @description Core metrics management implementation providing centralized metrics collection and aggregation
 */

import { CoreManager } from './coreManager';
import { createValidationResult } from '../../utils/validation/validationUtils';
import { createBaseMetadata } from '../../types/common/commonMetadataTypes';
import { createError } from '../../types/common/commonErrorTypes';
import type { IValidationResult } from '../../types/common/commonValidationTypes';
import { 
    MetricDomain,
    MetricType,
    AggregationStrategy
} from '../../types/metrics/base/metricsManagerTypes';
import type {
    IMetricsManager,
    IMetricEvent,
    IMetricFilter,
    IAggregationQuery,
    IAggregatedMetric,
    IRolledUpMetrics,
    IMetricsHandlerResult,
    IMetricsHandlerMetadata
} from '../../types/metrics/base/metricsManagerTypes';
import type { IResourceMetrics } from '../../types/metrics/base/resourceMetrics';
import type { IPerformanceMetrics } from '../../types/metrics/base/performanceMetrics';

/**
 * Core metrics manager implementation
 */
export class MetricsManager extends CoreManager implements IMetricsManager {
    private static instance: MetricsManager | null = null;
    private metrics: Map<string, IMetricEvent[]>;
    private readonly CLEANUP_INTERVAL = 3600000; // 1 hour
    private readonly RETENTION_PERIOD = 86400000; // 24 hours

    private constructor() {
        super();
        this.metrics = new Map();
        this.registerDomainManager('MetricsManager', this);
        this.setupCleanupInterval();
    }

    public static getInstance(): MetricsManager {
        if (!MetricsManager.instance) {
            MetricsManager.instance = new MetricsManager();
        }
        return MetricsManager.instance;
    }

    /**
     * Get initial resource metrics
     */
    public async getInitialResourceMetrics(): Promise<IResourceMetrics> {
        return {
            cpuUsage: 0,
            memoryUsage: process.memoryUsage().heapUsed,
            diskIO: { read: 0, write: 0 },
            networkUsage: { upload: 0, download: 0 },
            timestamp: Date.now()
        };
    }

    /**
     * Get initial performance metrics
     */
    public async getInitialPerformanceMetrics(): Promise<IPerformanceMetrics> {
        return {
            executionTime: { total: 0, average: 0, max: 0, min: 0 },
            latency: { total: 0, average: 0, max: 0, min: 0 },
            throughput: {
                operationsPerSecond: 0,
                dataProcessedPerSecond: 0
            },
            responseTime: { total: 0, average: 0, max: 0, min: 0 },
            queueLength: 0,
            errorRate: 0,
            successRate: 0,
            errorMetrics: {
                totalErrors: 0,
                errorRate: 0
            },
            resourceUtilization: await this.getInitialResourceMetrics(),
            timestamp: Date.now()
        };
    }

    /**
     * Create metrics metadata
     */
    private createMetricsMetadata(
        domain: MetricDomain,
        type: MetricType,
        startTime: number
    ): IMetricsHandlerMetadata {
        const baseMetadata = createBaseMetadata(this.constructor.name, 'metrics');
        const endTime = Date.now();
        
        return {
            ...baseMetadata,
            domain,
            type,
            processingTime: {
                total: endTime - startTime,
                average: endTime - startTime,
                min: endTime - startTime,
                max: endTime - startTime
            }
        };
    }

    /**
     * Track a new metric event
     */
    public async trackMetric(event: IMetricEvent): Promise<IMetricsHandlerResult<void>> {
        const startTime = Date.now();
        try {
            const validation = this.validateMetricEvent(event);
            if (!validation.isValid) {
                throw createError({
                    message: `Invalid metric event: ${validation.errors.join(', ')}`,
                    type: 'ValidationError',
                    context: {
                        component: this.constructor.name,
                        operation: 'trackMetric',
                        event
                    }
                });
            }

            const key = this.getMetricKey(event.domain, event.type);
            if (!this.metrics.has(key)) {
                this.metrics.set(key, []);
            }
            this.metrics.get(key)?.push(event);

            this.logDebug('Tracked metric', this.constructor.name);

            return {
                success: true,
                data: undefined,
                metadata: this.createMetricsMetadata(event.domain, event.type, startTime)
            };
        } catch (error) {
            const kaibanError = createError({
                message: error instanceof Error ? error.message : String(error),
                type: 'SystemError',
                context: {
                    component: this.constructor.name,
                    operation: 'trackMetric',
                    event
                }
            });
            this.handleError(kaibanError, 'Failed to track metric');
            return {
                success: false,
                error: kaibanError,
                metadata: this.createMetricsMetadata(event.domain, event.type, startTime)
            };
        }
    }

    /**
     * Get metrics based on filter
     */
    public async getMetrics(filter: IMetricFilter): Promise<IMetricsHandlerResult<IMetricEvent[]>> {
        const startTime = Date.now();
        try {
            const results: IMetricEvent[] = [];
            
            for (const [key, metrics] of this.metrics.entries()) {
                const [domain, type] = this.parseMetricKey(key);
                
                if (filter.domain && domain !== filter.domain) continue;
                if (filter.type && type !== filter.type) continue;
                
                const filtered = metrics.filter(metric => {
                    if (filter.timeFrame) {
                        if (metric.timestamp < filter.timeFrame.start || metric.timestamp > filter.timeFrame.end) {
                            return false;
                        }
                    }
                    
                    if (filter.metadata) {
                        return Object.entries(filter.metadata).every(([key, value]) => 
                            metric.metadata[key] === value
                        );
                    }
                    return true;
                });
                
                results.push(...filtered);
            }

            this.logDebug('Retrieved metrics', this.constructor.name);

            return {
                success: true,
                data: results,
                metadata: this.createMetricsMetadata(
                    filter.domain ?? MetricDomain.WORKFLOW,
                    filter.type ?? MetricType.PERFORMANCE,
                    startTime
                )
            };
        } catch (error) {
            const kaibanError = createError({
                message: error instanceof Error ? error.message : String(error),
                type: 'SystemError',
                context: {
                    component: this.constructor.name,
                    operation: 'getMetrics',
                    filter
                }
            });
            this.handleError(kaibanError, 'Failed to get metrics');
            return {
                success: false,
                error: kaibanError,
                metadata: this.createMetricsMetadata(
                    filter.domain ?? MetricDomain.WORKFLOW,
                    filter.type ?? MetricType.PERFORMANCE,
                    startTime
                )
            };
        }
    }

    /**
     * Aggregate metrics based on query
     */
    public async aggregateMetrics(query: IAggregationQuery): Promise<IMetricsHandlerResult<IAggregatedMetric>> {
        const startTime = Date.now();
        try {
            const metricsResult = await this.getMetrics(query);
            const metrics = metricsResult.data || [];
            
            if (!metrics.length) {
                throw createError({
                    message: 'No metrics found for aggregation',
                    type: 'ValidationError',
                    context: {
                        component: this.constructor.name,
                        operation: 'aggregateMetrics',
                        query
                    }
                });
            }

            const numericMetrics = metrics.filter(m => typeof m.value === 'number');
            if (!numericMetrics.length) {
                throw createError({
                    message: 'No numeric metrics found for aggregation',
                    type: 'ValidationError',
                    context: {
                        component: this.constructor.name,
                        operation: 'aggregateMetrics',
                        query
                    }
                });
            }

            const values = numericMetrics.map(m => m.value as number);
            let aggregatedValue: number;

            switch (query.strategy) {
                case AggregationStrategy.SUM:
                    aggregatedValue = values.reduce((a, b) => a + b, 0);
                    break;
                case AggregationStrategy.AVERAGE:
                    aggregatedValue = values.reduce((a, b) => a + b, 0) / values.length;
                    break;
                case AggregationStrategy.MAX:
                    aggregatedValue = Math.max(...values);
                    break;
                case AggregationStrategy.MIN:
                    aggregatedValue = Math.min(...values);
                    break;
                case AggregationStrategy.LATEST:
                    aggregatedValue = values[values.length - 1];
                    break;
                default:
                    throw createError({
                        message: `Unsupported aggregation strategy: ${query.strategy}`,
                        type: 'ValidationError',
                        context: {
                            component: this.constructor.name,
                            operation: 'aggregateMetrics',
                            query
                        }
                    });
            }

            const result: IAggregatedMetric = {
                domain: query.domain!,
                type: query.type!,
                timeFrame: query.timeFrame!,
                count: values.length,
                value: aggregatedValue,
                strategy: query.strategy,
                metadata: {
                    groupBy: query.groupBy
                }
            };

            this.logDebug('Aggregated metrics', this.constructor.name);

            return {
                success: true,
                data: result,
                metadata: this.createMetricsMetadata(query.domain!, query.type!, startTime)
            };
        } catch (error) {
            const kaibanError = createError({
                message: error instanceof Error ? error.message : String(error),
                type: 'SystemError',
                context: {
                    component: this.constructor.name,
                    operation: 'aggregateMetrics',
                    query
                }
            });
            this.handleError(kaibanError, 'Failed to aggregate metrics');
            return {
                success: false,
                error: kaibanError,
                metadata: this.createMetricsMetadata(query.domain!, query.type!, startTime)
            };
        }
    }

    /**
     * Roll up metrics across time periods
     */
    public async rollupMetrics(query: IAggregationQuery): Promise<IMetricsHandlerResult<IRolledUpMetrics>> {
        const startTime = Date.now();
        try {
            const metricsResult = await this.getMetrics(query);
            const metrics = metricsResult.data || [];
            
            if (!metrics.length) {
                throw createError({
                    message: 'No metrics found for rollup',
                    type: 'ValidationError',
                    context: {
                        component: this.constructor.name,
                        operation: 'rollupMetrics',
                        query
                    }
                });
            }

            const periodSize = this.calculatePeriodSize(query.timeFrame!.start, query.timeFrame!.end);
            const periods = new Map<number, number[]>();

            for (const metric of metrics) {
                const periodStart = Math.floor(metric.timestamp / periodSize) * periodSize;
                if (!periods.has(periodStart)) {
                    periods.set(periodStart, []);
                }
                if (typeof metric.value === 'number') {
                    periods.get(periodStart)!.push(metric.value);
                }
            }

            const rolledUp: IRolledUpMetrics = {
                domain: query.domain!,
                type: query.type!,
                periods: Array.from(periods.entries()).map(([periodStart, values]) => ({
                    timeFrame: {
                        start: periodStart,
                        end: periodStart + periodSize
                    },
                    value: this.calculateAggregatedValue(values, query.strategy)
                })),
                metadata: {
                    periodSize,
                    totalPeriods: periods.size
                }
            };

            this.logDebug('Rolled up metrics', this.constructor.name);

            return {
                success: true,
                data: rolledUp,
                metadata: this.createMetricsMetadata(query.domain!, query.type!, startTime)
            };
        } catch (error) {
            const kaibanError = createError({
                message: error instanceof Error ? error.message : String(error),
                type: 'SystemError',
                context: {
                    component: this.constructor.name,
                    operation: 'rollupMetrics',
                    query
                }
            });
            this.handleError(kaibanError, 'Failed to roll up metrics');
            return {
                success: false,
                error: kaibanError,
                metadata: this.createMetricsMetadata(query.domain!, query.type!, startTime)
            };
        }
    }

    /**
     * Clean up old metrics
     */
    private async cleanup(): Promise<void> {
        const cutoff = Date.now() - this.RETENTION_PERIOD;
        
        for (const [key, metrics] of this.metrics.entries()) {
            const filtered = metrics.filter(m => m.timestamp >= cutoff);
            if (filtered.length !== metrics.length) {
                this.metrics.set(key, filtered);
                this.logDebug('Cleaned up metrics', this.constructor.name);
            }
        }
    }

    private setupCleanupInterval(): void {
        setInterval(() => {
            this.cleanup().catch(error => {
                this.logError('Failed to clean up metrics', this.constructor.name);
            });
        }, this.CLEANUP_INTERVAL);
    }

    private getMetricKey(domain: MetricDomain, type: MetricType): string {
        return `${domain}_${type}`;
    }

    private parseMetricKey(key: string): [MetricDomain, MetricType] {
        const [domain, type] = key.split('_') as [MetricDomain, MetricType];
        return [domain, type];
    }

    private calculatePeriodSize(start: number, end: number): number {
        const duration = end - start;
        const targetPeriods = 24; // Aim for 24 periods
        return Math.ceil(duration / targetPeriods);
    }

    private calculateAggregatedValue(values: number[], strategy: AggregationStrategy): number {
        switch (strategy) {
            case AggregationStrategy.SUM:
                return values.reduce((a, b) => a + b, 0);
            case AggregationStrategy.AVERAGE:
                return values.reduce((a, b) => a + b, 0) / values.length;
            case AggregationStrategy.MAX:
                return Math.max(...values);
            case AggregationStrategy.MIN:
                return Math.min(...values);
            case AggregationStrategy.LATEST:
                return values[values.length - 1];
            default:
                throw createError({
                    message: `Unsupported aggregation strategy: ${strategy}`,
                    type: 'ValidationError',
                    context: {
                        component: this.constructor.name,
                        operation: 'calculateAggregatedValue',
                        strategy
                    }
                });
        }
    }

    private validateMetricEvent(event: IMetricEvent): IValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!Object.values(MetricDomain).includes(event.domain)) {
            errors.push(`Invalid metric domain: ${event.domain}`);
        }

        if (!Object.values(MetricType).includes(event.type)) {
            errors.push(`Invalid metric type: ${event.type}`);
        }

        if (typeof event.value !== 'number' && typeof event.value !== 'string') {
            errors.push('Metric value must be number or string');
        }

        if (typeof event.timestamp !== 'number') {
            errors.push('Timestamp must be a number');
        }

        if (event.timestamp > Date.now()) {
            warnings.push('Timestamp is in the future');
        }

        if (typeof event.metadata !== 'object' || event.metadata === null) {
            errors.push('Metadata must be an object');
        }

        return createValidationResult(errors.length === 0, errors, warnings);
    }
}

export default MetricsManager.getInstance();
