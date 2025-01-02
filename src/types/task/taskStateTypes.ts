/**
* @file taskStateTypes.ts
* @path src/types/task/taskStateTypes.ts
* @description Task execution state management types and interfaces
*
* @module @types/task
*/

import { TASK_STATUS_enum } from '../common/enumTypes';
import type { IAgentType } from '../agent/agentBaseTypes';
import type { ITaskMetrics } from './taskHandlerTypes';

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

export interface ITaskExecutionState {
    status: keyof typeof TASK_STATUS_enum;
    progress: number;
    currentStep: string;
    blockingReason?: string;
    startTime?: Date;
    endTime?: Date;
    duration?: number;
    lastError?: Error;
    retryCount: number;
    assignedAgent?: IAgentType;
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

export function createDefaultExecutionState(): ITaskExecutionState {
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
            llmUsageMetrics: {
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
            }
        },
        startTime: new Date(),
        duration: 0
    };
}
