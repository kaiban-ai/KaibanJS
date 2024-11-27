/**
 * @file commonHandlerTypes.ts
 * @path KaibanJS/src/types/common/commonHandlerTypes.ts
 * @description Canonical handler type definitions used across all domains
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
    IAgentMetadata,
    IAgentCreationMetadata,
    IAgentExecutionMetadata,
    IBaseContextPartial
} from './commonMetadataTypes';
import { IValidationResult } from './commonValidationTypes';

// ─── Base Handler Interface ────────────────────────────────────────────────────

/** Base handler interface defining core functionality */
export interface IBaseHandler {
    validate(): Promise<boolean>;
    execute(): Promise<void>;
    handleError(error: Error): Promise<void>;
}

// ─── Core Handler Types ─────────────────────────────────────────────────────────

/** Generic handler result interface with improved type support */
export interface IHandlerResult<T = unknown, M extends IBaseHandlerMetadata = IBaseHandlerMetadata> {
    success: boolean;
    error?: IErrorType;
    data?: T;
    metadata: M;
}

/** Base handler parameters - now requiring agent and task */
export interface IBaseHandlerParams {
    agent: IAgentType;
    task: ITaskType;
    metadata: IBaseHandlerMetadata;
    context?: IBaseContextPartial;
}

/** Base execution options */
export interface IBaseExecutionOptions {
    timeout?: number;
    retries?: number;
    signal?: AbortSignal;
    strict?: boolean;
    customValidators?: ((value: unknown) => boolean)[];
}

// ─── Enhanced Handler Types ────────────────────────────────────────────────────

/** Error handler parameters */
export interface IErrorHandlerParams extends IBaseHandlerParams {
    error: IErrorType;
    metadata: IErrorMetadata;
}

/** Thinking handler parameters */
export interface IThinkingHandlerParams extends IBaseHandlerParams {
    messages: unknown[];
    output?: IOutput;
    metadata: IBaseHandlerMetadata & {
        messageCount: number;
        processingTime: number;
    };
}

/** Tool handler parameters */
export interface IToolHandlerParams extends IBaseHandlerParams {
    tool?: Tool;
    error: IBaseError;
    toolName: string;
    metadata: IBaseHandlerMetadata & IToolExecutionMetadata;
}

/** Task execution parameters */
export interface ITaskExecutionParams extends IBaseHandlerParams {
    input?: unknown;
    options?: IBaseExecutionOptions;
}

/** Task completion parameters */
export interface ITaskCompletionParams extends IBaseHandlerParams {
    result: IParsedOutput | null;
    store: IBaseStoreMethods<IBaseStoreState>;
    metadata: IBaseHandlerMetadata & {
        completionTime: number;
        resultSize: number;
    };
}

// ─── Team & Resource Types ────────────────────────────────────────────────────

/** Team message handler parameters */
export interface ITeamMessageParams extends Omit<IBaseHandlerParams, 'agent' | 'task'> {
    content: string | BaseMessage;
    type: 'system' | 'user' | 'ai' | 'function';
    functionName?: string;
    metadata: IBaseHandlerMetadata & IMessageMetadata;
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
}

// ─── Type Guard Utilities ────────────────────────────────────────────────────

/** Type guard check function type */
type TypeGuardCheck<T> = (value: unknown) => value is T;

/** Create a type guard with multiple checks */
const createTypeGuard = <T>(checks: Array<(value: unknown) => boolean>): TypeGuardCheck<T> => {
    return (value: unknown): value is T => {
        return checks.every(check => check(value));
    };
};

/** Common type checks */
const commonChecks = {
    isObject: (value: unknown): boolean => 
        typeof value === 'object' && value !== null,
    hasProperty: (prop: string) => 
        (value: unknown): boolean => 
            typeof value === 'object' && 
            value !== null && 
            prop in value,
    isType: <T>(prop: string, type: string) =>
        (value: unknown): boolean =>
            typeof value === 'object' &&
            value !== null &&
            typeof (value as any)[prop] === type
};

// ─── Type Guards ─────────────────────────────────────────────────────────────

/** Handler type guards interface */
export interface IHandlerTypeGuardsInterface {
    isBaseHandlerMetadata: TypeGuardCheck<IBaseHandlerMetadata>;
    isHandlerResult: TypeGuardCheck<IHandlerResult>;
    isErrorHandlerParams: TypeGuardCheck<IErrorHandlerParams>;
    isBaseHandler: TypeGuardCheck<IBaseHandler>;
}

/** Handler type guards implementation */
export const IHandlerTypeGuards: IHandlerTypeGuardsInterface = {
    isBaseHandlerMetadata: createTypeGuard<IBaseHandlerMetadata>([
        commonChecks.isObject,
        commonChecks.isType('timestamp', 'number'),
        commonChecks.isType('component', 'string'),
        commonChecks.isType('operation', 'string'),
        value => !!((value as any).performance)
    ]),

    isHandlerResult: createTypeGuard<IHandlerResult>([
        commonChecks.isObject,
        commonChecks.isType('success', 'boolean'),
        value => IHandlerTypeGuards.isBaseHandlerMetadata((value as any).metadata)
    ]),

    isErrorHandlerParams: createTypeGuard<IErrorHandlerParams>([
        commonChecks.isObject,
        commonChecks.hasProperty('error'),
        commonChecks.hasProperty('metadata'),
        value => IHandlerTypeGuards.isBaseHandlerMetadata((value as any).metadata)
    ]),

    isBaseHandler: createTypeGuard<IBaseHandler>([
        commonChecks.isObject,
        commonChecks.hasProperty('validate'),
        commonChecks.hasProperty('execute'),
        commonChecks.hasProperty('handleError'),
        value => typeof (value as any).validate === 'function' &&
                typeof (value as any).execute === 'function' &&
                typeof (value as any).handleError === 'function'
    ])
};

// ─── Utility Functions ──────────────────────────────────────────────────────

/** Create a success handler result with generic metadata support */
export const createSuccessResult = <T, M extends IBaseHandlerMetadata>(
    data: T,
    metadata: M
): IHandlerResult<T, M> => ({
    success: true,
    data,
    metadata
});

/** Create an error handler result with generic metadata support */
export const createErrorResult = <M extends IBaseHandlerMetadata>(
    error: IErrorType,
    metadata: M
): IHandlerResult<never, M> => ({
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
        executionTime: {
            total: 0,
            average: 0,
            min: 0,
            max: 0
        },
        throughput: {
            operationsPerSecond: 0,
            dataProcessedPerSecond: 0
        },
        errorMetrics: {
            totalErrors: 0,
            errorRate: 0
        },
        resourceUtilization: {
            cpuUsage: 0,
            memoryUsage: process.memoryUsage().heapUsed,
            diskIO: { read: 0, write: 0 },
            networkUsage: { upload: 0, download: 0 },
            timestamp: Date.now()
        },
        timestamp: Date.now()
    },
    context: {
        source: component,
        target: operation,
        correlationId: Date.now().toString(),
        causationId: Date.now().toString()
    },
    validation: {
        isValid: true,
        errors: [],
        warnings: []
    }
});

/** Create validation metadata */
export const createValidationMetadata = (
    component: string,
    operation: string,
    validation: IValidationResult,
    context: IBaseContextPartial
): IBaseHandlerMetadata & {
    validation: IValidationResult;
    context: IBaseContextPartial;
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
