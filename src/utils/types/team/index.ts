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

// Export team core types
export type {
    TeamState,
    TeamEnvironment,
    TeamInputs,
    TeamStore,
    TeamStateKey,
    ITeam,
    ITeamParams
} from './base';

// Export store-specific types and methods
export type {
    TeamStoreApi,
    UseBoundTeamStore,
    TeamStoreWithSubscribe,
    TeamStoreConfig,
    TeamStoreOptions,
    CreateTeamStore,
    TeamStoreMethods,
    TeamStoreTypeGuards
} from './store';

// Export handler types and methods
export type {
    // Base handler params
    HandlerBaseParams,
    TeamMessageParams,
    TeamTaskParams,
    TeamAgentParams,
    TeamToolParams,
    TeamWorkflowParams,
    TeamFeedbackParams,
    HandlerResult,
    WorkflowStartResult,
    
    // Method interfaces
    TeamMessageMethods,
    TeamTaskMethods,
    TeamToolMethods,
    TeamAgentMethods,
    TeamWorkflowMethods,
    TeamFeedbackMethods,
    TeamStreamingMethods,
    TeamValidationMethods,
    TeamStateActions,
    
    // Type guards
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
} from './typeUtils';

// Export enums
export {
    WORKFLOW_STATUS_enum,
    TASK_STATUS_enum,
    AGENT_STATUS_enum
} from '../common/enums';