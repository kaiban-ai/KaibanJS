/**
 * @file index.ts 
 * @path src/utils/types/team/index.ts
 * @description Central export point for team-related types and interfaces
 */

// Import base store types from canonical source
import type { BaseStoreState, StoreSubscribe } from '../store';

// Export them alongside team types
export type {
    TeamEnvironment,
    TeamInputs,
    TeamState,
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
    SetTeamState,
    GetTeamState,
    TeamStateApi,
    BoundTeamStore,
    TeamStoreCreator,
    WorkflowStartResult,
    TeamInitParams,
    TeamOperationParams,
    TeamMessageConfig,
    TeamValidationResult,
    TeamExecutionContext
} from './base';

export {
    TeamTypeGuards,
    TeamUtils
} from './base';

// Store types
export type {
    TeamStoreApi,
    UseBoundTeamStore,
    TeamStoreWithSubscribe,
    TeamStoreConfig,
    TeamStoreOptions,
    CreateTeamStore
} from './store';

// Log types
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
    Log
} from './logs';

export {
    LogTypeGuards
} from './logs';