/**
 * @file metricsManagerTypes.ts
 * @path src/types/metrics/base/metricsManagerTypes.ts
 * @description Core interfaces for the centralized metrics management system
 *
 * @module @types/metrics/base
 */

import type { ITimeMetrics } from './performanceMetrics';
import type { IHandlerResult } from '../../common/baseTypes';
import type { IBaseHandlerMetadata } from '../../common/baseTypes';
import type { IResourceMetrics } from './resourceMetrics';
import type { IPerformanceMetrics } from './performanceMetrics';

// ─── Metric Enums ────────────────────────────────────────────────────────────

export enum MetricDomain {
    AGENT = 'agent',
    TASK = 'task',
    WORKFLOW = 'workflow',
    TEAM = 'team',
    LLM = 'llm',
    TOOL = 'tool'
}

export enum MetricType {
    RESOURCE = 'resource',
    PERFORMANCE = 'performance',
    USAGE = 'usage',
    COST = 'cost',
    SYSTEM_HEALTH = 'system_health'
}

export enum AggregationStrategy {
    SUM = 'sum',
    AVERAGE = 'average',
    MAX = 'max',
    MIN = 'min',
    LATEST = 'latest'
}

// ─── Base Types ─────────────────────────────────────────────────────────────

export interface IMetricEvent {
    readonly timestamp: number;
    readonly domain: MetricDomain;
    readonly type: MetricType;
    readonly value: number | string;
    readonly metadata: Record<string, unknown>;
}

export interface ITimeFrame {
    readonly start: number;
    readonly end: number;
}

// ─── Utility Types ────────────────────────────────────────────────────────────

export type MutableMetrics<T> = {
    -readonly [K in keyof T]: T[K] extends ReadonlyArray<infer U>
        ? U[]
        : T[K] extends Record<string, unknown>
        ? { -readonly [P in keyof T[K]]: MutableMetrics<T[K][P]> }
        : T[K];
};

// ─── Aggregation Types ────────────────────────────────────────────────────────

export interface IAggregatedMetric {
    readonly domain: MetricDomain;
    readonly type: MetricType;
    readonly timeFrame: ITimeFrame;
    readonly count: number;
    readonly value: number;
    readonly strategy: AggregationStrategy;
    readonly metadata: Record<string, unknown>;
}

export interface IMetricFilter {
    readonly domain?: MetricDomain;
    readonly type?: MetricType;
    readonly timeFrame?: ITimeFrame;
    readonly metadata?: Record<string, unknown>;
}

export interface IAggregationQuery extends IMetricFilter {
    readonly strategy: AggregationStrategy;
    readonly groupBy?: string[];
}

export interface IRolledUpMetrics {
    readonly domain: MetricDomain;
    readonly type: MetricType;
    readonly periods: {
        readonly timeFrame: ITimeFrame;
        readonly value: number;
    }[];
    readonly metadata: Record<string, unknown>;
}

// ─── Handler Types ───────────────────────────────────────────────────────────

export interface IMetricsHandlerMetadata extends IBaseHandlerMetadata {
    readonly domain: MetricDomain;
    readonly type: MetricType;
    readonly timeFrame?: ITimeFrame;
    readonly processingTime: ITimeMetrics;
}

export type IMetricsHandlerResult<T = unknown> = IHandlerResult<T, IMetricsHandlerMetadata>;

// ─── Manager Interfaces ───────────────────────────────────────────────────────

export interface IMetricsManager {
    trackMetric(event: IMetricEvent): Promise<IMetricsHandlerResult<void>>;
    getMetrics(filter: IMetricFilter): Promise<IMetricsHandlerResult<IMetricEvent[]>>;
    aggregateMetrics(query: IAggregationQuery): Promise<IMetricsHandlerResult<IAggregatedMetric>>;
    rollupMetrics(query: IAggregationQuery): Promise<IMetricsHandlerResult<IRolledUpMetrics>>;
    getInitialResourceMetrics(): Promise<IResourceMetrics>;
    getInitialPerformanceMetrics(): Promise<IPerformanceMetrics>;
}

export interface IMetricStorage {
    store(event: IMetricEvent): Promise<void>;
    query(filter: IMetricFilter): Promise<IMetricEvent[]>;
    aggregate(query: IAggregationQuery): Promise<IAggregatedMetric>;
    cleanup(before: number): Promise<void>;
}

export interface IMetricAggregator {
    aggregate(metrics: IMetricEvent[], strategy: AggregationStrategy): IAggregatedMetric;
    rollup(metrics: IMetricEvent[], query: IAggregationQuery): IRolledUpMetrics;
}
