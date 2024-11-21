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

// ─── Store Types ───────────────────────────────────────────────────────────────
export type {
    IWorkflowState,
    IWorkflowStore,
    IWorkflowStoreConfig,
    IWorkflowHandlerParams
} from './workflowStoreTypes';

// ─── Stats Types ───────────────────────────────────────────────────────────────
export type {
    ITokenUsageBreakdown,
    IModelTokenMetrics,
    IModelRequestMetrics,
    IModelLatencyMetrics,
    IModelStats,
    IModelUsageStats,
    IWorkflowTaskMetrics,
    IResourceMetrics,
    IErrorMetrics,
    ITimingMetrics,
    IPerformanceMetrics,
    IWorkflowStats
} from './workflowStatsTypes';

// ─── Cost Types ────────────────────────────────────────────────────────────────
export type {
    IModelPricing,
    RequiredPricingFields,
    ICostCalculationConfig,
    ITokenCostBreakdown,
    ICostBreakdown,
    ICostDetails,
    ICostAlertConfig
} from './workflowCostsTypes';

export { ICostTypeGuards } from './workflowCostsTypes';

// ─── Metadata Types ─────────────────────────────────────────────────────────────
export type {
    IRequiredWorkflowMetadata,
    IOptionalWorkflowMetadata,
    IWorkflowMetadata
} from './workflowMetadataTypes';

export {
    isCompleteMetadata,
    createDefaultMetadata
} from './workflowMetadataTypes';

// ─── Step Types ────────────────────────────────────────────────────────────────
export type {
    IStepConfig,
    IStepResult
} from './workflowStepsTypes';

export {
    createDefaultStepConfig,
    createDefaultStepResult
} from './workflowStepsTypes';

// Re-export common enums
export { WORKFLOW_STATUS_enum } from '../common/commonEnums';
