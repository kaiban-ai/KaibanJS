/**
 * @file handlers.ts
 * @path src/utils/types/task/handlers.ts
 * @description Task handler interfaces and types for managing task operations
 */

import { Tool } from "langchain/tools";
import { AgentType } from "../agent/base";
import { TaskType } from "../task/base";
import { FeedbackObject } from "../task/base"; // For TaskFeedbackParams
import { ErrorType } from "../common/errors";
import { Output } from "../llm/responses";
import { TASK_STATUS_enum } from "../common/enums";
import { LLMUsageStats } from "../llm/responses";
import { CostDetails } from "../workflow/costs";
import { HandlerResult } from "../agent/handlers"; // Used but not re-exported

// Task execution handler parameters
export interface TaskExecutionParams {
    task: TaskType;
    input?: unknown;
    options?: {
        timeout?: number;
        retries?: number;
        signal?: AbortSignal;
    };
}

// Task completion handler parameters
export interface TaskCompletionParams {
    agent: AgentType;
    task: TaskType;
    result: unknown;
    metadata?: {
        duration?: number;
        iterationCount?: number;
        llmUsageStats?: LLMUsageStats;
        costDetails?: CostDetails;
    };
    store?: {
        getTaskStats: (task: TaskType) => TaskType;
        setState: (fn: (state: any) => any) => void;
        prepareNewLog: (params: any) => any;
        getState: () => any;
    };
}

// Task error handler parameters
export interface TaskErrorParams {
    task: TaskType;
    error: ErrorType;
    context?: {
        phase?: string;
        attemptNumber?: number;
        lastSuccessfulOperation?: string;
        recoveryPossible?: boolean;
    };
    store?: {
        setState: (fn: (state: any) => any) => void;
        prepareNewLog: (params: any) => any;
    };
}

// Task feedback parameters using FeedbackObject
export interface TaskFeedbackParams {
    feedback: FeedbackObject;
    timestamp: Date;
}

// Task tool execution parameters aligned with LangChain's Tool interface
export interface TaskToolExecutionParams {
    tool: Tool;
    input: Record<string, unknown>;
    output?: unknown;
    error?: Error;
}

// Task observation parameters
export interface TaskObservationParams {
    observationType: string;
    details: string;
    observationTime: Date;
}

// Task iteration parameters
export interface TaskIterationParams {
    iterationCount: number;
    iterationResult: unknown;
    iterationDuration: number;
}

// Task blocking handler parameters
export interface TaskBlockingParams {
    task: TaskType;
    error: ErrorType;
    dependencies?: {
        taskId: string;
        status: keyof typeof TASK_STATUS_enum;
        requiredFor: string;
    }[];
}

// Task validation handler parameters
export interface TaskValidationParams {
    task: TaskType;
    context?: Record<string, unknown>;
    options?: {
        strict?: boolean;
        validateDependencies?: boolean;
        customValidators?: ((task: TaskType) => boolean)[];
    };
}

// Task resource usage parameters
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

// Task execution timeout parameters
export interface TaskTimeoutParams {
    task: TaskType;
    timeoutConfig: {
        limit: number;
        type: 'execution' | 'response' | 'total';
    };
    elapsedTime: number;
}

// Task handler interface
export interface ITaskHandler {
    handleCompletion(params: TaskCompletionParams): Promise<HandlerResult>;
    handleError(params: TaskErrorParams): Promise<HandlerResult>;
    handleValidation(task: TaskType): Promise<HandlerResult>;
    handleTimeout?(params: TaskTimeoutParams): Promise<HandlerResult>;
    handleResourceLimits?(params: TaskResourceParams): Promise<HandlerResult>;
}

// Type guards for handler parameters
export const HandlerTypeGuards = {
    isTaskCompletionParams: (value: unknown): value is TaskCompletionParams => {
        return (
            typeof value === 'object' &&
            value !== null &&
            'agent' in value &&
            'task' in value &&
            'result' in value
        );
    },
    isTaskErrorParams: (value: unknown): value is TaskErrorParams => {
        return (
            typeof value === 'object' &&
            value !== null &&
            'task' in value &&
            'error' in value
        );
    },
    isTaskResourceParams: (value: unknown): value is TaskResourceParams => {
        return (
            typeof value === 'object' &&
            value !== null &&
            'task' in value &&
            'resourceStats' in value &&
            typeof value.resourceStats === 'object'
        );
    }
};
