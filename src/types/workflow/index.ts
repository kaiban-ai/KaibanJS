/**
 * @file index.ts
 * @path KaibanJS/src/types/workflow/index.ts
 * @description Central export point for all workflow-related types
 *
 * @module types/workflow
 */

// ─── Base Types ────────────────────────────────────────────────────────────────
export type {
    IWorkflowError,
    IWorkflowSuccess,
    IWorkflowBlocked,
    IWorkflowErrored,
    IWorkflowStopped,
    IWorkflowResult,
    IWorkflowStartResult
} from './workflowBaseTypes';

export { IWorkflowTypeGuards } from './workflowBaseTypes';

// ─── Event Types ───────────────────────────────────────────────────────────────
export type {
    IWorkflowEventBase,
    IWorkflowStepEvent,
    IWorkflowControlEvent,
    IWorkflowAgentEvent,
    IWorkflowTaskEvent,
    IWorkflowEvents,
    WorkflowEventType,
    WorkflowControlEventParams,
    WorkflowStepEventParams,
    WorkflowAgentEventParams,
    WorkflowTaskEventParams
} from './workflowEventTypes';

// ─── Metric Types ──────────────────────────────────────────────────────────────
export type {
    IWorkflowResourceMetrics,
    IWorkflowPerformanceMetrics,
    IWorkflowUsageMetrics
} from './workflowMetricTypes';

export {
    WorkflowMetricsTypeGuards,
    WorkflowMetricsValidation
} from './workflowMetricTypes';

// ─── Stats Types ───────────────────────────────────────────────────────────────
export type {
    ITokenUsageBreakdown,
    IModelTokenMetrics,
    IModelRequestMetrics,
    IModelLatencyMetrics,
    IModelStats,
    IModelUsageStats,
    ITaskStatsWithModelUsage,
    IWorkflowStats,
    IWorkflowStatsWithMetadata
} from './workflowStatsTypes';

// ─── Metadata Types ─────────────────────────────────────────────────────────────
export type {
    IWorkflowMetadata
} from './workflowMetadataTypes';

export {
    isWorkflowMetadata,
    createEmptyWorkflowMetadata
} from './workflowMetadataTypes';

// ─── Validation Types ───────────────────────────────────────────────────────────
export {
    createWorkflowValidationResult,
    validateWorkflowEvent
} from './workflowEventValidation';
