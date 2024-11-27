/**
 * @file workflowHandlerTypes.ts
 * @path KaibanJS/src/types/workflow/workflowHandlerTypes.ts
 * @description Workflow handler type definitions with enhanced type safety and validation
 */

import type { IBaseHandlerMetadata, IBaseContextRequired } from '../common/commonMetadataTypes';
import type { IValidationResult } from '../common/commonValidationTypes';
import type { IWorkflowResourceMetrics, IWorkflowPerformanceMetrics, IWorkflowUsageMetrics } from './workflowMetricTypes';
import type { IErrorType } from '../common/commonErrorTypes';
import type { WORKFLOW_STATUS_enum } from '../common/commonEnums';
import type { ICostDetails } from './workflowTypes';
import type { ILLMUsageStats } from '../llm/llmResponseTypes';
import type { IPerformanceMetrics } from '../metrics/base/performanceMetrics';

/**
 * Extended context for workflow operations
 */
export interface IWorkflowContext extends IBaseContextRequired {
    readonly workflowId: string;
    readonly workflowName: string;
    readonly workflowType: string;
    readonly priority: number;
    readonly startTime: number;
    readonly parentWorkflowId?: string;
    readonly dependencies: ReadonlyArray<string>;
    readonly assignedAgents: ReadonlyArray<string>;
    readonly taskIds: ReadonlyArray<string>;
    [key: string]: unknown;
}

/**
 * Workflow execution state
 */
export interface IWorkflowExecutionState {
    readonly status: keyof typeof WORKFLOW_STATUS_enum;
    readonly currentStep: number;
    readonly totalSteps: number;
    readonly startTime: number;
    readonly lastUpdateTime: number;
    readonly completedTasks: ReadonlyArray<string>;
    readonly failedTasks: ReadonlyArray<string>;
    readonly pendingTasks: ReadonlyArray<string>;
    readonly errors: ReadonlyArray<IErrorType>;
}

/**
 * Workflow handler metadata interface
 */
export interface IWorkflowHandlerMetadata extends IBaseHandlerMetadata {
    readonly workflow: {
        readonly id: string;
        readonly name: string;
        readonly type: string;
        readonly version: string;
        readonly priority: number;
        readonly executionState: IWorkflowExecutionState;
        readonly metrics: {
            readonly resource: IWorkflowResourceMetrics;
            readonly performance: IWorkflowPerformanceMetrics;
            readonly usage: IWorkflowUsageMetrics;
        };
        readonly costDetails: ICostDetails;
        readonly llmUsageStats: ILLMUsageStats;
    };
    readonly context: IWorkflowContext;
    readonly validation: IValidationResult & {
        readonly stateValidation: IValidationResult;
        readonly metricValidation: IValidationResult;
        readonly contextValidation: IValidationResult;
    };
    readonly recovery: {
        readonly attempts: number;
        readonly lastAttempt: number;
        readonly strategy: string;
        readonly backoffDelay: number;
        readonly errors: ReadonlyArray<{
            readonly timestamp: number;
            readonly error: IErrorType;
            readonly recoveryAction: string;
            readonly successful: boolean;
        }>;
    };
    readonly performance: IPerformanceMetrics;
}

/**
 * Type guard for workflow handler metadata
 */
export const isWorkflowHandlerMetadata = (value: unknown): value is IWorkflowHandlerMetadata => {
    if (typeof value !== 'object' || value === null) return false;
    const metadata = value as Partial<IWorkflowHandlerMetadata>;

    return (
        typeof metadata.workflow === 'object' &&
        metadata.workflow !== null &&
        typeof metadata.workflow.id === 'string' &&
        typeof metadata.workflow.name === 'string' &&
        typeof metadata.workflow.type === 'string' &&
        typeof metadata.workflow.version === 'string' &&
        typeof metadata.workflow.priority === 'number' &&
        typeof metadata.workflow.executionState === 'object' &&
        metadata.workflow.executionState !== null &&
        typeof metadata.workflow.metrics === 'object' &&
        metadata.workflow.metrics !== null &&
        typeof metadata.context === 'object' &&
        metadata.context !== null &&
        typeof metadata.validation === 'object' &&
        metadata.validation !== null &&
        typeof metadata.recovery === 'object' &&
        metadata.recovery !== null &&
        typeof metadata.performance === 'object' &&
        metadata.performance !== null
    );
};

/**
 * Create default workflow handler metadata
 */
export const createWorkflowHandlerMetadata = (
    workflowId: string,
    workflowName: string,
    workflowType: string,
    component: string,
    operation: string
): IWorkflowHandlerMetadata => ({
    timestamp: Date.now(),
    component,
    operation,
    workflow: {
        id: workflowId,
        name: workflowName,
        type: workflowType,
        version: '1.0.0',
        priority: 0,
        executionState: {
            status: 'INITIAL',
            currentStep: 0,
            totalSteps: 0,
            startTime: Date.now(),
            lastUpdateTime: Date.now(),
            completedTasks: [],
            failedTasks: [],
            pendingTasks: [],
            errors: []
        },
        metrics: {
            resource: {
                cpuUsage: 0,
                memoryUsage: 0,
                diskIO: { read: 0, write: 0 },
                networkUsage: { upload: 0, download: 0 },
                concurrentWorkflows: 0,
                resourceAllocation: { cpu: 0, memory: 0 },
                timestamp: Date.now()
            },
            performance: {
                executionTime: { total: 0, average: 0, min: 0, max: 0 },
                latency: { total: 0, average: 0, min: 0, max: 0 },
                throughput: { operationsPerSecond: 0, dataProcessedPerSecond: 0 },
                responseTime: { total: 0, average: 0, min: 0, max: 0 },
                queueLength: 0,
                errorRate: 0,
                successRate: 0,
                errorMetrics: { totalErrors: 0, errorRate: 0 },
                resourceUtilization: {
                    cpuUsage: 0,
                    memoryUsage: 0,
                    diskIO: { read: 0, write: 0 },
                    networkUsage: { upload: 0, download: 0 },
                    concurrentWorkflows: 0,
                    resourceAllocation: { cpu: 0, memory: 0 },
                    timestamp: Date.now()
                },
                completionRate: 0,
                averageStepsPerWorkflow: 0,
                timestamp: Date.now()
            },
            usage: {
                totalRequests: 0,
                activeUsers: 0,
                requestsPerSecond: 0,
                averageResponseSize: 0,
                peakMemoryUsage: 0,
                uptime: 0,
                rateLimit: { current: 0, limit: 0, remaining: 0, resetTime: 0 },
                totalExecutions: 0,
                activeWorkflows: 0,
                workflowsPerSecond: 0,
                averageComplexity: 0,
                workflowDistribution: { sequential: 0, parallel: 0, conditional: 0 },
                timestamp: Date.now()
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
        },
        llmUsageStats: {
            inputTokens: 0,
            outputTokens: 0,
            callsCount: 0,
            callsErrorCount: 0,
            parsingErrors: 0,
            totalLatency: 0,
            averageLatency: 0,
            lastUsed: 0,
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
    context: {
        workflowId,
        workflowName,
        workflowType,
        priority: 0,
        startTime: Date.now(),
        dependencies: [],
        assignedAgents: [],
        taskIds: [],
        source: component,
        target: operation,
        correlationId: workflowId,
        causationId: workflowId
    },
    validation: {
        isValid: true,
        errors: [],
        warnings: [],
        metadata: {
            timestamp: Date.now(),
            duration: 0,
            validatorName: 'workflow'
        },
        stateValidation: {
            isValid: true,
            errors: [],
            warnings: [],
            metadata: {
                timestamp: Date.now(),
                duration: 0,
                validatorName: 'workflowState'
            }
        },
        metricValidation: {
            isValid: true,
            errors: [],
            warnings: [],
            metadata: {
                timestamp: Date.now(),
                duration: 0,
                validatorName: 'workflowMetrics'
            }
        },
        contextValidation: {
            isValid: true,
            errors: [],
            warnings: [],
            metadata: {
                timestamp: Date.now(),
                duration: 0,
                validatorName: 'workflowContext'
            }
        }
    },
    recovery: {
        attempts: 0,
        lastAttempt: 0,
        strategy: 'exponential-backoff',
        backoffDelay: 1000,
        errors: []
    },
    performance: {
        executionTime: { total: 0, average: 0, min: 0, max: 0 },
        latency: { total: 0, average: 0, min: 0, max: 0 },
        throughput: { operationsPerSecond: 0, dataProcessedPerSecond: 0 },
        responseTime: { total: 0, average: 0, min: 0, max: 0 },
        queueLength: 0,
        errorRate: 0,
        successRate: 0,
        errorMetrics: { totalErrors: 0, errorRate: 0 },
        resourceUtilization: {
            cpuUsage: 0,
            memoryUsage: 0,
            diskIO: { read: 0, write: 0 },
            networkUsage: { upload: 0, download: 0 },
            timestamp: Date.now()
        },
        timestamp: Date.now()
    }
});
