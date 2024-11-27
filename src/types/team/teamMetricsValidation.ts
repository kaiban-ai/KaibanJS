/**
 * @file teamMetricsValidation.ts
 * @path src/types/team/teamMetricsValidation.ts
 * @description Team metrics validation utilities
 *
 * @module @team
 */

import {
  createValidationResult,
  validateNumericRange,
  validateRequiredFields
} from '@utils/validation/validationUtils';
import { IValidationResult } from '../common/commonValidationTypes';
import {
  ITeamResourceMetrics,
  ITeamPerformanceMetrics,
  ITeamUsageMetrics,
  ITeamMetrics,
  ITeamCostMetrics
} from './teamMetricTypes';
import { ITeamAgentMetrics } from './teamBaseTypes';
import { ITimeWindow, ITimeWindowConfig } from './teamTimeWindowTypes';

// ─── Type Guards ─────────────────────────────────────────────────────────────────

export const TeamMetricsTypeGuards = {
  isTimeWindow: (value: unknown): value is ITimeWindow => {
    const requiredFields = ['retention', 'resolution', 'maxDataPoints'];
    const fieldsResult = validateRequiredFields(value, requiredFields);
    if (!fieldsResult.isValid) return false;

    const w = value as Partial<ITimeWindow>;
    return typeof w.retention === 'number' &&
      typeof w.resolution === 'number' &&
      typeof w.maxDataPoints === 'number';
  },

  isTimeWindowConfig: (value: unknown): value is ITimeWindowConfig => {
    const requiredFields = ['realtime', 'hourly', 'daily', 'weekly', 'monthly'];
    const fieldsResult = validateRequiredFields(value, requiredFields);
    if (!fieldsResult.isValid) return false;

    const c = value as Partial<ITimeWindowConfig>;
    return Object.values(c).every(window => TeamMetricsTypeGuards.isTimeWindow(window));
  },

  isTeamCostMetrics: (value: unknown): value is ITeamCostMetrics => {
    const requiredFields = ['totalCost', 'averageCostPerAgent', 'costDistribution', 'trends', 'timestamp'];
    const fieldsResult = validateRequiredFields(value, requiredFields);
    if (!fieldsResult.isValid) return false;

    const m = value as Partial<ITeamCostMetrics>;
    return typeof m.totalCost === 'number' &&
      typeof m.averageCostPerAgent === 'number' &&
      m.costDistribution instanceof Map &&
      typeof m.trends === 'object' &&
      m.trends !== null &&
      typeof m.trends.daily === 'number' &&
      typeof m.trends.weekly === 'number' &&
      typeof m.trends.monthly === 'number';
  },

  isTeamAgentMetrics: (value: unknown): value is ITeamAgentMetrics => {
    const requiredFields = ['perAgent', 'aggregated'];
    const fieldsResult = validateRequiredFields(value, requiredFields);
    if (!fieldsResult.isValid) return false;

    const m = value as Partial<ITeamAgentMetrics>;
    return typeof m.perAgent === 'object' &&
      m.perAgent !== null &&
      typeof m.aggregated === 'object' &&
      m.aggregated !== null &&
      typeof m.aggregated.totalAgents === 'number' &&
      typeof m.aggregated.activeAgents === 'number' &&
      typeof m.aggregated.efficiency === 'number';
  },

  isTeamResourceMetrics: (value: unknown): value is ITeamResourceMetrics => {
    const requiredFields = ['agents', 'cognitive', 'agentAllocation', 'taskDistribution', 'collaborationMetrics'];
    const fieldsResult = validateRequiredFields(value, requiredFields);
    if (!fieldsResult.isValid) return false;

    const m = value as Partial<ITeamResourceMetrics>;
    return typeof m.agents === 'object' &&
      m.agents !== null &&
      typeof m.cognitive === 'object' &&
      m.cognitive !== null &&
      typeof m.agentAllocation === 'object' &&
      m.agentAllocation !== null &&
      typeof m.taskDistribution === 'object' &&
      m.taskDistribution !== null &&
      typeof m.collaborationMetrics === 'object' &&
      m.collaborationMetrics !== null;
  },

  isTeamPerformanceMetrics: (value: unknown): value is ITeamPerformanceMetrics => {
    const requiredFields = ['agents', 'thinking', 'synergyMetrics', 'efficiencyMetrics'];
    const fieldsResult = validateRequiredFields(value, requiredFields);
    if (!fieldsResult.isValid) return false;

    const m = value as Partial<ITeamPerformanceMetrics>;
    return typeof m.agents === 'object' &&
      m.agents !== null &&
      typeof m.thinking === 'object' &&
      m.thinking !== null &&
      typeof m.synergyMetrics === 'object' &&
      m.synergyMetrics !== null &&
      typeof m.efficiencyMetrics === 'object' &&
      m.efficiencyMetrics !== null;
  },

  isTeamUsageMetrics: (value: unknown): value is ITeamUsageMetrics => {
    const requiredFields = ['agents', 'utilizationMetrics', 'workload'];
    const fieldsResult = validateRequiredFields(value, requiredFields);
    if (!fieldsResult.isValid) return false;

    const m = value as Partial<ITeamUsageMetrics>;
    return typeof m.agents === 'object' &&
      m.agents !== null &&
      typeof m.utilizationMetrics === 'object' &&
      m.utilizationMetrics !== null &&
      typeof m.workload === 'object' &&
      m.workload !== null;
  }
};

// ─── Validation ──────────────────────────────────────────────────────────────────

export const TeamMetricsValidation = {
  validateTimeWindow(window: unknown): IValidationResult {
    if (!TeamMetricsTypeGuards.isTimeWindow(window)) {
      return createValidationResult(false, ['Invalid time window structure']);
    }

    const results: IValidationResult[] = [
      validateNumericRange(window.retention, 1, Number.MAX_SAFE_INTEGER, 'retention'),
      validateNumericRange(window.resolution, 1, window.retention, 'resolution'),
      validateNumericRange(window.maxDataPoints, 1, Number.MAX_SAFE_INTEGER, 'maxDataPoints')
    ];

    return createValidationResult(
      results.every(r => r.isValid),
      results.flatMap(r => r.errors),
      results.flatMap(r => r.warnings)
    );
  },

  validateTimeWindowConfig(config: unknown): IValidationResult {
    if (!TeamMetricsTypeGuards.isTimeWindowConfig(config)) {
      return createValidationResult(false, ['Invalid time window configuration structure']);
    }

    const results: IValidationResult[] = Object.entries(config).map(([key, window]) => {
      const windowValidation = TeamMetricsValidation.validateTimeWindow(window);
      return {
        ...windowValidation,
        errors: windowValidation.errors.map(e => `${key}: ${e}`),
        warnings: windowValidation.warnings.map(w => `${key}: ${w}`)
      };
    });

    return createValidationResult(
      results.every(r => r.isValid),
      results.flatMap(r => r.errors),
      results.flatMap(r => r.warnings)
    );
  },

  validateTeamCostMetrics(metrics: unknown): IValidationResult {
    if (!TeamMetricsTypeGuards.isTeamCostMetrics(metrics)) {
      return createValidationResult(false, ['Invalid team cost metrics structure']);
    }

    const m = metrics as ITeamCostMetrics;
    const results: IValidationResult[] = [
      validateNumericRange(m.totalCost, 0, Number.MAX_SAFE_INTEGER, 'totalCost'),
      validateNumericRange(m.averageCostPerAgent, 0, Number.MAX_SAFE_INTEGER, 'averageCostPerAgent'),
      validateNumericRange(m.trends.daily, 0, Number.MAX_SAFE_INTEGER, 'trends.daily'),
      validateNumericRange(m.trends.weekly, 0, Number.MAX_SAFE_INTEGER, 'trends.weekly'),
      validateNumericRange(m.trends.monthly, 0, Number.MAX_SAFE_INTEGER, 'trends.monthly')
    ];

    // Validate cost distribution
    const distributionSum = Array.from(m.costDistribution.values()).reduce((a, b) => a + b, 0);
    if (Math.abs(distributionSum - m.totalCost) > 0.0001) {
      results.push(createValidationResult(false, ['Cost distribution sum does not match total cost']));
    }

    return createValidationResult(
      results.every(r => r.isValid),
      results.flatMap(r => r.errors),
      results.flatMap(r => r.warnings)
    );
  },

  validateTeamAgentMetrics(metrics: unknown): IValidationResult {
    if (!TeamMetricsTypeGuards.isTeamAgentMetrics(metrics)) {
      return createValidationResult(false, ['Invalid team agent metrics structure']);
    }

    const results: IValidationResult[] = [
      validateNumericRange(metrics.aggregated.efficiency, 0, 1, 'aggregated.efficiency'),
      validateNumericRange(metrics.aggregated.activeAgents, 0, metrics.aggregated.totalAgents, 'aggregated.activeAgents')
    ];

    return createValidationResult(
      results.every(r => r.isValid),
      results.flatMap(r => r.errors),
      results.flatMap(r => r.warnings)
    );
  },

  validateTeamResourceMetrics(metrics: unknown): IValidationResult {
    if (!TeamMetricsTypeGuards.isTeamResourceMetrics(metrics)) {
      return createValidationResult(false, ['Invalid team resource metrics structure']);
    }

    const m = metrics as ITeamResourceMetrics;
    const results: IValidationResult[] = [
      validateNumericRange(m.agentAllocation.efficiency, 0, 1, 'agentAllocation.efficiency'),
      validateNumericRange(m.taskDistribution.efficiency, 0, 1, 'taskDistribution.efficiency'),
      validateNumericRange(m.collaborationMetrics.efficiency, 0, 1, 'collaborationMetrics.efficiency')
    ];

    return createValidationResult(
      results.every(r => r.isValid),
      results.flatMap(r => r.errors),
      results.flatMap(r => r.warnings)
    );
  },

  validateTeamPerformanceMetrics(metrics: unknown): IValidationResult {
    if (!TeamMetricsTypeGuards.isTeamPerformanceMetrics(metrics)) {
      return createValidationResult(false, ['Invalid team performance metrics structure']);
    }

    const m = metrics as ITeamPerformanceMetrics;
    const results: IValidationResult[] = [
      validateNumericRange(m.synergyMetrics.effectiveness, 0, 1, 'synergyMetrics.effectiveness'),
      validateNumericRange(m.efficiencyMetrics.taskCompletion.rate, 0, 1, 'efficiencyMetrics.taskCompletion.rate')
    ];

    return createValidationResult(
      results.every(r => r.isValid),
      results.flatMap(r => r.errors),
      results.flatMap(r => r.warnings)
    );
  },

  validateTeamUsageMetrics(metrics: unknown): IValidationResult {
    if (!TeamMetricsTypeGuards.isTeamUsageMetrics(metrics)) {
      return createValidationResult(false, ['Invalid team usage metrics structure']);
    }

    const m = metrics as ITeamUsageMetrics;
    const results: IValidationResult[] = [
      validateNumericRange(m.utilizationMetrics.agentUtilization.rate, 0, 1, 'utilizationMetrics.agentUtilization.rate'),
      validateNumericRange(m.workload.balance, 0, 1, 'workload.balance')
    ];

    return createValidationResult(
      results.every(r => r.isValid),
      results.flatMap(r => r.errors),
      results.flatMap(r => r.warnings)
    );
  }
};
