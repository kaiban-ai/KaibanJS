/**
 * @file metricsManagerTypes.ts
 * @path KaibanJS/src/types/metrics/base/metricsManagerTypes.ts
 * @description Core interfaces for the centralized metrics management system
 */

import type { ITimeMetrics } from './performanceMetrics';
import type { IHandlerResult } from '../../common/commonHandlerTypes';
import type { IBaseHandlerMetadata } from '../../common/commonMetadataTypes';

/**
 * Supported metric domains
 */
export enum MetricDomain {
    AGENT = 'agent',
    TASK = 'task',
    WORKFLOW = 'workflow',
    TEAM = 'team',
    LLM = 'llm',
    TOOL = 'tool'
}

/**
 * Supported metric types
 */
export enum MetricType {
    RESOURCE = 'resource',
    PERFORMANCE = 'performance',
    USAGE = 'usage',
    COST = 'cost'
}

/**
 * Base metric event interface
 */
export interface IMetricEvent {
    readonly timestamp: number;
    readonly domain: MetricDomain;
    readonly type: MetricType;
    readonly value: number | string;
    readonly metadata: Record<string, any>;
}

/**
 * Metric aggregation strategy
 */
export enum AggregationStrategy {
    SUM = 'sum',
    AVERAGE = 'average',
    MAX = 'max',
    MIN = 'min',
    LATEST = 'latest'
}

/**
 * Time frame for metric queries and aggregation
 */
export interface ITimeFrame {
    readonly start: number;
    readonly end: number;
}

/**
 * Aggregated metric result
 */
export interface IAggregatedMetric {
    readonly domain: MetricDomain;
    readonly type: MetricType;
    readonly timeFrame: ITimeFrame;
    readonly count: number;
    readonly value: number;
    readonly strategy: AggregationStrategy;
    readonly metadata: Record<string, any>;
}

/**
 * Metric query filter
 */
export interface IMetricFilter {
    readonly domain?: MetricDomain;
    readonly type?: MetricType;
    readonly timeFrame?: ITimeFrame;
    readonly metadata?: Record<string, any>;
}

/**
 * Metric query for aggregation
 */
export interface IAggregationQuery extends IMetricFilter {
    readonly strategy: AggregationStrategy;
    readonly groupBy?: string[];
}

/**
 * Rolled up metrics across time periods
 */
export interface IRolledUpMetrics {
    readonly domain: MetricDomain;
    readonly type: MetricType;
    readonly periods: {
        readonly timeFrame: ITimeFrame;
        readonly value: number;
    }[];
    readonly metadata: Record<string, any>;
}

/**
 * Metrics manager handler metadata
 */
export interface IMetricsHandlerMetadata extends IBaseHandlerMetadata {
    readonly domain: MetricDomain;
    readonly type: MetricType;
    readonly timeFrame?: ITimeFrame;
    readonly processingTime: ITimeMetrics;
}

/**
 * Metrics manager handler result
 */
export type IMetricsHandlerResult<T = unknown> = IHandlerResult<T, IMetricsHandlerMetadata>;

/**
 * Core metrics manager interface
 */
export interface IMetricsManager {
    /**
     * Track a new metric
     */
    trackMetric(event: IMetricEvent): Promise<IMetricsHandlerResult<void>>;

    /**
     * Get metrics based on filter
     */
    getMetrics(filter: IMetricFilter): Promise<IMetricsHandlerResult<IMetricEvent[]>>;

    /**
     * Aggregate metrics based on query
     */
    aggregateMetrics(query: IAggregationQuery): Promise<IMetricsHandlerResult<IAggregatedMetric>>;

    /**
     * Roll up metrics across time periods
     */
    rollupMetrics(query: IAggregationQuery): Promise<IMetricsHandlerResult<IRolledUpMetrics>>;
}

/**
 * Metrics storage interface
 */
export interface IMetricStorage {
    /**
     * Store a metric event
     */
    store(event: IMetricEvent): Promise<void>;

    /**
     * Query metrics based on filter
     */
    query(filter: IMetricFilter): Promise<IMetricEvent[]>;

    /**
     * Aggregate metrics based on query
     */
    aggregate(query: IAggregationQuery): Promise<IAggregatedMetric>;

    /**
     * Clean up old metrics
     */
    cleanup(before: number): Promise<void>;
}

/**
 * Metrics aggregator interface
 */
export interface IMetricAggregator {
    /**
     * Aggregate metrics using specified strategy
     */
    aggregate(metrics: IMetricEvent[], strategy: AggregationStrategy): IAggregatedMetric;

    /**
     * Roll up metrics across time periods
     */
    rollup(metrics: IMetricEvent[], query: IAggregationQuery): IRolledUpMetrics;
}
