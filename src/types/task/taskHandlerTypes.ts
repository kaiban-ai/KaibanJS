/**
 * @file taskHandlerTypes.ts
 * @path KaibanJS/src/types/task/taskHandlerTypes.ts
 * @description Task handler type definitions and interfaces
 */

import type { ILLMUsageMetrics } from '../llm/llmMetricTypes';
import type { IStandardCostDetails } from '../common/baseTypes';
import type { ITaskType } from './taskBaseTypes';
import type { IHandlerResult } from '../common/baseTypes';
import type { IBaseHandlerMetadata } from '../common/baseTypes';
import type { ITaskResourceMetrics, ITaskPerformanceMetrics, ITaskUsageMetrics } from './taskMetricTypes';
import type { ValidationErrorType, ValidationWarningType } from '../common/validationTypes';
import type { IErrorMetrics } from '../metrics/base/performanceMetrics';
import { BATCH_PRIORITY_enum, ERROR_SEVERITY_enum } from '../common/enumTypes';
import { ERROR_KINDS } from '../common/errorTypes';
import { RecoveryStrategyType } from '../common/recoveryTypes';

// ─── Task Validation Types ────────────────────────────────────────────────────

export interface ITaskValidationResult {
    isValid: boolean;                 // Validation status
    errors: ValidationErrorType[];    // List of validation errors
    warnings: ValidationWarningType[]; // List of validation warnings
    context?: Record<string, unknown>; // Optional validation context
}

// ─── Task Metrics Types ──────────────────────────────────────────────────────

export interface ITaskMetrics {
    costs: IStandardCostDetails;            // Cost-related metrics
    llmUsageMetrics: ILLMUsageMetrics;      // LLM usage metrics
    resources: ITaskResourceMetrics;        // Resource utilization metrics
    performance: ITaskPerformanceMetrics;   // Performance metrics
    usage: ITaskUsageMetrics;               // Usage metrics
    startTime: number;                      // Execution start timestamp
    endTime: number;                        // Execution end timestamp
    duration: number;                       // Total execution duration
    iterationCount: number;                 // Number of iterations
}

// ─── Task Handler Types ──────────────────────────────────────────────────────

export interface ITaskHandlerMetadata extends IBaseHandlerMetadata {
    taskId: string;           // Task ID
    taskName: string;         // Task name
    status: string;           // Task status
    priority: BATCH_PRIORITY_enum; // Task priority using batch priority enum
    assignedAgent: string;    // Assigned agent ID
    progress: number;         // Task progress
    metrics: {                // Task metrics
        resources: ITaskResourceMetrics;    // Resource metrics
        usage: ITaskUsageMetrics;           // Usage metrics
        performance: ITaskPerformanceMetrics; // Performance metrics
    };
    dependencies: {           // Task dependencies
        completed: string[];  // Completed dependencies
        pending: string[];    // Pending dependencies
        blocked: string[];    // Blocked dependencies
    };
}

export interface ITaskHandlerResult<T = unknown> extends IHandlerResult<T, ITaskHandlerMetadata> {
    success: boolean;         // Operation success status
    data?: T;                 // Optional task output data
    metadata: ITaskHandlerMetadata;  // Task metadata
}

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
        timestamp: Date.now()
    };

    // Initialize error distribution records with all enum values
    const errorDistribution = Object.values(ERROR_KINDS).reduce(
        (acc, key) => ({ ...acc, [key]: 0 }),
        {} as Record<string, number>
    );

    const severityDistribution = Object.values(ERROR_SEVERITY_enum).reduce(
        (acc, key) => ({ ...acc, [key]: 0 }),
        {} as Record<string, number>
    );

    const strategyDistribution = Object.values(RecoveryStrategyType).reduce(
        (acc, key) => ({ ...acc, [key]: 0 }),
        {} as Record<string, number>
    );

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
            diskIO: {
                read: 0,
                write: 0
            },
            networkUsage: {
                upload: 0,
                download: 0
            },
            timestamp: Date.now()
        },
        performance: {
            executionTime: {
                total: 0,
                average: 0,
                min: 0,
                max: 0
            },
            latency: {
                total: 0,
                average: 0,
                min: 0,
                max: 0
            },
            throughput: {
                operationsPerSecond: 0,
                dataProcessedPerSecond: 0
            },
            responseTime: {
                total: 0,
                average: 0,
                min: 0,
                max: 0
            },
            queueLength: 0,
            errorRate: 0,
            successRate: 1,
            errorMetrics: {
                totalErrors: 0,
                errorRate: 0,
                errorDistribution,
                severityDistribution,
                patterns: [],
                impact: {
                    severity: ERROR_SEVERITY_enum.ERROR,
                    businessImpact: 0,
                    userExperienceImpact: 0,
                    systemStabilityImpact: 0,
                    resourceImpact: {
                        cpu: 0,
                        memory: 0,
                        io: 0
                    }
                },
                recovery: {
                    meanTimeToRecover: 0,
                    recoverySuccessRate: 0,
                    strategyDistribution,
                    failedRecoveries: 0
                },
                prevention: {
                    preventedCount: 0,
                    preventionRate: 0,
                    earlyWarnings: 0
                },
                trends: {
                    dailyRates: [],
                    weeklyRates: [],
                    monthlyRates: []
                }
            },
            resourceUtilization: {
                cpuUsage: 0,
                memoryUsage: 0,
                diskIO: {
                    read: 0,
                    write: 0
                },
                networkUsage: {
                    upload: 0,
                    download: 0
                },
                timestamp: Date.now()
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
}
