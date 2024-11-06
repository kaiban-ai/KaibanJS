/**
 * @file index.ts
 * @path src/utils/types/team/index.ts
 * @description Central export point for team-related types and interfaces
 */

// Export base store types
export type { 
    BaseStoreState, 
    StoreSubscribe 
} from '../store/base';

// Export team types from core modules
export type {
    TeamState,
    TeamEnvironment,
    TeamInputs,
    TeamStoreMethods,
    TeamMessageMethods,
    TeamTaskMethods,
    TeamToolMethods,
    TeamAgentMethods,
    TeamWorkflowMethods,
    TeamFeedbackMethods,
    TeamStateActions,
    TeamStreamingMethods,
    TeamValidationMethods,
    TeamStore,
    TeamTypeGuards,
    TeamUtils
} from './base';

// Export store-specific types
export type {
    TeamStoreApi,
    UseBoundTeamStore,
    TeamStoreWithSubscribe,
    TeamStoreConfig,
    TeamStoreOptions,
    CreateTeamStore,
    TeamStoreTypeGuards
} from './store';

// Export handler types
export type {
    HandlerBaseParams,
    TeamMessageParams,
    TeamTaskParams,
    TeamAgentParams,
    TeamToolParams,
    TeamWorkflowParams,
    TeamFeedbackParams,
    HandlerResult,
    WorkflowStartResult,
    HandlerTypeGuards
} from './handlers';

// Export log types
export type {
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
} from './logs';

// Export utility types
export type {
    TeamInitParams,
    TeamOperationConfig,
    TeamExecutionContext,
    TeamPerformanceMetrics,
    TeamValidationResult,
    TeamStateSnapshot,
    TeamUtilityGuards,
    TeamUtils as TeamUtilities
} from './utils';

// Export type guards and utilities
export {
    TeamTypeUtils,
    TeamStoreSubscriber,
    isCompleteTeamState,
    isTeamStore,
    LegacyTeamStore
} from './utils';

