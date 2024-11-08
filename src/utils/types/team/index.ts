// src/utils/types/team/index.ts

// Importing from base.ts
import {
    TeamEnvironment,
    TeamInputs,
    TeamRuntimeState,
    TeamState,
    TeamStore,
    ITeamParams,
    ITeam,
    WorkflowStartResult,
    TeamTypeGuards,
    TeamStateKey
} from "./base";

// Importing from logs.ts
import {
    StatusLogType,
    MessageLogType,
    LogType,
    LogMetadata,
    AgentLogMetadata,
    TaskLogMetadata,
    WorkflowLogMetadata,
    MessageLogMetadata,
    PrepareNewLogParams,
    Log,
    LogTypeGuards
} from "./logs";

// Importing from store.ts
import {
    TeamStoreApi,
    UseBoundTeamStore,
    TeamStoreWithSubscribe,
    TeamStoreMethods,
    TeamStoreConfig,
    TeamStoreOptions,
    CreateTeamStore,
    TeamStoreTypeGuards
} from "./store";

// Importing from typeUtils.ts
import {
    TeamStoreSubscriber,
    TeamTypeUtils,
    isCompleteTeamState,
    isTeamStore,
    LegacyTeamStore
} from "./typeUtils";

// Importing from utils.ts
import {
    TeamInitParams,
    TeamOperationConfig,
    TeamExecutionContext,
    TeamPerformanceMetrics,
    TeamValidationResult,
    TeamStateSnapshot,
    TeamUtilityGuards,
    TeamUtils,
    createEmptyContext,
    createEmptyMetrics
} from "./utils";

// Importing from handlers.ts
import {
    HandlerBaseParams,
    TeamMessageParams,
    TeamTaskParams,
    TeamAgentParams,
    TeamToolParams,
    TeamWorkflowParams,
    WorkflowStartResult as HandlerWorkflowStartResult,
    TeamFeedbackParams,
    HandlerResult,
    TeamMessageMethods,
    TeamTaskMethods,
    TeamToolMethods,
    TeamAgentMethods,
    TeamWorkflowMethods,
    TeamFeedbackMethods,
    TeamStreamingMethods,
    TeamValidationMethods,
    TeamStateActions,
    HandlerTypeGuards
} from "./handlers";

// Exporting all modules, types, interfaces, and utility functions
export {
    // Base Types and Interfaces
    TeamEnvironment,
    TeamInputs,
    TeamRuntimeState,
    TeamState,
    TeamStore,
    ITeamParams,
    ITeam,
    WorkflowStartResult,
    TeamTypeGuards,
    TeamStateKey,

    // Logs Types and Guards
    StatusLogType,
    MessageLogType,
    LogType,
    LogMetadata,
    AgentLogMetadata,
    TaskLogMetadata,
    WorkflowLogMetadata,
    MessageLogMetadata,
    PrepareNewLogParams,
    Log,
    LogTypeGuards,

    // Store Types and Guards
    TeamStoreApi,
    UseBoundTeamStore,
    TeamStoreWithSubscribe,
    TeamStoreMethods,
    TeamStoreConfig,
    TeamStoreOptions,
    CreateTeamStore,
    TeamStoreTypeGuards,

    // Type Utils
    TeamStoreSubscriber,
    TeamTypeUtils,
    isCompleteTeamState,
    isTeamStore,
    LegacyTeamStore,

    // Utility Types and Guards
    TeamInitParams,
    TeamOperationConfig,
    TeamExecutionContext,
    TeamPerformanceMetrics,
    TeamValidationResult,
    TeamStateSnapshot,
    TeamUtilityGuards,
    TeamUtils,
    createEmptyContext,
    createEmptyMetrics,

    // Handler Types and Guards
    HandlerBaseParams,
    TeamMessageParams,
    TeamTaskParams,
    TeamAgentParams,
    TeamToolParams,
    TeamWorkflowParams,
    HandlerWorkflowStartResult,
    TeamFeedbackParams,
    HandlerResult,
    TeamMessageMethods,
    TeamTaskMethods,
    TeamToolMethods,
    TeamAgentMethods,
    TeamWorkflowMethods,
    TeamFeedbackMethods,
    TeamStreamingMethods,
    TeamValidationMethods,
    TeamStateActions,
    HandlerTypeGuards
};
