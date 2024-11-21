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
    IAgentTypeGuards,
    IAgentState,
    IAgentStoreConfig,
    IAgentStoreMethods,
    IAgentExecutionState
} from './agent';

// Common Types
export {
    IValidationResult,
    IValidationOptions,
    IValidationRule,
    IValidationSchema,
    IValidationContext,
    ValidationTypeGuards,
    DEFAULT_VALIDATION_CONFIG,
    IStatusEntity,
    IStatusType,
    IStatusUpdateParams,
    IStatusErrorType,
    IStatusError,
    IStatusTransition,
    IStatusTransitionContext,
    IStatusTransitionRule,
    IStatusChangeEvent,
    IStatusChangeCallback,
    IStatusManagerConfig
} from './common';

// LLM Types
export {
    ILLMUsageStats,
    ILLMResponse,
    ILLMConfig,
    ILLMProvider,
    ILLMInstance
} from './llm';

// Store Types
export {
    IBaseStoreState,
    IBaseStoreMethods,
    IStoreConfig
} from './store';

// Task Types
export {
    ITaskType,
    ITaskState,
    ITaskStoreMethods,
    ITaskStoreConfig,
    ITaskMetadata,
    ITaskPerformanceStats
} from './task';

// Team Types
export {
    ITeamState,
    ITeamEnvironment,
    ITeamInputs,
    ITeamMetrics,
    ITeamStoreMethods,
    ITeamExecutionState
} from './team';

// Tool Types
export {
    IToolExecutionParams,
    IToolExecutionResult,
    ICostDetails
} from './tool';

// Workflow Types
export {
    IWorkflowState,
    IWorkflowStore,
    IWorkflowStoreConfig,
    IWorkflowStats,
    IWorkflowHandlerParams
} from './workflow';
