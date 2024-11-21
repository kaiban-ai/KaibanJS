/**
 * @file teamStoreTypes.ts
 * @description Team store type definitions and interfaces for managing team state and configuration
 */

import type { StoreApi, UseBoundStore } from 'zustand';
import type { IStoreSubscribe, IBaseStoreState, IStoreConfig } from '../store/baseStoreTypes';
import type { ITeamState } from './teamBaseTypes';
import type { ILog } from './teamLogsTypes';
import type { IWorkflowResult } from '../workflow/workflowBaseTypes';
import type { IWorkflowStats } from '../workflow/workflowStatsTypes';
import type { ILLMConfig } from '../llm/llmCommonTypes';
import type { IAgentStoreMethods } from '../agent/agentStoreTypes';
import type { ITaskStoreMethods } from '../task/taskStoreTypes';
import type { IHandlerResult } from '../common/commonHandlerTypes';
import type { 
    ISuccessMetadata, 
    IErrorMetadata, 
    IWorkflowMetadata,
    IBaseHandlerMetadata
} from '../common/commonMetadataTypes';

// ─── Store Configuration ─────────────────────────────────────────────────────

export interface ITeamStoreConfig extends IStoreConfig {
    maxConcurrentTasks?: number;
    taskTimeout?: number;
    progressCheckInterval?: number;
    retry?: {
        maxRetries?: number;
        retryDelay?: number;
        useExponentialBackoff?: boolean;
    };
    middleware?: {
        devtools?: boolean;
        subscribeWithSelector?: boolean;
        persist?: boolean;
    };
}

// ─── Store API Types ───────────────────────────────────────────────────────

export interface ITeamStoreApi extends StoreApi<ITeamState> {
    subscribe: IStoreSubscribe<ITeamState>;
}

export type IUseBoundTeamStore = {
    (): ITeamState;
    <U>(selector: (state: ITeamState) => U): U;
    <U>(selector: (state: ITeamState) => U, equalityFn: (a: U, b: U) => boolean): U;
    setState: StoreApi<ITeamState>["setState"];
    getState: StoreApi<ITeamState>["getState"];
    subscribe: ITeamStoreApi["subscribe"];
    destroy: () => void;
};

// ─── Store Methods ────────────────────────────────────────────────────────

export interface ITeamStoreWithSubscribe extends ITeamStoreApi {
    subscribe: IStoreSubscribe<ITeamState>;
}

export interface ITeamStoreMethods {
    getState: () => ITeamState;
    setState: (fn: (state: ITeamState) => Partial<ITeamState>) => void;
    subscribe: IStoreSubscribe<ITeamState>;
    destroy: () => void;
    startWorkflow: () => Promise<IHandlerResult<unknown, IWorkflowMetadata>>;
    stopWorkflow: () => Promise<IHandlerResult<unknown, IWorkflowMetadata>>;
    handleWorkflowError: () => Promise<IHandlerResult<unknown, IErrorMetadata>>;
    handleAgentStatusChange: () => Promise<IHandlerResult<unknown, ISuccessMetadata>>;
    handleAgentError: () => Promise<IHandlerResult<unknown, IErrorMetadata>>;
    handleTaskStatusChange: () => Promise<IHandlerResult<unknown, ISuccessMetadata>>;
    handleTaskError: () => Promise<IHandlerResult<unknown, IErrorMetadata>>;
    handleTaskBlocked: () => Promise<IHandlerResult<unknown, ISuccessMetadata>>;
    provideFeedback: () => Promise<IHandlerResult<unknown, ISuccessMetadata>>;
}

// ─── Configured Store Types ──────────────────────────────────────────────────

export interface IConfiguredAgentStore {
    store: IAgentStoreMethods;
    config: ITeamStoreConfig;
}

export interface IConfiguredTaskStore {
    store: ITaskStoreMethods;
    config: ITeamStoreConfig;
}

// ─── Store Creation ───────────────────────────────────────────────────────

export interface ITeamStoreCreateConfig {
    config?: ITeamStoreConfig;
    agentStore: IConfiguredAgentStore;
    taskStore: IConfiguredTaskStore;
}

export type CreateTeamStore = (config: ITeamStoreCreateConfig) => IUseBoundTeamStore;

// ─── Type Guards ─────────────────────────────────────────────────────────

export const TeamStoreTypeGuards = {
    isTeamStoreApi: (value: unknown): value is ITeamStoreApi =>
        typeof value === 'object' && 
        value !== null &&
        'subscribe' in value && 
        'setState' in value && 
        'getState' in value,

    isUseBoundTeamStore: (value: unknown): value is IUseBoundTeamStore =>
        typeof value === 'object' && 
        value !== null &&
        'subscribe' in value && 
        'setState' in value && 
        'getState' in value && 
        'destroy' in value,

    isTeamStoreConfig: (value: unknown): value is ITeamStoreConfig => {
        if (typeof value !== 'object' || value === null) return false;
        const config = value as ITeamStoreConfig;
        return typeof config.name === 'string' &&
            (!config.logLevel || ['debug', 'info', 'warn', 'error'].includes(config.logLevel));
    }
};

// ─── Validation Utilities ────────────────────────────────────────────────

export const TeamValidationUtils = {
    isCompleteTeamState: (value: unknown): value is ITeamState => {
        return (
            typeof value === 'object' &&
            value !== null &&
            'name' in value &&
            'agents' in value &&
            'tasks' in value &&
            'workflowLogs' in value &&
            'teamWorkflowStatus' in value &&
            'workflowContext' in value &&
            'inputs' in value &&
            'env' in value &&
            'tasksInitialized' in value
        );
    }
};
