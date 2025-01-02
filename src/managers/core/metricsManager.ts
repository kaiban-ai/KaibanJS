/**
 * @file metricsManager.ts
 * @description Centralized metrics management with optimized collection and aggregation
 */

import { CircularBuffer } from './metrics/CircularBuffer';
import { MetricAggregator } from './metrics/MetricAggregator';
import { MemoryManager } from './metrics/MemoryManager';
import { PreAggregator } from './metrics/PreAggregator';
import { MetricsBenchmark } from './metrics/MetricsBenchmark';
import { CoreManager } from './coreManager';
import { 
    IMetricEvent,
    IMetricFilter,
    IAggregationQuery,
    IMetricsHandlerResult,
    IMetricsHandlerMetadata,
    IAgentMetrics,
    IRolledUpMetrics,
    AggregationStrategy,
    MetricDomain,
    MetricType
} from '../../types/metrics/base/metricsManagerTypes';
import { MANAGER_CATEGORY_enum, AGENT_STATUS_enum } from '../../types/common/enumTypes';
import { createError, ERROR_KINDS } from '../../types/common/errorTypes';
import { createBaseMetadata, IBaseHandlerMetadata } from '../../types/common/baseTypes';
import { IBaseManager, IBaseManagerMetadata } from '../../types/agent/agentManagerTypes';

export class MetricsManager extends CoreManager implements IBaseManager<IMetricEvent> {
    private static instance: MetricsManager;
    protected readonly buffer: CircularBuffer<IMetricEvent>;
    protected readonly aggregator: MetricAggregator;
    protected readonly memoryManager: MemoryManager;
    protected readonly preAggregator: PreAggregator;
    protected readonly benchmark: MetricsBenchmark;

    public readonly category = MANAGER_CATEGORY_enum.METRICS as const;

    public getMetadata(): IBaseManagerMetadata {
        return {
            component: 'MetricsManager',
            category: MANAGER_CATEGORY_enum.METRICS,
            operation: 'getMetadata',
            timestamp: Date.now(),
            status: 'success',
            duration: 0,
            source: 'MetricsManager',
            target: 'metrics',
            correlationId: '',
            causationId: '',
            context: {
                bufferSize: this.buffer.getSize(),
                memoryUsage: this.memoryManager.getUsage()
            },
            agent: {
                id: '',
                name: '',
                role: '',
                status: AGENT_STATUS_enum.IDLE,
                metrics: {
                    iterations: 0,
                    executionTime: 0,
                    llmMetrics: ''
                }
            }
        };
    }

    private createPerformanceMetrics(aggregates: Map<string, number>): Record<string, number> {
        return {
            averageResponseTime: aggregates.get('responseTime') || 0,
            throughput: aggregates.get('throughput') || 0,
            errorRate: aggregates.get('errorRate') || 0
        };
    }

    private createUsageMetrics(aggregates: Map<string, number>): Record<string, number> {
        return {
            cpuUsage: aggregates.get('cpuUsage') || 0,
            memoryUsage: aggregates.get('memoryUsage') || 0,
            diskUsage: aggregates.get('diskUsage') || 0
        };
    }

    private constructor() {
        super();
        this.buffer = new CircularBuffer<IMetricEvent>(1000);
        this.aggregator = new MetricAggregator();
        this.memoryManager = new MemoryManager();
        this.preAggregator = new PreAggregator();
        this.benchmark = new MetricsBenchmark();
        this.registerDomainManager('MetricsManager', this);
    }

    public static getInstance(): MetricsManager {
        if (!MetricsManager.instance) {
            MetricsManager.instance = new MetricsManager();
        }
        return MetricsManager.instance;
    }

    /**
     * Track a new metric event
     */
    public async trackMetric(event: IMetricEvent): Promise<void> {
        try {
            // Check memory limits
            if (!this.memoryManager.shouldCollectMetric()) {
                await this.memoryManager.enforceMemoryLimits();
            return;
            }

            this.benchmark.start('trackMetric');

            // Store and pre-aggregate metric
            this.buffer.push(event);
            this.preAggregator.addMetric(event);
            this.aggregator.add(event);

            this.benchmark.end('trackMetric');

            return;
        } catch (error) {
            throw createError({
                message: 'Failed to track metric',
                type: ERROR_KINDS.ExecutionError,
                context: { event, error }
            });
        }
    }

    /**
     * Get metrics based on filter
     */
    public async get(filter: IMetricFilter): Promise<IMetricsHandlerResult<IAgentMetrics>> {
        try {
            this.benchmark.start('getMetrics');

            // Get aggregated metrics
            const aggregates = this.aggregator.getAggregates();
            const metrics = this.transformToAgentMetrics(aggregates);

            this.benchmark.end('getMetrics');

            return {
                success: true,
                data: metrics,
                metadata: this.createMetadata('getMetrics')
            };
        } catch (error) {
            throw createError({
                message: 'Failed to get metrics',
                type: ERROR_KINDS.ExecutionError,
                context: { filter, error }
            });
        }
    }

    /**
     * Aggregate metrics based on query
     */
    public async aggregate(query: IAggregationQuery): Promise<IRolledUpMetrics[]> {
        try {
            this.benchmark.start('aggregate');

            const metrics = await this.preAggregator.getAggregates(query);
            const results = this.transformToRolledUpMetrics(metrics, query.strategy);

            this.benchmark.end('aggregate');

            return results;
        } catch (error) {
            throw createError({
                message: 'Failed to aggregate metrics',
                type: ERROR_KINDS.ExecutionError,
                context: { query, error }
            });
        }
    }

    /**
     * Create metadata for metric operations
     */
    private createMetadata(operation: string): IMetricsHandlerMetadata {
        const base = createBaseMetadata('MetricsManager', operation);
        return {
            ...base,
            timestamp: Date.now(),
            source: 'MetricsManager',
            target: 'metrics',
            correlationId: '',
            causationId: '',
            context: {
                bufferSize: this.buffer.getSize(),
                memoryUsage: this.memoryManager.getCurrentUsage()
            },
            performance: this.benchmark.getMetrics(operation)
        };
    }

    /**
     * Transform aggregated metrics to agent metrics format
     */
    private transformToAgentMetrics(aggregates: Map<string, number>): IAgentMetrics {
        return {
            performance: this.createPerformanceMetrics(aggregates),
            usage: this.createUsageMetrics(aggregates),
            error: {
                count: 0,
                type: 'UnknownError',
                severity: 'INFO',
                message: '',
                timestamp: Date.now()
            },
            timestamp: Date.now(),
            resources: {
                cpuUsage: 0,
                memoryUsage: 0,
                diskIO: 0,
                networkUsage: 0
            },
            state: {
                currentState: 'active',
                stateTime: Date.now(),
                taskStats: {
                    total: 0,
                    completed: 0,
                    failed: 0,
                    pending: 0
                }
            }
        };
    }

    /**
     * Transform metrics to rolled up format
     */
    private transformToRolledUpMetrics(
        metrics: Map<string, number[]>,
        strategy: AggregationStrategy = AggregationStrategy.AVG
    ): IRolledUpMetrics[] {
        return Array.from(metrics.entries()).map(([key, values]) => ({
            timestamp: Date.now(),
            value: this.calculateAggregate(values, strategy),
            count: values.length,
            min: Math.min(...values),
            max: Math.max(...values),
            avg: values.reduce((sum, v) => sum + v, 0) / values.length,
            metadata: { key }
        }));
    }

    private calculateAggregate(values: number[], strategy: AggregationStrategy): number {
        switch (strategy) {
            case AggregationStrategy.SUM: return values.reduce((sum, v) => sum + v, 0);
            case AggregationStrategy.AVG: return values.reduce((sum, v) => sum + v, 0) / values.length;
            case AggregationStrategy.MIN: return Math.min(...values);
            case AggregationStrategy.MAX: return Math.max(...values);
            case AggregationStrategy.COUNT: return values.length;
            case AggregationStrategy.LATEST: return values[values.length - 1] || 0;
            default: return 0;
        }
    }
}

export default MetricsManager.getInstance();
