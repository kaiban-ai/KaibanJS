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

/**
 * Base store state interface that all stores extend
 */
export interface BaseStoreState {
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
export interface BaseStoreMethods<T extends BaseStoreState> {
    getState: () => T;
    setState: (partial: Partial<T> | ((state: T) => Partial<T>), replace?: boolean) => void;
    subscribe: StoreSubscribe<T>;
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

/**
 * Store configuration options
 */
export interface StoreConfig {
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
export interface StoreValidationResult {
    isValid: boolean;
    errors: string[];
    warnings?: string[];
}

/**
 * Store middleware configuration
 */
export interface StoreMiddlewareConfig {
    devtools?: boolean;
    subscribeWithSelector?: boolean;
    persistence?: boolean;
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
    selector: (state: T) => U;
    equals?: (a: U, b: U) => boolean;
}

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
    type: StoreEventType;
    data: unknown;
    timestamp: number;
    metadata?: Record<string, unknown>;
}

/**
 * Type guards for base store types
 */
export const StoreTypeGuards = {
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
