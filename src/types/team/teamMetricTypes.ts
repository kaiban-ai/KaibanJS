/**
 * @file teamMetricTypes.ts
 * @path src/types/team/teamMetricTypes.ts
 * @description Team metrics type definitions
 *
 * @module @team
 */

import { IBaseMetrics } from '../metrics/base/baseMetrics';
import { IResourceMetrics } from '../metrics/base/resourceMetrics';
import { IPerformanceMetrics } from '../metrics/base/performanceMetrics';
import { IUsageMetrics } from '../metrics/base/usageMetrics';
import { IStandardCostDetails } from '../common/commonMetricTypes';
import {
  IAgentResourceMetrics,
  IAgentPerformanceMetrics,
  IAgentUsageMetrics,
  ICognitiveResourceMetrics,
  IThinkingOperationMetrics
} from '../agent/agentMetricTypes';
import { ITimeWindowConfig } from './teamTimeWindowTypes';

// ─── Team Resource Types ─────────────────────────────────────────────────────────

export interface ITeamResourceMetrics extends IResourceMetrics {
  readonly agents: Record<string, IAgentResourceMetrics>;
  readonly cognitive: ICognitiveResourceMetrics;
  readonly agentAllocation: {
    readonly efficiency: number;
    readonly active: number;
    readonly capacity: number;
  };
  readonly taskDistribution: {
    readonly efficiency: number;
    readonly balance: number;
  };
  readonly collaborationMetrics: {
    readonly efficiency: number;
    readonly overhead: number;
  };
  readonly timestamp: number;
}

// ─── Team Performance Types ───────────────────────────────────────────────────

export interface ITeamPerformanceMetrics extends IPerformanceMetrics {
  readonly agents: Record<string, IAgentPerformanceMetrics>;
  readonly thinking: IThinkingOperationMetrics;
  readonly synergyMetrics: {
    readonly effectiveness: number;
    readonly coordination: number;
    readonly interaction: number;
  };
  readonly efficiencyMetrics: {
    readonly taskCompletion: {
      readonly rate: number;
      readonly quality: number;
    };
    readonly resourceUtilization: number;
  };
  readonly timestamp: number;
}

// ─── Team Usage Types ────────────────────────────────────────────────────────

export interface ITeamUsageMetrics extends IUsageMetrics {
  readonly agents: Record<string, IAgentUsageMetrics>;
  readonly utilizationMetrics: {
    readonly agentUtilization: {
      readonly rate: number;
      readonly distribution: number;
    };
    readonly resourceUtilization: number;
  };
  readonly workload: {
    readonly distribution: Map<string, number>;
    readonly balance: number;
  };
  readonly timestamp: number;
}

// ─── Team Cost Types ────────────────────────────────────────────────────────

export interface ITeamCostMetrics extends IStandardCostDetails {
  readonly averageCostPerAgent: number;
  readonly costDistribution: Map<string, number>;
  readonly trends: {
    readonly daily: number;
    readonly weekly: number;
    readonly monthly: number;
  };
  readonly timestamp: number;
}

// ─── Team Metrics Interface ────────────────────────────────────────────────────

export interface ITeamMetrics extends IBaseMetrics {
  readonly resource: ITeamResourceMetrics;
  readonly performance: ITeamPerformanceMetrics;
  readonly usage: ITeamUsageMetrics;
  readonly costs: ITeamCostMetrics;
  readonly timeWindows: ITimeWindowConfig;
  readonly timestamp: number;
}

export { TeamMetricsTypeGuards, TeamMetricsValidation } from './teamMetricsValidation';
