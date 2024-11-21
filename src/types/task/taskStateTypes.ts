/**
 * @file taskStateTypes.ts
 * @path KaibanJS/src/types/task/taskStateTypes.ts
 * @description Task execution state management types and interfaces
 *
 * @module types/task
 */

import { TASK_STATUS_enum } from '../common/commonEnums';
import type { IAgentType } from '../agent/agentBaseTypes';
import type { ITaskMetrics } from './taskTrackingTypes';

// ─── Task Execution State ───────────────────────────────────────────────────────

export interface ITaskExecutionContext {
    currentStep: string;
    totalSteps: number;
    stepResults: Record<string, unknown>;
    stepErrors: Record<string, Error>;
    stepDurations: Record<string, number>;
    validationRequired: boolean;
    dependencies: {
        required: string[];
        completed: string[];
        pending: string[];
        failed: string[];
    };
}

export interface ITaskExecutionMetrics {
    stepCompletion: Record<string, number>;
    stepRetries: Record<string, number>;
    totalRetries: number;
    averageStepDuration: number;
    longestStep: {
        name: string;
        duration: number;
    };
}

/**
 * Comprehensive task execution state that tracks all aspects of a task's execution
 */
export interface ITaskExecutionState {
    // Core execution state
    status: keyof typeof TASK_STATUS_enum;
    progress: number;
    currentStep: string;
    blockingReason?: string;
    
    // Timing and tracking
    startTime?: Date;
    endTime?: Date;
    duration?: number;
    
    // Error handling
    lastError?: Error;
    retryCount: number;
    
    // Assignment
    assignedAgent?: IAgentType;
    
    // Detailed execution data
    context: ITaskExecutionContext;
    executionMetrics: ITaskExecutionMetrics;
    runtimeMetrics: ITaskMetrics;
}

// ─── Type Guards ────────────────────────────────────────────────────────────────

export const TaskStateTypeGuards = {
    isTaskExecutionState: (value: unknown): value is ITaskExecutionState => {
        if (typeof value !== 'object' || value === null) return false;
        const state = value as Partial<ITaskExecutionState>;
        return (
            typeof state.status === 'string' &&
            typeof state.progress === 'number' &&
            'context' in state &&
            'executionMetrics' in state &&
            'runtimeMetrics' in state
        );
    }
};

// ─── State Creation Utilities ─────────────────────────────────────────────────

export function createDefaultExecutionState(taskId: string): ITaskExecutionState {
    return {
        status: 'PENDING',
        progress: 0,
        currentStep: '',
        retryCount: 0,
        context: {
            currentStep: '',
            totalSteps: 0,
            stepResults: {},
            stepErrors: {},
            stepDurations: {},
            validationRequired: false,
            dependencies: {
                required: [],
                completed: [],
                pending: [],
                failed: []
            }
        },
        executionMetrics: {
            stepCompletion: {},
            stepRetries: {},
            totalRetries: 0,
            averageStepDuration: 0,
            longestStep: {
                name: '',
                duration: 0
            }
        },
        runtimeMetrics: {
            startTime: Date.now(),
            endTime: Date.now(),
            duration: 0,
            iterationCount: 0,
            resources: {
                memory: 0,
                cpu: 0,
                tokens: 0
            },
            performance: {
                averageIterationTime: 0,
                averageTokensPerSecond: 0,
                peakMemoryUsage: 0
            },
            costs: {
                input: 0,
                output: 0,
                total: 0,
                currency: 'USD'
            },
            llmUsage: {
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
            }
        },
        startTime: new Date(),
        duration: 0
    };
}
