/**
 * @file store.ts
 * @path KaibanJS/src/utils/types/team/store.ts
 * @description Team store types and interfaces for managing team state and operations
 */

import type { StoreApi, UseBoundStore } from 'zustand';
import type { StoreSubscribe, BaseStoreState, StoreConfig } from '../store/base';
import type { TeamState } from './base';
import type { Log } from './logs';
import type { TaskType } from '../task/base';
import type { AgentType } from '../agent/base';
import type { LLMConfig } from '../llm/providers';
import type { WorkflowResult, WorkflowStats } from '../workflow/base';

// ─── Team Store API ───────────────────────────────────────────────────────────

/**
 * Team store API interface
 */
export interface TeamStoreApi extends StoreApi<TeamState> {
    /** Subscribe to state changes */
    subscribe: StoreSubscribe<TeamState>;
}

/**
 * Bound team store type
 */
export type UseBoundTeamStore = {
    /** Get current state */
    (): TeamState;
    /** Select state with selector */
    <U>(selector: (state: TeamState) => U): U;
    /** Select state with equality function */
    <U>(selector: (state: TeamState) => U, equalityFn: (a: U, b: U) => boolean): U;
    /** Set state */
    setState: StoreApi<TeamState>["setState"];
    /** Get state */
    getState: StoreApi<TeamState>["getState"];
    /** Subscribe to state changes */
    subscribe: TeamStoreApi["subscribe"];
    /** Clean up store */
    destroy: () => void;
};

// ─── Team Store Methods ────────────────────────────────────────────────────────

/**
 * Team store with subscribe functionality
 */
export interface TeamStoreWithSubscribe extends TeamStoreApi {
    /** Subscribe to state changes */
    subscribe: StoreSubscribe<TeamState>;
}

/**
 * Team store methods interface
 */
export interface TeamStoreMethods {
    /** Get current state */
    getState: () => TeamState;
    /** Update state */
    setState: (fn: (state: TeamState) => Partial<TeamState>) => void;
    /** Subscribe to state changes */
    subscribe: StoreSubscribe<TeamState>;
    /** Clean up store */
    destroy: () => void;
}

// ─── Store Configuration ────────────────────────────────────────────────────────

/**
 * Team store configuration options
 */
export interface TeamStoreConfig extends StoreConfig {
    /** Maximum concurrent tasks */
    maxConcurrentTasks?: number;
    /** Task execution timeout */
    taskTimeout?: number;
    /** Progress check interval */
    progressCheckInterval?: number;
    /** Middleware configuration */
    middleware?: {
        /** Enable devtools */
        devtools?: boolean;
        /** Enable selector subscriptions */
        subscribeWithSelector?: boolean;
        /** Enable persistence */
        persist?: boolean;
    };
    /** Retry configuration */
    retry?: {
        /** Maximum retry attempts */
        maxRetries?: number;
        /** Retry delay in ms */
        retryDelay?: number;
        /** Use exponential backoff */
        useExponentialBackoff?: boolean;
    };
}

// ─── Store Creation Options ─────────────────────────────────────────────────────

/**
 * Team store creator options
 */
export interface TeamStoreOptions {
    /** Store configuration */
    config?: TeamStoreConfig;
    /** Initial state */
    initialState?: Partial<TeamState>;
}

/**
 * Team store creator type
 */
export type CreateTeamStore = (options?: TeamStoreOptions) => UseBoundTeamStore;

// ─── Type Guards ────────────────────────────────────────────────────────────────

/**
 * Type guards for team store
 */
export const TeamStoreTypeGuards = {
    /**
     * Check if value is team store API
     */
    isTeamStoreApi: (value: unknown): value is TeamStoreApi =>
        typeof value === 'object' && value !== null &&
        'subscribe' in value && 'setState' in value && 'getState' in value,

    /**
     * Check if value is bound team store
     */
    isUseBoundTeamStore: (value: unknown): value is UseBoundTeamStore =>
        typeof value === 'object' && value !== null &&
        'subscribe' in value && 'setState' in value && 'getState' in value && 'destroy' in value,

    /**
     * Check if value is team store config
     */
    isTeamStoreConfig: (value: unknown): value is TeamStoreConfig => {
        if (typeof value !== 'object' || value === null) return false;
        const config = value as TeamStoreConfig;
        return typeof config.name === 'string' &&
            (!config.logLevel || ['debug', 'info', 'warn', 'error'].includes(config.logLevel));
    }
};

// ─── Utility Types ───────────────────────────────────────────────────────────

/**
 * Team store subscription utility type
 */
export type TeamStoreSubscriber<U = TeamState> = (
    state: TeamState,
    previousState: TeamState
) => void | ((selectedState: U, previousSelectedState: U) => void);

// ─── Validation Types ─────────────────────────────────────────────────────────

/**
 * Store validation utilities
 */
export const TeamValidationUtils = {
    /**
     * Check if state is complete and valid
     */
    isCompleteTeamState: (value: unknown): value is TeamState => {
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
    }
};