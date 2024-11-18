/**
 * @file base.ts
 * @path src/utils/types/store/base.ts
 * @description Core store interfaces and types used across all stores
 *
 * @module @types/store
 */

import { StateCreator, StoreApi, UseBoundStore } from 'zustand';
import type { AgentType } from '../agent/base';
import type { TaskType } from '../task/base';
import type { Log } from '../team/logs';
import type { WorkflowResult } from '../workflow/base';
import type { LLMUsageStats } from '../llm/responses';
import type { CostDetails } from '../workflow/costs';

// ─── Core Store Types ─────────────────────────────────────────────────────────

/**
 * Base store state interface that all stores extend
 */
export interface IBaseStoreState {
    name: string;
    agents: AgentType[];
    tasks: TaskType[];
    workflowLogs: Log[];
    costDetails?: CostDetails;
    llmUsageStats?: LLMUsageStats;
    workflowResult?: WorkflowResult;
}

/**
 * Base store methods interface
 */
export interface IBaseStoreMethods<T extends IBaseStoreState> {
    getState: () => T;
    setState: (partial: Partial<T> | ((state: T) => Partial<T>), replace?: boolean) => void;
    subscribe: StoreSubscribe<T>;
    destroy: () => void;
}

// ─── Store Subscription Types ───────────────────────────────────────────────────

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
 * Store setter type
 */
export type SetStoreState<T extends IBaseStoreState> = (
    partial: Partial<T> | ((state: T) => Partial<T>),
    replace?: boolean
) => void;

/**
 * Store getter type
 */
export type GetStoreState<T extends IBaseStoreState> = () => T;

// ─── Store API Types ──────────────────────────────────────────────────────────

/** Store API interface */
export type IStoreApi<T extends IBaseStoreState> = StoreApi<T>;

/** Bound store type */
export type BoundStore<T extends IBaseStoreState> = UseBoundStore<IStoreApi<T>>;

/** Store creator type */
export type StoreCreator<T extends IBaseStoreState> = StateCreator<
    T,
    [['zustand/devtools', never], ['zustand/subscribeWithSelector', never]],
    [],
    T
>;

// ─── Store Configuration Types ────────────────────────────────────────────────

/**
 * Store configuration options
 */
export interface IStoreConfig {
    name: string;
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
    devMode?: boolean;
    serialize?: {
        exclude?: string[];
        serializers?: Record<string, (value: unknown) => unknown>;
        parseUndefined?: boolean;
    };
}

/**
 * Store validation result
 */
export interface IStoreValidationResult {
    isValid: boolean;
    errors: string[];
    warnings?: string[];
}

// ─── Store Middleware Types ──────────────────────────────────────────────────

/**
 * Store middleware configuration
 */
export interface IStoreMiddlewareConfig {
    devtools?: boolean;
    subscribeWithSelector?: boolean;
    persistence?: boolean;
    custom?: Array<
        (config: IStoreConfig) => 
            <T extends IBaseStoreState>(
                creator: StateCreator<T, [], [], T>
            ) => StateCreator<T, [], [], T>
    >;
}

/**
 * Store selector configuration
 */
export interface IStoreSelector<T extends IBaseStoreState, U> {
    selector: (state: T) => U;
    equals?: (a: U, b: U) => boolean;
}

// ─── Store Event Types ────────────────────────────────────────────────────────

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
export interface IStoreEvent {
    type: StoreEventType;
    data: unknown;
    timestamp: number;
    metadata?: Record<string, unknown>;
}

// ─── Type Guards ────────────────────────────────────────────────────────────

export const StoreTypeGuards = {
    /**
     * Check if value is base store state
     */
    isBaseStoreState: (value: unknown): value is IBaseStoreState => {
        if (typeof value !== 'object' || value === null) return false;
        const state = value as Partial<IBaseStoreState>;
        return (
            typeof state.name === 'string' &&
            Array.isArray(state.agents) &&
            Array.isArray(state.tasks) &&
            Array.isArray(state.workflowLogs)
        );
    },

    /**
     * Check if value has store methods
     */
    hasStoreMethods: <T extends IBaseStoreState>(
        value: unknown
    ): value is IBaseStoreMethods<T> => {
        if (typeof value !== 'object' || value === null) return false;
        const methods = value as Partial<IBaseStoreMethods<T>>;
        return (
            typeof methods.getState === 'function' &&
            typeof methods.setState === 'function' &&
            typeof methods.subscribe === 'function' &&
            typeof methods.destroy === 'function'
        );
    },

    /**
     * Check if value is store selector
     */
    isStoreSelector: <T extends IBaseStoreState, U>(
        value: unknown
    ): value is IStoreSelector<T, U> => {
        if (typeof value !== 'object' || value === null) return false;
        const selector = value as Partial<IStoreSelector<T, U>>;
        return typeof selector.selector === 'function';
    },

    /**
     * Check if value is store event
     */
    isStoreEvent: (value: unknown): value is IStoreEvent => {
        if (typeof value !== 'object' || value === null) return false;
        const event = value as Partial<IStoreEvent>;
        return (
            typeof event.type === 'string' &&
            typeof event.timestamp === 'number' &&
            'data' in event
        );
    }
};