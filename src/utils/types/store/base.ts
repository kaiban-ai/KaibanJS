/**
 * @file base.ts
 * @path KaibanJS/src/utils/types/store/base.ts
 * @description Core store interfaces and types used across all stores.
 * This file serves as the canonical source for base store types.
 */

import { StateCreator, StoreApi, UseBoundStore } from 'zustand';
import type { AgentType } from '../agent/base';
import type { TaskType } from '../task/base';
import type { Log } from '../team/logs';
import type { WorkflowResult } from '../workflow/base';
import type { LLMUsageStats } from '../llm/responses';
import type { CostDetails } from '../workflow/costs';

// ─── Base Store State ─────────────────────────────────────────────────────────────

/**
 * Base store state interface that all stores extend
 */
export interface BaseStoreState {
    /** Store identifier/name */
    name: string;
    /** List of agents in the store */
    agents: AgentType[];
    /** List of tasks in the store */
    tasks: TaskType[];
    /** List of workflow logs */
    workflowLogs: Log[];
    /** Cost details for the workflow */
    costDetails?: CostDetails;
    /** LLM usage statistics */
    llmUsageStats?: LLMUsageStats;
    /** Current workflow result */
    workflowResult?: WorkflowResult;
}

// ─── Store Methods ───────────────────────────────────────────────────────────────

/**
 * Base store methods interface
 */
export interface BaseStoreMethods<T extends BaseStoreState> {
    /** Get current state */
    getState: () => T;
    /** Update state */
    setState: (partial: Partial<T> | ((state: T) => Partial<T>), replace?: boolean) => void;
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

// ─── Store Type Utilities ────────────────────────────────────────────────────────

/** Type safe store setter */
export type SetStoreState<T extends BaseStoreState> = (
    partial: Partial<T> | ((state: T) => Partial<T>),
    replace?: boolean
) => void;

/** Type safe store getter */
export type GetStoreState<T extends BaseStoreState> = () => T;

/** Store API types */
export type IStoreApi<T extends BaseStoreState> = StoreApi<T>;
export type BoundStore<T extends BaseStoreState> = UseBoundStore<IStoreApi<T>>;

/** Store creator type */
export type StoreCreator<T extends BaseStoreState> = StateCreator<
    T,
    [['zustand/devtools', never], ['zustand/subscribeWithSelector', never]],
    [],
    T
>;

// ─── Store Configuration ────────────────────────────────────────────────────────

/**
 * Store configuration options
 */
export interface StoreConfig {
    /** Store identifier */
    name: string;
    /** Logging level */
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
    /** Development mode flag */
    devMode?: boolean;
    /** Serialization options */
    serialize?: {
        /** Fields to exclude from serialization */
        exclude?: string[];
        /** Custom serializers for specific types */
        serializers?: Record<string, (value: unknown) => unknown>;
        /** Whether to parse undefined values */
        parseUndefined?: boolean;
    };
}

/**
 * Store validation result
 */
export interface StoreValidationResult {
    /** Whether the store state is valid */
    isValid: boolean;
    /** List of validation errors */
    errors: string[];
    /** Optional warnings */
    warnings?: string[];
}

/**
 * Store middleware configuration
 */
export interface StoreMiddlewareConfig {
    /** Enable Redux DevTools */
    devtools?: boolean;
    /** Enable selector subscriptions */
    subscribeWithSelector?: boolean;
    /** Enable state persistence */
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
 * Store selector configuration
 */
export interface StoreSelector<T extends BaseStoreState, U> {
    /** State selector function */
    selector: (state: T) => U;
    /** Optional equality comparison function */
    equals?: (a: U, b: U) => boolean;
}

// ─── Store Events ───────────────────────────────────────────────────────────────

/** Store event types */
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
    /** Optional event metadata */
    metadata?: Record<string, unknown>;
}

// ─── Type Guards ────────────────────────────────────────────────────────────────

/**
 * Type guards for base store types
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
     * Check if value is store selector
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