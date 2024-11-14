/**
 * @file typeUtils.ts
 * @path KaibanJS/src/utils/types/team/typeUtils.ts
 * @description Type guards and utility types for team functionality
 */

import type { TeamState, TeamStore } from './base';
import type { WorkflowStartResult } from './handlers';

// Convenience type for store subscription
export type TeamStoreSubscriber<U = TeamState> = (
    state: TeamState,
    previousState: TeamState
) => void | ((selectedState: U, previousSelectedState: U) => void);

// Type guard utilities for team functionality
export const TeamTypeUtils = {
    isCompleteTeamState(value: unknown): value is TeamState {
        return (
            typeof value === 'object' &&
            value !== null &&
            'name' in value &&
            'agents' in value &&
            'tasks' in value &&
            'workflowLogs' in value &&
            'teamWorkflowStatus' in value &&
            'workflowResult' in value &&
            'inputs' in value &&
            'workflowContext' in value &&
            'env' in value &&
            'logLevel' in value &&
            'tasksInitialized' in value
        );
    },

    isTeamStore(value: unknown): value is TeamStore {
        return (
            typeof value === 'object' &&
            value !== null &&
            'getState' in value &&
            'setState' in value &&
            'subscribe' in value &&
            'destroy' in value &&
            this.isCompleteTeamState((value as TeamStore).getState())
        );
    }
};

// Re-export guards for backward compatibility
export const {
    isCompleteTeamState,
    isTeamStore
} = TeamTypeUtils;

// Deprecated: Use TeamStore type instead
export type LegacyTeamStore = TeamStore;
