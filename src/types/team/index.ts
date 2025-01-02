/**
 * @file index.ts
 * @path src/types/team/index.ts
 * @description Team type exports
 *
 * @module @team
 */

// Base Types
export type {
    ITeamAgentSnapshot,
    ITeamAgentMetrics,
    ITeamState,
    ITeamHandlerMetadata,
    ITeamHandlerResult,
    ITeamStoreMethods
} from './teamBaseTypes';

// Event Types
export type {
    TeamEvent,
    IWorkflowStartEvent,
    IWorkflowStopEvent,
    IWorkflowErrorEvent,
    IAgentStatusChangeEvent,
    IAgentErrorEvent,
    ITaskStatusChangeEvent,
    ITaskErrorEvent,
    ITaskBlockedEvent,
    IFeedbackProvidedEvent,
    TeamEventUnion
} from './teamEventTypes';

export { TeamEventType } from './teamEventTypes';

// Handler Types
export type {
    ITeamInputs,
    ITeamMessageParams,
    ITeamTaskParams
} from './teamHandlerTypes';

export { TeamHandlerTypeGuards } from './teamHandlerTypes';

// Metric Types
export type {
    ITeamResourceMetrics,
    ITeamPerformanceMetrics,
    ITeamThroughputMetrics,
    ITeamUsageMetrics,
    ITeamMetrics,
    IHistoricalTeamMetrics
} from './teamMetricTypes';

export { TeamMetricsTypeGuards } from './teamMetricTypes';

// Validation Types
export type {
    ITeamMetricsValidationResult,
    ITeamMetricsValidationOptions
} from './teamMetricsValidation';

export { TeamMetricsValidation } from './teamMetricsValidation';

// Time Window Types
export type {
    ITimeWindow,
    ITimeWindowConfig,
    IHistoricalMetrics
} from './teamTimeWindowTypes';

// Log Types
export type {
    IBaseLogMetadata,
    ITaskLogMetadata,
    ITaskLogEntry,
    IWorkflowLogMetadata,
    IWorkflowLogEntry,
    IAgentLogMetadata,
    IAgentLogEntry,
    IMessageLogMetadata,
    IMessageLogEntry,
    TeamLogEntry,
    ITeamLogHistory,
    ILog
} from './teamLogsTypes';
