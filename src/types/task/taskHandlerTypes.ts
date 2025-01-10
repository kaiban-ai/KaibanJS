/**
 * @file taskHandlerTypes.ts
 * @path src/types/task/taskHandlerTypes.ts
 * @description Task handler type definitions
 */

import type { IValidationResult } from '../common/validationTypes';

export interface ITaskMetrics {
    timestamp: number;
    taskId: string;
    operation: string;
    duration: number;
    status: string;
    metadata?: Record<string, unknown>;
}

export interface ITaskValidationResult extends IValidationResult {
    taskId: string;
    operation: string;
    timestamp: number;
    metrics?: {
        validationTime: number;
        resourceUsage: number;
    };
    context?: {
        phase: string;
        component: string;
        priority: number;
    };
}

export interface ITaskHandlerConfig {
    taskId: string;
    operation: string;
    timeout?: number;
    retryAttempts?: number;
    retryDelay?: number;
    validationRules?: Array<(context: Record<string, unknown>) => Promise<boolean>>;
    onSuccess?: (result: Record<string, unknown>) => Promise<void>;
    onError?: (error: Error) => Promise<void>;
    metadata?: Record<string, unknown>;
}

export interface ITaskHandlerContext {
    taskId: string;
    operation: string;
    startTime: number;
    phase: string;
    attempt: number;
    metrics: ITaskMetrics;
    validation: ITaskValidationResult;
    metadata?: Record<string, unknown>;
}

export interface ITaskHandlerResult {
    success: boolean;
    taskId: string;
    operation: string;
    duration: number;
    metrics: ITaskMetrics;
    validation: ITaskValidationResult;
    error?: Error;
    metadata?: Record<string, unknown>;
}
