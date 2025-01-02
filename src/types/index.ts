/**
 * @file index.ts
 * @path src/types/index.ts
 * @description Root type exports for the KaibanJS library
 *
 * @module @types
 */

// Agent Types
export {
    IAgentMetadata,
    IAgentCapabilities,
    IBaseAgent,
    IExecutableAgent,
    IReactChampionAgent,
    IAgentType,
    AgentTypeGuards,
    IAgentExecutionState,
    IAgentErrorActions,
    IAgentThinkingActions,
    IAgentToolActions,
    IAgentStatusActions,
    IAgentStoreActions,
    IAgentEventMetadata,
    IBaseAgentEvent,
    IAgentCreatedEvent,
    IAgentUpdatedEvent,
    IAgentDeletedEvent,
    IAgentStatusChangedEvent,
    IAgentEventHandler,
    AGENT_EVENT_TYPE,
    AGENT_EVENT_CATEGORY,
    AgentEventTypeGuards,
    MetricsTypeGuards,
    MetricsValidation
} from './agent';

// Common Types
export {
    IValidationResult,
    IValidationSchema,
    IValidationContext,
    IStatusEntity,
    IStatusType,
    IStatusErrorType,
    IStatusError,
    IStatusTransitionRule,
    IStatusTransitionContext,
    IStatusChangeEvent,
    IStatusChangeCallback,
    IStatusManagerConfig,
    WORKFLOW_STATUS_enum,
    IStandardCostDetails
} from './common';

// LLM Types
export {
    ILLMInstance,
    ILLMProviderConfig,
    IBaseProviderMetrics,
    LLMResponse,
    LLMProviders
} from './llm';

// Task Types
export {
    ITaskType,
    ITaskExecutionParams,
    ITaskExecutionState,
    ITaskMetrics,
    ITaskPerformanceMetrics,
    ITaskResourceMetrics,
    ITaskUsageMetrics
} from './task';

// Team Types
export type {
    // Base Types
    ITeamAgentSnapshot,
    ITeamAgentMetrics,
    ITeamState,
    ITeamHandlerMetadata,
    ITeamHandlerResult,
    ITeamStoreMethods,
    // Event Types
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
    TeamEventUnion,
    // Metric Types
    ITeamResourceMetrics,
    ITeamPerformanceMetrics,
    ITeamThroughputMetrics,
    ITeamUsageMetrics,
    ITeamMetrics,
    IHistoricalTeamMetrics,
    // Validation Types
    ITeamMetricsValidationResult,
    ITeamMetricsValidationOptions,
    // Time Window Types
    ITimeWindow,
    ITimeWindowConfig,
    IHistoricalMetrics,
    // Log Types
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
} from './team';

export {
    TeamEventType,
    TeamMetricsTypeGuards,
    TeamMetricsValidation
} from './team';

// Tool Types
export {
    IToolExecutionParams,
    IToolExecutionResult
} from './tool';

// Workflow Types
export {
    // Base Types
    IWorkflowError,
    IWorkflowSuccess,
    IWorkflowBlocked,
    IWorkflowErrored,
    IWorkflowStopped,
    IWorkflowResult,
    IWorkflowStartResult,
    
    // Event Types
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
    WorkflowTaskEventParams,

    // Metric Types
    IWorkflowResourceMetrics,
    IWorkflowPerformanceMetrics,
    IWorkflowUsageMetrics,

    // Stats Types
    ITokenUsageBreakdown,
    IModelTokenMetrics,
    IModelRequestMetrics,
    IModelLatencyMetrics,
    IModelStats,
    IModelUsageStats,
    ITaskStatsWithModelUsage,
    IWorkflowStats,
    IWorkflowStatsWithMetadata,

    // Metadata Types
    IWorkflowMetadata,

    // Validation Functions
    createWorkflowValidationResult,
    validateWorkflowEvent
} from './workflow';
