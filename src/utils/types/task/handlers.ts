/**
 * @file handlers.ts
 * @path KaibanJS/src/utils/types/task/handlers.ts
 * @description Task handler type definitions for execution and lifecycle management
 *
 * @module @types/task
 */

import { Tool } from "langchain/tools";
import type { AgentType } from '../agent/base';
import type { TaskType } from './base';
import type { ErrorType } from '../common';
import type { Output, ParsedOutput } from '../llm/responses';
import type { TASK_STATUS_enum } from '../common/enums';
import type { HandlerResult } from '../agent/handlers';
import type { BoundStore, BaseStoreState } from '../store/base';

// ─── Task Execution Types ─────────────────────────────────────────────────────

/** Task execution parameters */
export interface TaskExecutionParams {
    task: TaskType;
    agent: AgentType;
    input?: unknown;
    metadata?: Record<string, unknown>;
    options?: {
        timeout?: number;
        retries?: number;
        signal?: AbortSignal;
    };
}

/** Task completion parameters */
export interface TaskCompletionParams {
    task: TaskType;
    agent: AgentType;
    result: ParsedOutput | null;
    store: BoundStore<BaseStoreState>;
}

/** Task error handling parameters */
export interface TaskErrorParams {
    task: TaskType;
    error: Error;
    context?: {
        phase?: string;
        attemptNumber?: number;
        lastSuccessfulOperation?: string;
        recoveryPossible?: boolean;
    };
}

/** Task tool execution parameters */
export interface TaskToolExecutionParams {
    task: TaskType;
    tool: Tool;
    input: Record<string, unknown>;
    output?: unknown;
    error?: Error;
}

/** Task observation parameters */
export interface TaskObservationParams {
    observationType: string;
    details: string;
    observationTime: Date;
}

/** Task blocking parameters */
export interface TaskBlockingParams {
    task: TaskType;
    error: ErrorType;
    blockingReason?: string;
    dependencies?: {
        taskId: string;
        status: keyof typeof TASK_STATUS_enum;
        requiredFor: string;
    }[];
}

/** Task validation parameters */
export interface TaskValidationParams {
    task: TaskType;
    context?: Record<string, unknown>;
    options?: {
        strict?: boolean;
        validateDependencies?: boolean;
        customValidators?: ((task: TaskType) => boolean)[];
    };
}

/** Task resource tracking parameters */
export interface TaskResourceParams {
    task: TaskType;
    resourceStats: {
        memory: number;
        tokens: number;
        cpuTime?: number;
        networkRequests?: number;
    };
    thresholds?: {
        maxMemory?: number;
        maxTokens?: number;
        maxCpuTime?: number;
        maxNetworkRequests?: number;
    };
}

/** Task timeout parameters */
export interface TaskTimeoutParams {
    task: TaskType;
    timeoutConfig: {
        limit: number;
        type: 'execution' | 'response' | 'total';
    };
    elapsedTime: number;
}

// ─── Task Handler Interface ───────────────────────────────────────────────────

/** Task handler interface */
export interface ITaskHandler {
    handleCompletion(params: TaskCompletionParams): Promise<HandlerResult>;
    handleError(params: TaskErrorParams): Promise<HandlerResult>;
    handleValidation(task: TaskType): Promise<HandlerResult>;
    handleTimeout?(params: TaskTimeoutParams): Promise<HandlerResult>;
    handleResourceLimits?(params: TaskResourceParams): Promise<HandlerResult>;
}

// ─── Type Guards ────────────────────────────────────────────────────────────────

export const HandlerTypeGuards = {
    isTaskCompletionParams: (value: unknown): value is TaskCompletionParams => {
        if (typeof value !== 'object' || value === null) return false;
        const params = value as Partial<TaskCompletionParams>;
        return !!(
            params.task &&
            params.agent &&
            params.store
        );
    },

    isTaskErrorParams: (value: unknown): value is TaskErrorParams => {
        if (typeof value !== 'object' || value === null) return false;
        const params = value as Partial<TaskErrorParams>;
        return !!(
            params.task &&
            params.error instanceof Error
        );
    },

    isTaskResourceParams: (value: unknown): value is TaskResourceParams => {
        if (typeof value !== 'object' || value === null) return false;
        const params = value as Partial<TaskResourceParams>;
        return !!(
            params.task &&
            params.resourceStats &&
            typeof params.resourceStats.memory === 'number' &&
            typeof params.resourceStats.tokens === 'number'
        );
    }
};
