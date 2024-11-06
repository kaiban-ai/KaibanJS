/**
 * @file store.ts
 * @path src/utils/types/team/store.ts
 * @description Team store specific types and interfaces
 */

import { StoreApi, UseBoundStore } from 'zustand';
import { StoreSubscribe } from '../store/base';
import { TeamState } from './base';

/**
 * Team store API interface
 * Represents the core store API methods
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
 * Extends the base store type with subscription capabilities
 */
export interface TeamStoreWithSubscribe extends TeamStoreApi {
    /** Enhanced subscribe method with selector support */
    subscribe: StoreSubscribe<TeamState>;
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
 * Type guard utilities for team store
 */
export const TeamStoreTypeGuards = {
    /**
     * Check if value is TeamStoreApi
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
     * Check if value is UseBoundTeamStore
     */
    isUseBoundTeamStore: (value: unknown): value is UseBoundTeamStore => {
        return (
            typeof value === 'object' &&
            value !== null &&
            'subscribe' in value &&
            'setState' in value &&
            'getState' in value &&
            'destroy' in value &&
            typeof (value as UseBoundTeamStore)() === 'object'
        );
    },

    /**
     * Check if value is TeamStoreConfig
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