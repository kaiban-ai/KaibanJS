/**
 * @file index.ts
 * @path src/utils/types/store/index.ts
 * @description Central export point for store-related types and interfaces
 */

// Base store types
export type {
    BaseStoreState,
    BaseStoreMethods,
    StoreSubscribe,
    SetStoreState,
    GetStoreState,
    IStoreApi,
    BoundStore,
    StoreCreator,
    StoreConfig,
    StoreValidationResult,
    StoreMiddlewareConfig,
    StoreSelector,
    StoreEventType,
    StoreEvent
} from './base';

export {
    StoreTypeGuards
} from './base';

// Team store types
export type {
    TeamRuntimeState,
    TeamStoreState,
    TeamMessageMethods,
    TeamTaskMethods,
    TeamAgentMethods,
    TeamToolMethods,
    TeamWorkflowMethods,
    TeamFeedbackMethods,
    TeamStateActions,
    TeamStore,
    WorkflowStartResult
} from './team';

export {
    TeamStoreTypeGuards
} from './team';

// Workflow store types
export type {
    WorkflowRuntimeState,
    WorkflowExecutionStats,
    WorkflowProgress,
    WorkflowState,
    WorkflowEventType,
    WorkflowEvent,
    WorkflowActionParams,
    WorkflowActionResult,
    WorkflowActions,
    WorkflowStoreConfig,
    WorkflowValidationRules
} from './workflow';

export {
    WorkflowStoreTypeGuards
} from './workflow';

// Agent store types
export type {
    AgentRuntimeState,
    AgentExecutionMetrics,
    AgentStoreState,
    AgentThinkingParams,
    AgentIterationParams,
    ToolExecutionParams,
    AgentStoreActions,
    AgentExecutionContext,
    AgentExecutionResult,
    AgentSelectionCriteria
} from './agent';

export {
    AgentStoreTypeGuards
} from './agent';

// Task store types
export type {
    TaskRuntimeState,
    TaskExecutionMetrics,
    TaskStatusUpdateParams,
    TaskStoreState,
    TaskStoreActions
} from './task';

export {
    TaskStoreTypeGuards
} from './task';

// Re-export workflow store types
export * from './workflow';