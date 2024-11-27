/**
 * @file index.ts
 * @path KaibanJS\src\types\metrics\index.ts
 * @description Central export point for all metrics-related types and utilities
 * 
 * @module @types/metrics
 */

// Base Metric Types
export type {
    ITimeMetrics,
    IThroughputMetrics,
    IErrorMetrics
} from './base/performanceMetrics';

export type {
    IRateLimitMetrics,
    IUsageMetrics
} from './base/usageMetrics';

export type {
    IResourceMetrics
} from './base/resourceMetrics';

export type {
    IPerformanceMetrics
} from './base/performanceMetrics';

export type {
    IBaseMetrics
} from './base/baseMetrics';

// Tool Metrics Exports
export type {
    IToolUsageMetrics,
    IToolResourceMetrics,
    IToolPerformanceMetrics
} from '../tool/toolMetricTypes';
export {
    ToolMetricsTypeGuards,
    ToolMetricsValidation
} from '../tool/toolMetricTypes';

// Agent Metrics Exports
export type {
    IAgentUsageMetrics,
    IAgentResourceMetrics,
    IAgentPerformanceMetrics
} from '../agent/agentMetricTypes';
export {
    AgentMetricsTypeGuards,
    AgentMetricsValidation
} from '../agent/agentMetricTypes';

// Task Metrics Exports
export type {
    ITaskUsageMetrics,
    ITaskResourceMetrics,
    ITaskPerformanceMetrics
} from '../task/taskMetricTypes';
export {
    TaskMetricsTypeGuards,
    TaskMetricsValidation
} from '../task/taskMetricTypes';

// Workflow Metrics Exports
export type {
    IWorkflowUsageMetrics,
    IWorkflowResourceMetrics,
    IWorkflowPerformanceMetrics
} from '../workflow/workflowMetricTypes';
export {
    WorkflowMetricsTypeGuards,
    WorkflowMetricsValidation
} from '../workflow/workflowMetricTypes';

// Team Metrics Exports
export type {
    ITeamUsageMetrics,
    ITeamResourceMetrics,
    ITeamPerformanceMetrics
} from '../team/teamMetricTypes';
export {
    TeamMetricsTypeGuards,
    TeamMetricsValidation
} from '../team/teamMetricTypes';

// LLM Metrics Exports
export type {
    ILLMUsageMetrics,
    ILLMResourceMetrics,
    ILLMPerformanceMetrics
} from '../llm/llmMetricTypes';
export {
    LLMMetricsTypeGuards,
    LLMMetricsValidation
} from '../llm/llmMetricTypes';

// Re-export common validation utilities
export { createValidationResult } from '@utils/validation/validationUtils';
export type { IValidationResult } from '../common/commonValidationTypes';

// Re-export cost-related types from common metrics
export type {
    ITokenCostBreakdown,
    IStandardCostDetails,
    IModelPricingConfig,
    ICostTrackingOptions,
    ICostAggregate
} from '../common/commonMetricTypes';
