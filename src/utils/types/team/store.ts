/**
 * @file store.ts
 * @path src/utils/types/team/store.ts
 * @description Team store types and interfaces for managing store operations
 */

import { StoreApi, UseBoundStore } from 'zustand';
import { StoreSubscribe } from '../store/base';
import type { TeamState } from './base';
import type { Log } from './logs';
import type { TaskType } from '../task/base';
import type { AgentType } from '../agent/base';
import type { ErrorType } from '../common/errors';
import type { WORKFLOW_STATUS_enum, TASK_STATUS_enum } from '../common/enums';
import type { LLMUsageStats } from '../llm/responses';
import type { WorkflowStats } from '../workflow/stats';
import type { CostDetails } from '../workflow/costs';
import type { Output } from '../llm/responses';
import type { BaseMessage } from "@langchain/core/messages";
import type { Tool } from "langchain/tools";

/**
 * Team store API interface representing the core store API methods
 */
export interface TeamStoreApi extends StoreApi<TeamState> {
    /** Store subscription method */
    subscribe: StoreSubscribe<TeamState>;
}

/**
 * Bound team store type
 * This is equivalent to UseBoundStore<TeamStoreApi> but includes all required methods
 */
export type UseBoundTeamStore = {
    (): TeamState;
    <U>(selector: (state: TeamState) => U): U;
    <U>(selector: (state: TeamState) => U, equalityFn: (a: U, b: U) => boolean): U;
    setState: StoreApi<TeamState>["setState"];
    getState: StoreApi<TeamState>["getState"];
    subscribe: TeamStoreApi["subscribe"];
    destroy: () => void;
};

/**
 * Team store with subscribe functionality
 */
export interface TeamStoreWithSubscribe extends TeamStoreApi {
    /** Enhanced subscribe method with selector support */
    subscribe: StoreSubscribe<TeamState>;
}

/**
 * Base store methods interface
 */
export interface TeamStoreMethods {
    /** Get current state */
    getState: () => TeamState;
    
    /** Set state */
    setState: (fn: (state: TeamState) => Partial<TeamState>) => void;
    
    /** State subscription */
    subscribe: StoreSubscribe<TeamState>;
    
    /** Clean up resources */
    destroy: () => void;
}

/**
 * Team store configuration options
 */
export interface TeamStoreConfig {
    /** Store name for debugging */
    name: string;
    
    /** Log level configuration */
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
    
    /** Development mode flag */
    devMode?: boolean;
    
    /** Store middleware options */
    middleware?: {
        /** Enable devtools integration */
        devtools?: boolean;
        
        /** Enable subscription support */
        subscribeWithSelector?: boolean;
        
        /** Enable persistence */
        persist?: boolean;
    };
    
    /** Maximum concurrent tasks */
    maxConcurrentTasks?: number;
    
    /** Task timeout in milliseconds */
    taskTimeout?: number;
    
    /** Progress check interval */
    progressCheckInterval?: number;
    
    /** Task retry settings */
    retry?: {
        /** Maximum retries per task */
        maxRetries?: number;
        
        /** Delay between retries (ms) */
        retryDelay?: number;
        
        /** Whether to use exponential backoff */
        useExponentialBackoff?: boolean;
    };
}

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

/**
 * Type guards for team store
 */
export const TeamStoreTypeGuards = {
    /**
     * Check if a value is TeamStoreApi
     */
    isTeamStoreApi: (value: unknown): value is TeamStoreApi => {
        return (
            typeof value === 'object' &&
            value !== null &&
            'subscribe' in value &&
            'setState' in value &&
            'getState' in value
        );
    },

    /**
     * Check if a value is UseBoundTeamStore
     */
    isUseBoundTeamStore: (value: unknown): value is UseBoundTeamStore => {
        return (
            typeof value === 'object' &&
            value !== null &&
            'subscribe' in value &&
            'setState' in value &&
            'getState' in value &&
            'destroy' in value
        );
    },

    /**
     * Check if a value is TeamStoreConfig
     */
    isTeamStoreConfig: (value: unknown): value is TeamStoreConfig => {
        if (typeof value !== 'object' || value === null) return false;
        const config = value as TeamStoreConfig;
        return (
            typeof config.name === 'string' &&
            (config.logLevel === undefined || 
             ['debug', 'info', 'warn', 'error'].includes(config.logLevel))
        );
    }
};