/**
 * @file workflowStepsTypes.ts
 * @path KaibanJS/src/types/workflow/workflowStepsTypes.ts
 * @description Workflow step configuration and result types
 * 
 * @module @types/workflow 
 */

import type { IAgentType } from '../agent/agentBaseTypes';
import type { ITaskType } from '../task/taskBaseTypes';
import type { IErrorType } from '../common/commonErrorTypes';
import type { ILLMUsageStats } from '../llm/llmResponseTypes';
import type { ICostDetails } from './workflowCostsTypes';

// ─── Step Configuration Types ─────────────────────────────────────────────────────────

/**
 * Step configuration interface
 */
export interface IStepConfig {
    id: string;
    name: string;
    description: string;
    priority?: number;
    optional?: boolean;
    timeout?: number;
    retries?: number;
    assignedAgent?: IAgentType;
    dependencies?: string[];
    validationRules?: Array<(result: IStepResult) => boolean>;
    metadata?: Record<string, unknown>;
}

/**
 * Step execution options
 */
export interface IStepExecutionOptions {
    timeout?: number;
    retries?: number;
    validationEnabled?: boolean;
    stopOnError?: boolean;
    parallelExecution?: boolean;
}

/**
 * Step resource requirements
 */
export interface IStepResourceRequirements {
    memory?: number;
    cpu?: number;
    tokens?: number;
    maxCost?: number;
}

// ─── Step Result Types ─────────────────────────────────────────────────────────

/**
 * Step execution stats
 */
export interface IStepExecutionStats {
    startTime: number;
    endTime: number;
    duration: number;
    retryCount: number;
    resourceUsage: {
        memory: number;
        cpu: number;
        tokens: number;
    };
    llmUsageStats: ILLMUsageStats;
    costDetails: ICostDetails;
}

/**
 * Step result interface
 */
export interface IStepResult {
    success: boolean;
    taskId: string;
    result?: unknown;
    error?: IErrorType;
    stats?: IStepExecutionStats;
    validationResults?: Array<{
        rule: string;
        passed: boolean;
        message?: string;
    }>;
    metadata?: Record<string, unknown>;
}

// ─── Step Dependency Tracking ─────────────────────────────────────────────────────────

import { 
    WORKFLOW_STATUS_enum,
    TASK_STATUS_enum 
} from '../common/commonEnums';

export type IStepStatus = 
    | keyof typeof TASK_STATUS_enum
    | keyof typeof WORKFLOW_STATUS_enum
    | 'waiting'
    | 'ready';

export interface IStepDependencyTracking {
    stepId: string;
    dependencies: Array<{
        stepId: string;
        status: keyof typeof TASK_STATUS_enum;
        required: boolean;
    }>;
    dependents: Array<{
        stepId: string;
        status: IStepStatus;
        blocking: boolean;
    }>;
    status: keyof typeof WORKFLOW_STATUS_enum | 'waiting';
}

// ─── Step Validation Types ─────────────────────────────────────────────────────────

/**
 * Step validation result
 */
export interface IStepValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    context?: Record<string, unknown>;
}

/**
 * Step validation rule
 */
export interface IStepValidationRule {
    name: string;
    description: string;
    severity: 'error' | 'warning';
    validate: (step: IStepConfig) => boolean | Promise<boolean>;
}

// ─── Type Guards ─────────────────────────────────────────────────────────

export const StepTypeGuards = {
    /**
     * Check if value is step configuration
     */
    isStepConfig: (value: unknown): value is IStepConfig => {
        if (typeof value !== 'object' || value === null) return false;
        const config = value as Partial<IStepConfig>;
        return (
            typeof config.id === 'string' &&
            typeof config.name === 'string' &&
            typeof config.description === 'string'
        );
    },

    /**
     * Check if value is step result
     */
    isStepResult: (value: unknown): value is IStepResult => {
        if (typeof value !== 'object' || value === null) return false;
        const result = value as Partial<IStepResult>;
        return (
            typeof result.success === 'boolean' &&
            typeof result.taskId === 'string'
        );
    },

    /**
     * Check if value is step execution stats
     */
    isStepExecutionStats: (value: unknown): value is IStepExecutionStats => {
        if (typeof value !== 'object' || value === null) return false;
        const stats = value as Partial<IStepExecutionStats>;
        return (
            typeof stats.startTime === 'number' &&
            typeof stats.endTime === 'number' &&
            typeof stats.duration === 'number' &&
            typeof stats.retryCount === 'number' &&
            typeof stats.resourceUsage === 'object'
        );
    },

    /**
     * Check if value has valid dependencies
     */
    isValidDependencies: (value: unknown): boolean => {
        if (!Array.isArray(value)) return false;
        return value.every(dep => typeof dep === 'string');
    }
};

// ─── Factory Functions ─────────────────────────────────────────────────────────

/**
 * Create default step configuration
 */
export function createDefaultStepConfig(
    id: string,
    name: string,
    description: string
): IStepConfig {
    return {
        id,
        name,
        description,
        priority: 1,
        optional: false,
        timeout: 300000, // 5 minutes
        retries: 3
    };
}

/**
 * Create default step result
 */
export function createDefaultStepResult(taskId: string): IStepResult {
    return {
        success: false,
        taskId,
        stats: {
            startTime: Date.now(),
            endTime: Date.now(),
            duration: 0,
            retryCount: 0,
            resourceUsage: {
                memory: 0,
                cpu: 0,
                tokens: 0
            },
            llmUsageStats: {
                inputTokens: 0,
                outputTokens: 0,
                callsCount: 0,
                callsErrorCount: 0,
                parsingErrors: 0,
                totalLatency: 0,
                averageLatency: 0,
                lastUsed: Date.now(),
                memoryUtilization: {
                    peakMemoryUsage: 0,
                    averageMemoryUsage: 0,
                    cleanupEvents: 0
                },
                costBreakdown: {
                    input: 0,
                    output: 0,
                    total: 0,
                    currency: 'USD'
                }
            },
            costDetails: {
                inputCost: 0,
                outputCost: 0,
                totalCost: 0,
                currency: 'USD',
                breakdown: {
                    promptTokens: { count: 0, cost: 0 },
                    completionTokens: { count: 0, cost: 0 }
                }
            }
        }
    };
}

// Add backward compatibility exports
export type StepConfig = IStepConfig;
export type StepResult = IStepResult;
export type StepExecutionOptions = IStepExecutionOptions;
export type StepResourceRequirements = IStepResourceRequirements;
export type StepExecutionStats = IStepExecutionStats;
export type StepStatus = IStepStatus;
export type StepDependencyTracking = IStepDependencyTracking;
export type StepValidationResult = IStepValidationResult;
export type StepValidationRule = IStepValidationRule;
