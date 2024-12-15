/**
 * @file aggregationManager.ts
 * @path src/managers/core/metrics/aggregationManager.ts
 * @description Specialized manager for metrics aggregation and rollup
 *
 * @module @managers/core/metrics
 */

import { CoreManager } from '../coreManager';
import { MANAGER_CATEGORY_enum } from '../../../types/common/enumTypes';
import { 
    MetricDomain, 
    MetricType,
    AggregationStrategy,
    IMetricsHandlerMetadata,
    IMetricEvent,
    IMetricsHandlerResult,
    IAggregatedMetric,
    IAggregationQuery,
    IRolledUpMetrics,
    IMetricFilter,
    IMetricAggregator
} from '../../../types/metrics/base/metricsManagerTypes';
import { validateMetricEvent } from './utils/metricValidation';
import { AggregationUtils } from './utils/aggregationUtils';
import { createBaseMetadata, createErrorResult, createSuccessResult } from '../../../types/common/baseTypes';
import { ERROR_KINDS, createError } from '../../../types/common/errorTypes';

// ─── Aggregation Manager ────────────────────────────────────────────────────

export class AggregationManager extends CoreManager implements IMetricAggregator {
    private static instance: AggregationManager | null = null;
    private metricStore: Map<string, IMetricEvent[]>;

    public readonly category = MANAGER_CATEGORY_enum.METRICS;

    private constructor() {
        super();
        this.metricStore = new Map();
        this.registerDomainManager('AggregationManager', this);
    }

    public static getInstance(): AggregationManager {
        if (!AggregationManager.instance) {
            AggregationManager.instance = new AggregationManager();
        }
        return AggregationManager.instance;
    }

    private createMetricsMetadata(baseMetadata: ReturnType<typeof createBaseMetadata>): IMetricsHandlerMetadata {
        return {
            ...baseMetadata,
            domain: MetricDomain.AGENT,
            type: MetricType.PERFORMANCE,
            processingTime: {
                total: 0,
                average: 0,
                min: 0,
                max: 0
            }
        };
    }

    private getStoreKey(domain: MetricDomain, type: MetricType): string {
        return `${domain}:${type}`;
    }

    private getMetricsByKey(key: string): IMetricEvent[] {
        return this.metricStore.get(key) || [];
    }

    public async storeMetric(event: IMetricEvent): Promise<IMetricsHandlerResult<void>> {
        const baseMetadata = createBaseMetadata('AggregationManager', 'storeMetric');
        const metadata = this.createMetricsMetadata(baseMetadata);
        const validationResult = validateMetricEvent(event);

        if (!validationResult.isValid) {
            return createErrorResult(
                createError({
                    message: validationResult.errors.join(', '),
                    type: ERROR_KINDS.ValidationError
                }),
                { ...metadata, validation: validationResult }
            );
        }

        try {
            const key = this.getStoreKey(event.domain, event.type);
            const metrics = this.getMetricsByKey(key);
            metrics.push(event);
            this.metricStore.set(key, metrics);

            return createSuccessResult(undefined, { ...metadata, validation: validationResult });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            return createErrorResult(
                createError({
                    message: `Failed to store metric: ${errorMessage}`,
                    type: ERROR_KINDS.ExecutionError
                }),
                metadata
            );
        }
    }

    public async queryMetrics(filter: IMetricFilter): Promise<IMetricsHandlerResult<IMetricEvent[]>> {
        const baseMetadata = createBaseMetadata('AggregationManager', 'queryMetrics');
        const metadata = this.createMetricsMetadata(baseMetadata);

        try {
            let metrics: IMetricEvent[] = [];

            if (filter.domain && filter.type) {
                const key = this.getStoreKey(filter.domain, filter.type);
                metrics = this.getMetricsByKey(key);
            } else {
                // Collect metrics from all stores that match the filter
                for (const [key, events] of this.metricStore.entries()) {
                    metrics.push(...events);
                }
            }

            // Apply filters
            metrics = AggregationUtils.filterMetricsByTimeFrame(metrics, filter.timeFrame);
            metrics = AggregationUtils.filterMetricsByDomain(metrics, filter.domain);
            metrics = AggregationUtils.filterMetricsByType(metrics, filter.type);

            return createSuccessResult(metrics, metadata);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            return createErrorResult(
                createError({
                    message: `Failed to query metrics: ${errorMessage}`,
                    type: ERROR_KINDS.ExecutionError
                }),
                metadata
            );
        }
    }

    public aggregate(metrics: IMetricEvent[], strategy: AggregationStrategy): IAggregatedMetric {
        return AggregationUtils.aggregateMetrics(metrics, { strategy });
    }

    public rollup(metrics: IMetricEvent[], query: IAggregationQuery): IRolledUpMetrics {
        return AggregationUtils.rollupMetrics(metrics, query);
    }

    public async aggregateMetrics(query: IAggregationQuery): Promise<IMetricsHandlerResult<IAggregatedMetric>> {
        const baseMetadata = createBaseMetadata('AggregationManager', 'aggregateMetrics');
        const metadata = this.createMetricsMetadata(baseMetadata);

        try {
            const metricsResult = await this.queryMetrics(query);
            if (!metricsResult.success) {
                return createErrorResult(
                    createError({
                        message: 'Failed to query metrics for aggregation',
                        type: ERROR_KINDS.ExecutionError
                    }),
                    metadata
                );
            }

            const aggregated = AggregationUtils.aggregateMetrics(metricsResult.data || [], query);
            return createSuccessResult(aggregated, metadata);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            return createErrorResult(
                createError({
                    message: `Failed to aggregate metrics: ${errorMessage}`,
                    type: ERROR_KINDS.ExecutionError
                }),
                metadata
            );
        }
    }

    public async rollupMetrics(query: IAggregationQuery): Promise<IMetricsHandlerResult<IRolledUpMetrics>> {
        const baseMetadata = createBaseMetadata('AggregationManager', 'rollupMetrics');
        const metadata = this.createMetricsMetadata(baseMetadata);

        if (!query.timeFrame) {
            return createErrorResult(
                createError({
                    message: 'TimeFrame is required for rollup',
                    type: ERROR_KINDS.ValidationError
                }),
                metadata
            );
        }

        try {
            const metricsResult = await this.queryMetrics(query);
            if (!metricsResult.success) {
                return createErrorResult(
                    createError({
                        message: 'Failed to query metrics for rollup',
                        type: ERROR_KINDS.ExecutionError
                    }),
                    metadata
                );
            }

            const rolledUp = AggregationUtils.rollupMetrics(metricsResult.data || [], query);
            return createSuccessResult(rolledUp, metadata);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            return createErrorResult(
                createError({
                    message: `Failed to rollup metrics: ${errorMessage}`,
                    type: ERROR_KINDS.ExecutionError
                }),
                metadata
            );
        }
    }

    public async cleanup(before: number): Promise<IMetricsHandlerResult<void>> {
        const baseMetadata = createBaseMetadata('AggregationManager', 'cleanup');
        const metadata = this.createMetricsMetadata(baseMetadata);

        try {
            for (const [key, metrics] of this.metricStore.entries()) {
                const filtered = metrics.filter(metric => metric.timestamp >= before);
                this.metricStore.set(key, filtered);
            }

            return createSuccessResult(undefined, metadata);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            return createErrorResult(
                createError({
                    message: `Failed to cleanup metrics: ${errorMessage}`,
                    type: ERROR_KINDS.ExecutionError
                }),
                metadata
            );
        }
    }
}

export default AggregationManager.getInstance();
