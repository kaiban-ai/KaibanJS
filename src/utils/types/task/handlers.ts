/**
 * @file handlers.ts
 * @path src/utils/types/task/handlers.ts
 * @description Task handler interfaces and types for managing task operations
 */

import { Tool } from "langchain/tools";
import { AgentType } from "@/utils/types/agent/base";
import { TaskType } from "./base";
import { ErrorType } from "../common/errors";
import { Output } from "../llm/responses";
import { TASK_STATUS_enum } from "../common/enums";
import { LLMUsageStats } from "../llm/responses";
import { CostDetails } from "../workflow/stats";

/**
 * Task execution handler parameters
 */
export interface TaskExecutionParams {
    /** Task instance */
    task: TaskType;
    
    /** Input data */
    input?: unknown;
    
    /** Execution options */
    options?: {
        timeout?: number;
        retries?: number;
        signal?: AbortSignal;
    };
}

/**
 * Task completion handler parameters
 */
export interface TaskCompletionParams {
    /** Agent that completed the task */
    agent: AgentType;
    
    /** Completed task */
    task: TaskType;
    
    /** Task result */
    result: unknown;
    
    /** Completion metadata */
    metadata?: {
        duration?: number;
        iterationCount?: number;
        llmUsageStats?: LLMUsageStats;
        costDetails?: CostDetails;
    };

    /** Store reference */
    store?: {
        getTaskStats: (task: TaskType) => any;
        setState: (fn: (state: any) => any) => void;
        prepareNewLog: (params: any) => any;
        getState: () => any;
    };
}

/**
 * Task error handler parameters
 */
export interface TaskErrorParams {
    /** Task that errored */
    task: TaskType;
    
    /** Error that occurred */
    error: ErrorType;
    
    /** Error context */
    context?: {
        phase?: string;
        attemptNumber?: number;
        lastSuccessfulOperation?: string;
        recoveryPossible?: boolean;
    };

    /** Store reference */
    store?: {
        setState: (fn: (state: any) => any) => void;
        prepareNewLog: (params: any) => any;
    };
}

/**
 * Task blocking handler parameters
 */
export interface TaskBlockingParams {
    /** Blocked task */
    task: TaskType;
    
    /** Blocking reason */
    error: ErrorType;
    
    /** Dependencies causing block */
    dependencies?: {
        taskId: string;
        status: keyof typeof TASK_STATUS_enum;
        requiredFor: string;
    }[];
}

/**
 * Task validation handler parameters
 */
export interface TaskValidationParams {
    /** Task to validate */
    task: TaskType;
    
    /** Validation context */
    context?: Record<string, unknown>;
    
    /** Validation options */
    options?: {
        strict?: boolean;
        validateDependencies?: boolean;
        customValidators?: ((task: TaskType) => boolean)[];
    };
}

/**
 * Task feedback handler parameters
 */
export interface TaskFeedbackParams {
    /** Task receiving feedback */
    task: TaskType;
    
    /** Feedback content */
    feedback: string;
    
    /** Feedback metadata */
    metadata?: {
        source?: string;
        priority?: 'low' | 'medium' | 'high';
        category?: string;
    };
}

/**
 * Task tool execution parameters
 */
export interface TaskToolExecutionParams {
    /** Task context */
    task: TaskType;
    
    /** Tool being used */
    tool: Tool;
    
    /** Tool input */
    input: unknown;
    
    /** Execution options */
    options?: {
        timeout?: number;
        retries?: number;
    };
}

/**
 * Task observation handler parameters
 */
export interface TaskObservationParams {
    /** Task context */
    task: TaskType;
    
    /** Agent making observation */
    agent: AgentType;
    
    /** Observation content */
    observation: string | Record<string, unknown>;
    
    /** Observation metadata */
    metadata?: Record<string, unknown>;
}

/**
 * Task iteration handler parameters
 */
export interface TaskIterationParams {
    /** Task being iterated */
    task: TaskType;
    
    /** Current iteration */
    iteration: number;
    
    /** Maximum iterations */
    maxIterations: number;
    
    /** Iteration result */
    result?: Output;
}

/**
 * Task handler result interface
 */
export interface HandlerResult {
    /** Success indicator */
    success: boolean;
    
    /** Error if handler failed */
    error?: Error;
    
    /** Result data if successful */
    data?: unknown;
    
    /** Handler metadata */
    metadata?: Record<string, unknown>;
}

/**
 * Task handler interface
 */
export interface ITaskHandler {
    /**
     * Handle task completion
     */
    handleCompletion(params: TaskCompletionParams): Promise<HandlerResult>;

    /**
     * Handle task error
     */
    handleError(params: TaskErrorParams): Promise<HandlerResult>;

    /**
     * Handle task validation
     */
    handleValidation(task: TaskType): Promise<HandlerResult>;
}

/**
 * Type guards for handler parameters
 */
export const HandlerTypeGuards = {
    /** Check if value is task completion parameters */
    isTaskCompletionParams: (value: unknown): value is TaskCompletionParams => {
        return (
            typeof value === 'object' &&
            value !== null &&
            'agent' in value &&
            'task' in value &&
            'result' in value
        );
    },

    /** Check if value is task error parameters */
    isTaskErrorParams: (value: unknown): value is TaskErrorParams => {
        return (
            typeof value === 'object' &&
            value !== null &&
            'task' in value &&
            'error' in value
        );
    }
};