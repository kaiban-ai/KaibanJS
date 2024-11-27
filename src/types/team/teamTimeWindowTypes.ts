/**
 * @file teamTimeWindowTypes.ts
 * @path src/types/team/teamTimeWindowTypes.ts
 * @description Team time window type definitions
 *
 * @module @team
 */

// ─── Time Window Types ──────────────────────────────────────────────────────────

export interface ITimeWindow {
  readonly retention: number;
  readonly resolution: number;
  readonly maxDataPoints: number;
}

export interface ITimeWindowConfig {
  readonly realtime: ITimeWindow;
  readonly hourly: ITimeWindow;
  readonly daily: ITimeWindow;
  readonly weekly: ITimeWindow;
  readonly monthly: ITimeWindow;
}

export interface IHistoricalMetrics<T> {
  readonly current: T;
  readonly history: Array<T & { timestamp: number }>;
  readonly aggregates: {
    readonly daily: T;
    readonly weekly: T;
    readonly monthly: T;
  };
}
