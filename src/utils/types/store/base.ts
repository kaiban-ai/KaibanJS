/**
 * @file base.ts
 * @path src/utils/types/store/base.ts
 * @description Core store types and interfaces used across all stores
 */

import { StateCreator, StoreApi, UseBoundStore } from 'zustand';
import type { AgentType } from '../agent/base';
import type { TaskType } from '../task/base';
import type { Log } from '../team/logs';

/**
 * Base store state interface
 */
export interface BaseStoreState {
    /** Store/Team name */
    name: string;
    
    /** Active agents */
    agents: AgentType[];
    
    /** Active tasks */
    tasks: TaskType[];
    
    /** Workflow logs */
    workflowLogs: Log[];
}

/**
 * Base store methods interface
 */
export interface BaseStoreMethods<T extends BaseStoreState> {
    /** Get current state */
    getState: () => T;

    /** Update state */
    setState: (
        partial: Partial<T> | ((state: T) => Partial<T>),
        replace?: boolean
    ) => void;

    /** Subscribe to state changes */
    subscribe: StoreSubscribe<T>;

    /** Clean up store resources */
    destroy: () => void;
}

/**
 * Store subscription interface
 */
export interface StoreSubscribe<T> {
    (listener: (state: T, previousState: T) => void): () => void;
    
    <U>(
        selector: (state: T) => U,
        listener: (selectedState: U, previousSelectedState: U) => void,
        options?: {
            equalityFn?: (a: U, b: U) => boolean;
            fireImmediately?: boolean;
        }
    ): () => void;
}

/**
 * Type safe store setter
 */
export type SetStoreState<T extends BaseStoreState> = (
    partial: Partial<T> | ((state: T) => Partial<T>),
    replace?: boolean
) => void;

/**
 * Type safe store getter
 */
export type GetStoreState<T extends BaseStoreState> = () => T;

/**
 * Store API types
 */
export type IStoreApi<T extends BaseStoreState> = StoreApi<T>;
export type BoundStore<T extends BaseStoreState> = UseBoundStore<IStoreApi<T>>;

/**
 * Store creator type
 */
export type StoreCreator<T extends BaseStoreState> = StateCreator<
    T,
    [['zustand/devtools', never], ['zustand/subscribeWithSelector', never]],
    [],
    T
>;

/**
 * Store configuration options
 */
export interface StoreConfig {
    /** Store name for devtools */
    name: string;

    /** Log level */
    logLevel?: 'debug' | 'info' | 'warn' | 'error';

    /** Development mode flag */
    devMode?: boolean;

    /** Serialization options */
    serialize?: {
        /** Properties to exclude from serialization */
        exclude?: string[];
        
        /** Custom serializer functions */
        serializers?: Record<string, (value: unknown) => unknown>;
        
        /** Enable parsing of undefined */
        parseUndefined?: boolean;
    };
}

/**
 * Store validation result
 */
export interface StoreValidationResult {
    /** Is the store valid */
    isValid: boolean;
    
    /** Validation errors */
    errors: string[];
    
    /** Optional warnings */
    warnings?: string[];
}

/**
 * Store middleware configuration
 */
export interface StoreMiddlewareConfig {
    /** Enable devtools */
    devtools?: boolean;

    /** Enable subscriptions */
    subscribeWithSelector?: boolean;

    /** Enable persistence */
    persistence?: boolean;

    /** Custom middleware */
    custom?: Array<
        (config: StoreConfig) => 
            <T extends BaseStoreState>(
                creator: StateCreator<T, [], [], T>
            ) => StateCreator<T, [], [], T>
    >;
}

/**
 * Store selection config
 */
export interface StoreSelector<T extends BaseStoreState, U> {
    /** Selector function */
    selector: (state: T) => U;
    
    /** Equality comparison function */
    equals?: (a: U, b: U) => boolean;
}

/**
 * Store event types
 */
export type StoreEventType = 
    | 'init'
    | 'destroy'
    | 'stateChange'
    | 'error'
    | 'middleware';

/**
 * Store event interface
 */
export interface StoreEvent {
    /** Event type */
    type: StoreEventType;
    
    /** Event data */
    data: unknown;
    
    /** Event timestamp */
    timestamp: number;
    
    /** Event metadata */
    metadata?: Record<string, unknown>;
}

/**
 * Type guard utilities for base store types
 */
export const StoreTypeGuards = {
    /**
     * Check if value is BaseStoreState
     */
    isBaseStoreState: (value: unknown): value is BaseStoreState => {
        return (
            typeof value === 'object' &&
            value !== null &&
            'name' in value &&
            'agents' in value &&
            'tasks' in value &&
            'workflowLogs' in value &&
            Array.isArray((value as BaseStoreState).agents) &&
            Array.isArray((value as BaseStoreState).tasks) &&
            Array.isArray((value as BaseStoreState).workflowLogs)
        );
    },

    /**
     * Check if value has store methods
     */
    hasStoreMethods: <T extends BaseStoreState>(
        value: unknown
    ): value is BaseStoreMethods<T> => {
        return (
            typeof value === 'object' &&
            value !== null &&
            'getState' in value &&
            'setState' in value &&
            'subscribe' in value &&
            'destroy' in value
        );
    },

    /**
     * Check if value is a store selector
     */
    isStoreSelector: <T extends BaseStoreState, U>(
        value: unknown
    ): value is StoreSelector<T, U> => {
        return (
            typeof value === 'object' &&
            value !== null &&
            'selector' in value &&
            typeof (value as StoreSelector<T, U>).selector === 'function'
        );
    }
};