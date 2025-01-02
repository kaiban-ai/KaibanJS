/**
* @file taskHandlerTypes.ts
* @path src/types/task/taskHandlerTypes.ts
* @description Task handler type definitions and interfaces
*
* @module @types/task
*/

import type { ILLMUsageMetrics } from '../llm/llmMetricTypes';
import type { IStandardCostDetails } from '../common/baseTypes';
import type { ITaskType } from './taskBaseTypes';
import type { IHandlerResult, IBaseHandlerMetadata } from '../common/baseTypes';
import type { ITaskResourceMetrics, ITaskPerformanceMetrics, ITaskUsageMetrics } from './taskMetricTypes';
import type { ValidationErrorType, ValidationWarningType } from '../common/validationTypes';
import type { IAgentType } from '../agent/agentBaseTypes';
import type { IErrorType } from '../common/errorTypes';
import type { LLMResponse } from '../llm/llmResponseTypes';
import { BATCH_PRIORITY_enum, TASK_STATUS_enum } from '../common/enumTypes';

// ─── Handler Parameter Types ──────────────────────────────────────────────────

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

export interface ITaskCompletionParams {
    task: ITaskType;
    agent: IAgentType;
    result: LLMResponse | null;
    store: {
        get: <T>(key: string) => Promise<T | undefined>;
        set: <T>(key: string, value: T) => Promise<void>;
        delete: (key: string) => Promise<void>;
        clear: () => Promise<void>;
    };
}

export interface ITaskErrorParams {
    task: ITaskType;
    error: IErrorType;
    context?: Record<string, unknown>;
    store?: {
        get: <T>(key: string) => Promise<T | undefined>;
        set: <T>(key: string, value: T) => Promise<void>;
        delete: (key: string) => Promise<void>;
        clear: () => Promise<void>;
    };
}

export interface ITaskUpdateParams {
    task: ITaskType;
    updates: Partial<ITaskType>;
    metadata?: Record<string, unknown>;
}

export interface ITaskValidationParams {
    task: ITaskType;
    validatorId?: string;
    context?: Record<string, unknown>;
}

// ─── Handler Result Types ───────────────────────────────────────────────────────

export interface ITaskValidationResult {
    isValid: boolean;
    errors: ValidationErrorType[];
    warnings: ValidationWarningType[];
    context?: {
        taskId: string;
        taskStatus: keyof typeof TASK_STATUS_enum;
        validationTime: number;
    };
    metadata?: Record<string, unknown>;
}

export interface ITaskHandlerResponse {
    success: boolean;
    taskId: string;
    status: keyof typeof TASK_STATUS_enum;
    timestamp: number;
    metadata: IBaseHandlerMetadata;
}

// ─── Task Metrics Types ──────────────────────────────────────────────────────

export interface ITaskMetrics {
    costs: IStandardCostDetails;
    llmUsageMetrics: ILLMUsageMetrics;
    resources: ITaskResourceMetrics;
    performance: ITaskPerformanceMetrics;
    usage: ITaskUsageMetrics;
    startTime: number;
    endTime: number;
    duration: number;
    iterationCount: number;
}

// ─── Task Handler Types ──────────────────────────────────────────────────────

export interface ITaskHandlerMetadata extends IBaseHandlerMetadata {
    taskId: string;
    taskName: string;
    status: string;
    priority: BATCH_PRIORITY_enum;
    assignedAgent: string;
    progress: number;
    metrics: {
        resources: ITaskResourceMetrics;
        usage: ITaskUsageMetrics;
        performance: ITaskPerformanceMetrics;
        timestamp: number;
        component: string;
        category: string;
        version: string;
    };
    dependencies: {
        completed: string[];
        pending: string[];
        blocked: string[];
    };
}

export interface ITaskHandlerResult<T = unknown> extends IHandlerResult<T, ITaskHandlerMetadata> {
    success: boolean;
    data?: T;
    metadata: ITaskHandlerMetadata;
}

// ─── Type Guards ────────────────────────────────────────────────────────────

export const TaskHandlerTypeGuards = {
    isTaskCompletionParams: (value: unknown): value is ITaskCompletionParams => {
        if (typeof value !== 'object' || value === null) return false;
        const params = value as Partial<ITaskCompletionParams>;
        return !!(params.task && params.agent && params.store);
    },

    isTaskErrorParams: (value: unknown): value is ITaskErrorParams => {
        if (typeof value !== 'object' || value === null) return false;
        const params = value as Partial<ITaskErrorParams>;
        return !!(params.task && params.error);
    },

    isTaskValidationResult: (value: unknown): value is ITaskValidationResult => {
        if (typeof value !== 'object' || value === null) return false;
        const result = value as Partial<ITaskValidationResult>;
        return (typeof result.isValid === 'boolean' && Array.isArray(result.errors));
    },

    isTaskHandlerResponse: (value: unknown): value is ITaskHandlerResponse => {
        if (typeof value !== 'object' || value === null) return false;
        const response = value as Partial<ITaskHandlerResponse>;
        return (
            typeof response.taskId === 'string' &&
            typeof response.status === 'string' &&
            typeof response.timestamp === 'number' &&
            'success' in response &&
            !!response.metadata
        );
    }
};

// ─── Factory Functions ───────────────────────────────────────────────────────

export const createEmptyTaskMetrics = (): ITaskMetrics => {
    const emptyLLMMetrics: ILLMUsageMetrics = {
        totalRequests: 0,
        activeUsers: 0,
        activeInstances: 0,
        requestsPerSecond: 0,
        averageResponseSize: 0,
        peakMemoryUsage: 0,
        uptime: 0,
        rateLimit: {
            current: 0,
            limit: 0,
            remaining: 0,
            resetTime: 0
        },
        tokenDistribution: {
            prompt: 0,
            completion: 0,
            total: 0
        },
        modelDistribution: {
            gpt4: 0,
            gpt35: 0,
            other: 0
        },
        timestamp: Date.now(),
        component: '',
        category: '',
        version: ''
    };

    return {
        costs: {
            inputCost: 0,
            outputCost: 0,
            totalCost: 0,
            currency: 'USD',
            breakdown: {
                promptTokens: { count: 0, cost: 0 },
                completionTokens: { count: 0, cost: 0 }
            }
        },
        llmUsageMetrics: emptyLLMMetrics,
        resources: {
            cpuUsage: 0,
            memoryUsage: 0,
            diskIO: { read: 0, write: 0 },
            networkUsage: { upload: 0, download: 0 },
            timestamp: Date.now()
        },
        performance: {
            executionTime: {
                average: 0,
                min: 0,
                max: 0
            },
            latency: {
                average: 0,
                min: 0,
                max: 0
            },
            throughput: {
                requestsPerSecond: 0,
                bytesPerSecond: 0
            },
            responseTime: {
                average: 0,
                min: 0,
                max: 0
            },
            queueLength: 0,
            errorRate: 0,
            successRate: 1,
            resourceUtilization: {
                timestamp: Date.now(),
                cpuUsage: 0,
                memoryUsage: 0,
                diskIO: {
                    read: 0,
                    write: 0
                },
                networkUsage: {
                    upload: 0,
                    download: 0
                }
            },
            timestamp: Date.now()
        },
        usage: {
            totalRequests: 0,
            activeUsers: 0,
            requestsPerSecond: 0,
            averageResponseSize: 0,
            peakMemoryUsage: 0,
            uptime: 0,
            rateLimit: {
                current: 0,
                limit: 0,
                remaining: 0,
                resetTime: 0
            },
            timestamp: Date.now()
        },
        startTime: Date.now(),
        endTime: Date.now(),
        duration: 0,
        iterationCount: 0
    };
};
