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
        case AggregationStrategy.AVERAGE:
            return values.reduce((sum, val) => sum + val, 0) / values.length;
        case AggregationStrategy.MAX:
            return Math.max(...values);
        case AggregationStrategy.MIN:
            return Math.min(...values);
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
    filteredMetrics = filterMetricsByDomain(filteredMetrics, query.domain);
    filteredMetrics = filterMetricsByType(filteredMetrics, query.type);

    // Extract numeric values
    const values = filteredMetrics
        .map(metric => typeof metric.value === 'number' ? metric.value : 0);

    // Aggregate values
    const aggregatedValue = aggregateValues(values, query.strategy);

    // Combine metadata
    const combinedMetadata = filteredMetrics.reduce((acc, metric) => ({
        ...acc,
        ...metric.metadata
    }), {});

    return {
        domain: query.domain || MetricDomain.AGENT,
        type: query.type || MetricType.PERFORMANCE,
        timeFrame: query.timeFrame || {
            start: Math.min(...filteredMetrics.map(m => m.timestamp)),
            end: Math.max(...filteredMetrics.map(m => m.timestamp))
        },
        count: filteredMetrics.length,
        value: aggregatedValue,
        strategy: query.strategy,
        metadata: combinedMetadata
    };
};

const rollupMetrics = (
    metrics: IMetricEvent[],
    query: IAggregationQuery
): IRolledUpMetrics => {
    if (!query.timeFrame) {
        throw new Error('TimeFrame is required for rollup');
    }

    // Create time frames for rollup (1-hour intervals by default)
    const interval = 60 * 60 * 1000; // 1 hour in milliseconds
    const timeFrames = createTimeFrames(
        query.timeFrame.start,
        query.timeFrame.end,
        interval
    );

    // Aggregate metrics for each time frame
    const periods = timeFrames.map(frame => {
        const frameQuery = { ...query, timeFrame: frame };
        const aggregated = aggregateMetrics(metrics, frameQuery);
        return {
            timeFrame: frame,
            value: aggregated.value
        };
    });

    return {
        domain: query.domain || MetricDomain.AGENT,
        type: query.type || MetricType.PERFORMANCE,
        periods,
        metadata: metrics.reduce((acc, metric) => ({
            ...acc,
            ...metric.metadata
        }), {})
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
