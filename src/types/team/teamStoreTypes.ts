/**
 * @file teamStoreTypes.ts
 * @path KaibanJS\src\types\team\teamStoreTypes.ts
 * @description Team store type definitions and interfaces for managing team state and configuration
 * 
 * @module @types/team
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
import type { IPerformanceMetrics } from '../common/commonMetricTypes';

// ─── Team Handler Types ──────────────────────────────────────────────────────

/** Team-specific metadata interface */
export interface ITeamHandlerMetadata extends IBaseHandlerMetadata {
    teamId: string;
    teamName: string;
    agentCount: number;
    taskCount: number;
    workflowStatus: string;
    performance: IPerformanceMetrics & {
        agentUtilization: number;
        taskCompletion: number;
    };
}

/** Team handler result type */
export type ITeamHandlerResult<T = unknown> = IHandlerResult<T, ITeamHandlerMetadata>;

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
    startWorkflow: () => Promise<ITeamHandlerResult<IWorkflowResult>>;
    stopWorkflow: () => Promise<ITeamHandlerResult<void>>;
    handleWorkflowError: () => Promise<ITeamHandlerResult<IErrorMetadata>>;
    handleAgentStatusChange: () => Promise<ITeamHandlerResult<void>>;
    handleAgentError: () => Promise<ITeamHandlerResult<IErrorMetadata>>;
    handleTaskStatusChange: () => Promise<ITeamHandlerResult<void>>;
    handleTaskError: () => Promise<ITeamHandlerResult<IErrorMetadata>>;
    handleTaskBlocked: () => Promise<ITeamHandlerResult<void>>;
    provideFeedback: () => Promise<ITeamHandlerResult<void>>;
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
    },

    isTeamHandlerMetadata: (value: unknown): value is ITeamHandlerMetadata => {
        if (typeof value !== 'object' || value === null) return false;
        const metadata = value as Partial<ITeamHandlerMetadata>;
        return (
            typeof metadata.teamId === 'string' &&
            typeof metadata.teamName === 'string' &&
            typeof metadata.agentCount === 'number' &&
            typeof metadata.taskCount === 'number' &&
            typeof metadata.workflowStatus === 'string' &&
            typeof metadata.performance === 'object' &&
            metadata.performance !== null &&
            // Validate IPerformanceMetrics structure
            typeof metadata.performance.executionTime === 'object' &&
            typeof metadata.performance.executionTime.total === 'number' &&
            typeof metadata.performance.executionTime.average === 'number' &&
            typeof metadata.performance.executionTime.min === 'number' &&
            typeof metadata.performance.executionTime.max === 'number' &&
            typeof metadata.performance.throughput === 'object' &&
            typeof metadata.performance.throughput.operationsPerSecond === 'number' &&
            typeof metadata.performance.throughput.dataProcessedPerSecond === 'number' &&
            typeof metadata.performance.errorMetrics === 'object' &&
            typeof metadata.performance.errorMetrics.totalErrors === 'number' &&
            typeof metadata.performance.errorMetrics.errorRate === 'number' &&
            typeof metadata.performance.resourceUtilization === 'object' &&
            typeof metadata.performance.resourceUtilization.cpuUsage === 'number' &&
            typeof metadata.performance.resourceUtilization.memoryUsage === 'number' &&
            typeof metadata.performance.resourceUtilization.diskIO === 'object' &&
            typeof metadata.performance.resourceUtilization.networkUsage === 'object' &&
            typeof metadata.performance.timestamp === 'number' &&
            // Validate team-specific metrics
            typeof metadata.performance.agentUtilization === 'number' &&
            typeof metadata.performance.taskCompletion === 'number'
        );
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
