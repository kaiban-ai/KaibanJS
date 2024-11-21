/**
 * @file index.ts
 * @path src/types/team/index.ts
 * @description Central export point for team-related types and interfaces
 *
 * @module @types/team
 */

export type {
    // Core Team State Types
    ITeamState,
    ITeamEnvironment,
    ITeamInputs,
    ITeamMetrics,

    // Team Methods
    ITeamWorkflowMethods,
    ITeamAgentMethods,
    ITeamTaskMethods,
    ITeamStoreMethods
} from './teamBaseTypes';

export type {
    // Log Types
    ILog,
    IAgentLogMetadata,
    ITaskLogMetadata,
    IWorkflowLogMetadata
} from './teamLogsTypes';

export type {
    // Store Types
    ITeamStoreApi,
    IUseBoundTeamStore,
    ITeamStoreWithSubscribe,
    ITeamStoreConfig,
    CreateTeamStore
} from './teamStoreTypes';

export type {
    // Execution Types
    ITeamExecutionState,
    ITeamExecutionSnapshot,
    ITeamExecutionMetrics
} from './teamExecutionTypes';

// Type Guards
export { ITeamTypeGuards as TeamTypeGuards } from './teamBaseTypes';
export { LogTypeGuards } from './teamLogsTypes';
export { TeamStoreTypeGuards } from './teamStoreTypes';
export { TeamExecutionTypeGuards } from './teamExecutionTypes';
