/**
 * @file taskHandlersTypes.ts
 * @path KaibanJS/src/types/task/taskHandlersTypes.ts
 * @description Task handler types and interfaces for operation handling
 *
 * @module types/task
 */

import type { IAgentType } from '../agent/agentBaseTypes';
import type { ITaskType } from './taskBaseTypes';
import type { IErrorType } from '../common/commonErrorTypes';
import type { IOutput, IParsedOutput } from '../llm/llmResponseTypes';
import type { TASK_STATUS_enum } from '../common/commonEnums';
import type { IHandlerResult } from '../common/commonHandlerTypes';
import type { IBaseStoreMethods, IBaseStoreState } from '../store/baseStoreTypes';

// ─── Handler Parameter Types ──────────────────────────────────────────────────

/**
 * Task execution parameters
 */
export interface ITaskExecutionParams {
    task: ITaskType;
    agent: IAgentType;
    input?: unknown;
    metadata?: Record<string, unknown>;
    options?: {
        timeout?: number;
        retries?: number;
        signal?: AbortSignal;
    };
}

/**
 * Task completion parameters
 */
export interface ITaskCompletionParams {
    task: ITaskType;
    agent: IAgentType;
    result: IParsedOutput | null;
    store: IBaseStoreMethods<IBaseStoreState>;
}

/**
 * Task error parameters
 */
export interface ITaskErrorParams {
    task: ITaskType;
    error: IErrorType;
    context?: Record<string, unknown>;
    store?: IBaseStoreMethods<IBaseStoreState>;
}

/**
 * Task update parameters
 */
export interface ITaskUpdateParams {
    task: ITaskType;
    updates: Partial<ITaskType>;
    metadata?: Record<string, unknown>;
}

/**
 * Task validation parameters
 */
export interface ITaskValidationParams {
    task: ITaskType;
    validatorId?: string;
    context?: Record<string, unknown>;
}

// ─── Handler Result Types ───────────────────────────────────────────────────────

/**
 * Task validation result
 */
export interface ITaskValidationResult {
    isValid: boolean;
    errors: string[];
    context?: {
        taskId: string;
        taskStatus: keyof typeof TASK_STATUS_enum;
        validationTime: number;
    };
    metadata?: Record<string, unknown>;
}

/**
 * Task handler response
 */
export interface ITaskHandlerResponse extends IHandlerResult {
    taskId: string;
    status: keyof typeof TASK_STATUS_enum;
    timestamp: number;
    metadata?: Record<string, unknown>;
}

// ─── Type Guards ────────────────────────────────────────────────────────────────

export const HandlerTypeGuards = {
    /**
     * Check if value is task completion parameters
     */
    isTaskCompletionParams: (value: unknown): value is ITaskCompletionParams => {
        if (typeof value !== 'object' || value === null) return false;
        const params = value as Partial<ITaskCompletionParams>;
        return !!(
            params.task &&
            params.agent &&
            params.store
        );
    },

    /**
     * Check if value is task error parameters
     */
    isTaskErrorParams: (value: unknown): value is ITaskErrorParams => {
        if (typeof value !== 'object' || value === null) return false;
        const params = value as Partial<ITaskErrorParams>;
        return !!(
            params.task &&
            params.error
        );
    },

    /**
     * Check if value is task validation result
     */
    isTaskValidationResult: (value: unknown): value is ITaskValidationResult => {
        if (typeof value !== 'object' || value === null) return false;
        const result = value as Partial<ITaskValidationResult>;
        return (
            typeof result.isValid === 'boolean' &&
            Array.isArray(result.errors)
        );
    },

    /**
     * Check if value is task handler response
     */
    isTaskHandlerResponse: (value: unknown): value is ITaskHandlerResponse => {
        if (typeof value !== 'object' || value === null) return false;
        const response = value as Partial<ITaskHandlerResponse>;
        return (
            typeof response.taskId === 'string' &&
            typeof response.status === 'string' &&
            typeof response.timestamp === 'number' &&
            'success' in response
        );
    }
};
