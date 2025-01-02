/**
 * @file aggregationUtils.ts
 * @path src/managers/core/metrics/utils/aggregationUtils.ts
 * @description Utility functions for metrics aggregation and rollup
 *
 * @module @managers/core/metrics/utils
 */

import { 
    AggregationStrategy,
    MetricDomain,
    MetricType,
    IMetricEvent,
    IAggregatedMetric,
    IAggregationQuery,
    IRolledUpMetrics,
    ITimeFrame
} from '../../../../types/metrics/base/metricsManagerTypes';

// ─── Time Frame Utils ────────────────────────────────────────────────────────

const createTimeFrames = (
    start: number,
    end: number,
    interval: number
): ITimeFrame[] => {
    const frames: ITimeFrame[] = [];
    let frameStart = start;

    while (frameStart < end) {
        const frameEnd = Math.min(frameStart + interval, end);
        frames.push({ start: frameStart, end: frameEnd });
        frameStart = frameEnd;
    }

    return frames;
};

const isInTimeFrame = (timestamp: number, timeFrame: ITimeFrame): boolean =>
    timestamp >= timeFrame.start && timestamp <= timeFrame.end;

// ─── Aggregation Utils ────────────────────────────────────────────────────────

const aggregateValues = (
    values: number[],
    strategy: AggregationStrategy
): number => {
    if (values.length === 0) return 0;

    switch (strategy) {
        case AggregationStrategy.SUM:
            return values.reduce((sum, val) => sum + val, 0);
        case AggregationStrategy.AVG:
            return values.reduce((sum, val) => sum + val, 0) / values.length;
        case AggregationStrategy.MAX:
            return Math.max(...values);
        case AggregationStrategy.MIN:
            return Math.min(...values);
        case AggregationStrategy.COUNT:
            return values.length;
        case AggregationStrategy.LATEST:
            return values[values.length - 1];
        default:
            return 0;
    }
};

const filterMetricsByTimeFrame = (
    metrics: IMetricEvent[],
    timeFrame?: ITimeFrame
): IMetricEvent[] => {
    if (!timeFrame) return metrics;
    return metrics.filter(metric => isInTimeFrame(metric.timestamp, timeFrame));
};

const filterMetricsByDomain = (
    metrics: IMetricEvent[],
    domain?: MetricDomain
): IMetricEvent[] => {
    if (!domain) return metrics;
    return metrics.filter(metric => metric.domain === domain);
};

const filterMetricsByType = (
    metrics: IMetricEvent[],
    type?: MetricType
): IMetricEvent[] => {
    if (!type) return metrics;
    return metrics.filter(metric => metric.type === type);
};

const groupMetricsByKey = (
    metrics: IMetricEvent[],
    key: string
): Map<string, IMetricEvent[]> => {
    const groups = new Map<string, IMetricEvent[]>();

    metrics.forEach(metric => {
        const value = metric.metadata[key]?.toString() || 'unknown';
        const group = groups.get(value) || [];
        group.push(metric);
        groups.set(value, group);
    });

    return groups;
};

// ─── Aggregation Functions ────────────────────────────────────────────────────

const aggregateMetrics = (
    metrics: IMetricEvent[],
    query: IAggregationQuery
): IAggregatedMetric => {
    let filteredMetrics = metrics;

    // Apply filters
    filteredMetrics = filterMetricsByTimeFrame(filteredMetrics, query.timeFrame);
    const domain = query.filters?.domain as MetricDomain | undefined;
    const type = query.filters?.type as MetricType | undefined;
    filteredMetrics = filterMetricsByDomain(filteredMetrics, domain);
    filteredMetrics = filterMetricsByType(filteredMetrics, type);

    // Extract numeric values
    const values = filteredMetrics
        .map(metric => typeof metric.value === 'number' ? metric.value : 0);

    // Aggregate values
    const aggregatedValue = aggregateValues(values, query.strategy || AggregationStrategy.AVG);

    return {
        timestamp: Date.now(),
        value: aggregatedValue,
        strategy: query.strategy || AggregationStrategy.AVG,
        metadata: {
            timeRange: query.timeRange,
            domain: domain || MetricDomain.SYSTEM,
            type: type || MetricType.PERFORMANCE,
            count: filteredMetrics.length
        }
    };
};

const rollupMetrics = (
    metrics: IMetricEvent[],
    query: IAggregationQuery
): IRolledUpMetrics => {
    if (!query.timeFrame) {
        throw new Error('TimeFrame is required for rollup');
    }

    let filteredMetrics = metrics;

    // Apply filters
    filteredMetrics = filterMetricsByTimeFrame(filteredMetrics, query.timeFrame);
    const domain = query.filters?.domain as MetricDomain | undefined;
    const type = query.filters?.type as MetricType | undefined;
    filteredMetrics = filterMetricsByDomain(filteredMetrics, domain);
    filteredMetrics = filterMetricsByType(filteredMetrics, type);

    // Extract numeric values
    const values = filteredMetrics
        .map(metric => typeof metric.value === 'number' ? metric.value : 0);

    return {
        timestamp: Date.now(),
        value: aggregateValues(values, query.strategy || AggregationStrategy.AVG),
        count: filteredMetrics.length,
        min: Math.min(...values),
        max: Math.max(...values),
        avg: values.reduce((sum, v) => sum + v, 0) / values.length,
        metadata: {
            timeRange: query.timeRange,
            domain: domain || MetricDomain.SYSTEM,
            type: type || MetricType.PERFORMANCE,
            strategy: query.strategy || AggregationStrategy.AVG
        }
    };
};

// ─── Exports ────────────────────────────────────────────────────────────────

export const AggregationUtils = {
    createTimeFrames,
    isInTimeFrame,
    aggregateValues,
    filterMetricsByTimeFrame,
    filterMetricsByDomain,
    filterMetricsByType,
    groupMetricsByKey,
    aggregateMetrics,
    rollupMetrics
};
