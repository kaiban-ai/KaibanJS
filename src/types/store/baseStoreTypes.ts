/**
 * @file baseStoreTypes.ts
 * @path KaibanJS/src/types/store/baseStoreTypes.ts
 * @description Consolidated store types and interfaces for all stores
 *
 * @module types/store
 */

import { StateCreator, StoreApi, UseBoundStore } from 'zustand';
import type { IAgentType } from '../agent/agentBaseTypes';
import type { ITaskType } from '../task/taskBaseTypes';
import type { ILog } from '../team/teamLogsTypes';
import type { IWorkflowResult } from '../workflow/workflowBaseTypes';
import type { ILLMUsageStats } from '../llm/llmResponseTypes';
import type { ICostDetails } from '../workflow/workflowCostsTypes';
import type { IHandlerResult, IBaseHandlerParams } from '../common/commonHandlerTypes';

// ─── Core Store Types ─────────────────────────────────────────────────────────

/**
 * Base store state interface that all stores extend
 */
export interface IBaseStoreState {
    name: string;
    agents: IAgentType[];
    tasks: ITaskType[];
    workflowLogs: ILog[];
    costDetails?: ICostDetails;
    llmUsageStats?: ILLMUsageStats;
    workflowResult?: IWorkflowResult;
}

/**
 * Base store methods interface
 */
export interface IBaseStoreMethods<T extends IBaseStoreState> {
    getState: () => T;
    setState: (partial: Partial<T> | ((state: T) => Partial<T>), replace?: boolean) => void;
    subscribe: IStoreSubscribe<T>;
    destroy: () => void;
}

// ─── Store Subscription Types ─────────────────────────────────────────────────

/**
 * Store subscription interface
 */
export interface IStoreSubscribe<T> {
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

// ─── Store Configuration Types ──────────────────────────────────────────────────

/**
 * Base store configuration interface
 */
export interface IStoreConfig {
    name: string;
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
    middleware?: {
        devtools?: boolean;
        subscribeWithSelector?: boolean;
        persistence?: boolean;
    };
    maxRetries?: number;
    retryDelay?: number;
    taskTimeout?: number;
}

/**
 * Store validation result
 */
export interface IStoreValidationResult {
    isValid: boolean;
    errors: string[];
    warnings?: string[];
}

// ─── Store Handler Types ────────────────────────────────────────────────────────

/**
 * Store handler params interface extending base handler params
 */
export interface IStoreHandlerParams extends IBaseHandlerParams {
    store: IBaseStoreMethods<IBaseStoreState>;
}

// Re-export HandlerResult from common types
export type { IHandlerResult };

// ─── Type Guards ─────────────────────────────────────────────────────────────

export const IStoreTypeGuards = {
    /**
     * Check if value is store state
     */
    isStoreState: (value: unknown): value is IBaseStoreState => {
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
    }
};
