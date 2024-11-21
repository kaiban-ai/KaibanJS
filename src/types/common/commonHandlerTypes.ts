/**
 * @file commonHandlerTypes.ts
 * @path KaibanJS/src/types/common/commonHandlerTypes.ts
 * @description Canonical handler type definitions used across all domains
 *
 * @module types/common
 */

import { Tool } from "langchain/tools";
import { BaseMessage } from "@langchain/core/messages";
import { IErrorType, IBaseError } from './commonErrorTypes';
import { IAgentType } from '../agent/agentBaseTypes';
import { ITaskType } from '../task/taskBaseTypes';
import { IOutput, IParsedOutput } from '../llm/llmResponseTypes';
import { IBaseStoreMethods, IBaseStoreState } from '../store/baseStoreTypes';
import { WORKFLOW_STATUS_enum, TASK_STATUS_enum, AGENT_STATUS_enum } from './commonEnums';
import {
    IBaseHandlerMetadata,
    ISuccessMetadata,
    IErrorMetadata,
    IWorkflowMetadata,
    IMessageMetadata,
    IToolExecutionMetadata,
    ITaskMetadata,
    IResponseMetadata,
    ILLMEventMetadata,
    IAgentMetadata,
    IAgentCreationMetadata,
    IAgentExecutionMetadata
} from './commonMetadataTypes';
import { IValidationResult } from './commonValidationTypes';

// ─── Core Handler Types ─────────────────────────────────────────────────────────

/** Generic handler result interface */
export interface IHandlerResult<T = unknown, M extends IBaseHandlerMetadata = IBaseHandlerMetadata> {
    success: boolean;
    error?: IErrorType;
    data?: T;
    metadata: M;
}

/** Base handler parameters */
export interface IBaseHandlerParams {
    agent?: IAgentType;
    task?: ITaskType;
    metadata: IBaseHandlerMetadata;
}

// ─── Error Handling Types ─────────────────────────────────────────────────────

/** Error handler parameters */
export interface IErrorHandlerParams extends IBaseHandlerParams {
    error: IErrorType;
    context: Record<string, unknown>;
    metadata: IErrorMetadata;
}

// ─── Agent Handler Types ──────────────────────────────────────────────────────

/** Thinking handler parameters */
export interface IThinkingHandlerParams {
    agent: IAgentType;
    task: ITaskType;
    messages: unknown[];
    output?: IOutput;
    metadata: IBaseHandlerMetadata & {
        messageCount: number;
        processingTime: number;
    };
}

/** Tool handler parameters */
export interface IToolHandlerParams {
    agent: IAgentType;
    task: ITaskType;
    tool?: Tool;
    error: IBaseError;
    toolName: string;
    metadata: IBaseHandlerMetadata & IToolExecutionMetadata;
}

// ─── Task Handler Types ───────────────────────────────────────────────────────

/** Task execution parameters */
export interface ITaskExecutionParams {
    task: ITaskType;
    agent: IAgentType;
    input?: unknown;
    metadata: IBaseHandlerMetadata;
    options?: {
        timeout?: number;
        retries?: number;
        signal?: AbortSignal;
    };
}

/** Task completion parameters */
export interface ITaskCompletionParams {
    task: ITaskType;
    agent: IAgentType;
    result: IParsedOutput | null;
    store: IBaseStoreMethods<IBaseStoreState>;
    metadata: IBaseHandlerMetadata & {
        completionTime: number;
        resultSize: number;
    };
}

// ─── Team Handler Types ───────────────────────────────────────────────────────

/** Team inputs interface for workflow initialization */
export interface ITeamInputs {
    context?: Record<string, unknown>;
    parameters?: Record<string, unknown>;
    metadata: IBaseHandlerMetadata & IWorkflowMetadata;
}

/** Team message handler parameters */
export interface ITeamMessageParams {
    content: string | BaseMessage;
    context?: Record<string, unknown>;
    type: 'system' | 'user' | 'ai' | 'function';
    functionName?: string;
    metadata: IBaseHandlerMetadata & IMessageMetadata;
}

// ─── Resource & Validation Types ────────────────────────────────────────────────

/** Validation handler parameters */
export interface IValidationHandlerParams extends IBaseHandlerParams {
    context: Record<string, unknown>;
    metadata: IBaseHandlerMetadata & {
        validation: IValidationResult;
        context: Record<string, unknown>;
    };
    options?: {
        strict?: boolean;
        customValidators?: ((value: unknown) => boolean)[];
    };
}

/** Resource handler parameters */  
export interface IResourceHandlerParams extends IBaseHandlerParams {
    resourceStats: {
        memory: number;
        tokens: number;
        cpuTime: number;
        networkRequests: number;
    };
    thresholds: Record<string, number>;
    metadata: IBaseHandlerMetadata;
}

// ─── Type Guards ─────────────────────────────────────────────────────────────

export const IHandlerTypeGuards = {
    isBaseHandlerMetadata: (value: unknown): value is IBaseHandlerMetadata => {
        if (typeof value !== 'object' || value === null) return false;
        const metadata = value as Partial<IBaseHandlerMetadata>;
        return (
            typeof metadata.timestamp === 'number' &&
            typeof metadata.component === 'string' &&
            typeof metadata.operation === 'string' &&
            !!metadata.performance
        );
    },

    isHandlerResult: <T, M extends IBaseHandlerMetadata>(value: unknown): value is IHandlerResult<T, M> => {
        if (typeof value !== 'object' || value === null) return false;
        const result = value as Partial<IHandlerResult<T, M>>;
        return (
            typeof result.success === 'boolean' &&
            IHandlerTypeGuards.isBaseHandlerMetadata(result.metadata!)
        );
    },

    isErrorHandlerParams: (value: unknown): value is IErrorHandlerParams => {
        if (typeof value !== 'object' || value === null) return false;
        const params = value as Partial<IErrorHandlerParams>;
        return !!(
            params.error &&
            params.context &&
            IHandlerTypeGuards.isBaseHandlerMetadata(params.metadata!)
        );
    }
};

// ─── Utility Functions ──────────────────────────────────────────────────────

/** Create a success handler result */
export const createSuccessResult = <T>(
    data: T,
    metadata: ISuccessMetadata
): IHandlerResult<T, ISuccessMetadata> => ({
    success: true,
    data,
    metadata
});

/** Create an error handler result */
export const createErrorResult = (
    error: IErrorType,
    metadata: IErrorMetadata
): IHandlerResult<never, IErrorMetadata> => ({
    success: false,
    error,
    metadata
});

/** Create base handler metadata */
export const createBaseMetadata = (
    component: string,
    operation: string
): IBaseHandlerMetadata => ({
    timestamp: Date.now(),
    component,
    operation,
    performance: {
        startTime: Date.now(),
        endTime: 0,
        duration: 0,
        memoryUsage: process.memoryUsage().heapUsed
    }
});

/** Create validation metadata */
export const createValidationMetadata = (
    component: string,
    operation: string,
    validation: IValidationResult,
    context: Record<string, unknown>
): IBaseHandlerMetadata & {
    validation: IValidationResult;
    context: Record<string, unknown>;
} => ({
    ...createBaseMetadata(component, operation),
    validation,
    context
});

// ─── Agent-Specific Handler Types ────────────────────────────────────────────

/** Agent creation result */
export interface IAgentCreationResult extends IHandlerResult<{
    success: boolean;
    agent: IAgentType;
    validation: IValidationResult;
}, IAgentCreationMetadata> {}

/** Agent execution result */
export interface IAgentExecutionResult extends IHandlerResult<{
    success: boolean;
    result?: IOutput;
}, IAgentExecutionMetadata> {}
