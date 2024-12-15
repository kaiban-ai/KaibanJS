/**
 * @file errorHandlingTypes.ts
 * @description Agent-specific error handling type definitions
 */

import { ERROR_KINDS } from '../common/errorTypes';
import type { 
    IErrorKind, 
    IErrorSeverity, 
    IBaseError
} from '../common/errorTypes';
import type { 
    ITimeMetrics, 
    IPerformanceMetrics 
} from '../metrics/base/performanceMetrics';
import type { IResourceMetrics } from '../metrics/base/resourceMetrics';
import type { ILLMUsageMetrics } from '../llm/llmMetricTypes';
import type { 
    RecoveryStrategyType, 
    RecoveryPhase 
} from '../common/recoveryTypes';
import { ERROR_SEVERITY_enum } from '../common/enumTypes';

// ─── Agent Error Context ────────────────────────────────────────────────────────

export interface IAgentErrorContext extends Record<string, unknown> {
    agentId: string;
    agentName: string;
    taskId?: string;
    operation: string;
    timestamp: number;
    subtype?: 'initialization' | 'execution' | 'cognitive' | 'resource' | 'task' | 'communication' | 'model' | 'tool' | 'validation' | 'state';
    metrics: {
        performance: IPerformanceMetrics;
        resources: IResourceMetrics;
        llm: ILLMUsageMetrics;
    };
    cognitive: {
        load: number;
        capacity: number;
        memoryUtilization: number;
        processingEfficiency: number;
        thinkingLatency: ITimeMetrics;
    };
    state: {
        currentPhase: string;
        iterationCount: number;
        lastSuccessfulOperation: string;
        lastSuccessfulTimestamp: number;
    };
    recovery?: {
        attempts: number;
        strategy: RecoveryStrategyType;
        phase: RecoveryPhase;
        lastAttemptTimestamp: number;
        resourceSnapshot: IResourceMetrics;
    };
    [key: string]: unknown;
}

// ─── Agent Error Types ────────────────────────────────────────────────────────

export interface IAgentError extends IBaseError {
    type: typeof ERROR_KINDS.AgentError;
    severity: IErrorSeverity;
    context: IAgentErrorContext;
    recovery?: {
        strategy: RecoveryStrategyType;
        maxAttempts: number;
        timeout: number;
        resourceThresholds: {
            maxCpuUsage: number;
            maxMemoryUsage: number;
            maxCognitiveLoad: number;
            maxNetworkUsage: number;
        };
    };
}

// ─── Agent Error Factory ────────────────────────────────────────────────────────

export interface IAgentErrorParams {
    message: string;
    subtype: IAgentErrorContext['subtype'];
    severity?: IErrorSeverity;
    context: Partial<IAgentErrorContext>;
    cause?: Error;
    recovery?: IAgentError['recovery'];
}

export const createAgentError = (params: IAgentErrorParams): IAgentError => ({
    name: ERROR_KINDS.AgentError,
    message: params.message,
    type: ERROR_KINDS.AgentError,
    severity: params.severity || ERROR_SEVERITY_enum.ERROR,
    context: {
        agentId: params.context.agentId || '',
        agentName: params.context.agentName || '',
        operation: params.context.operation || '',
        timestamp: params.context.timestamp || Date.now(),
        subtype: params.subtype,
        metrics: params.context.metrics || {
            performance: {} as IPerformanceMetrics,
            resources: {} as IResourceMetrics,
            llm: {} as ILLMUsageMetrics
        },
        cognitive: params.context.cognitive || {
            load: 0,
            capacity: 0,
            memoryUtilization: 0,
            processingEfficiency: 0,
            thinkingLatency: {} as ITimeMetrics
        },
        state: params.context.state || {
            currentPhase: '',
            iterationCount: 0,
            lastSuccessfulOperation: '',
            lastSuccessfulTimestamp: Date.now()
        },
        recovery: params.context.recovery
    },
    cause: params.cause,
    recovery: params.recovery
});

// ─── Type Guards ────────────────────────────────────────────────────────────

export const isAgentError = (error: unknown): error is IAgentError => {
    if (typeof error !== 'object' || error === null) return false;
    const err = error as Partial<IAgentError>;
    return !!(
        err.type === ERROR_KINDS.AgentError &&
        typeof err.message === 'string' &&
        typeof err.context === 'object' &&
        typeof err.context?.agentId === 'string' &&
        typeof err.context?.agentName === 'string'
    );
};

export const isAgentCognitiveError = (error: IAgentError): boolean => 
    error.context.subtype === 'cognitive' &&
    error.context.cognitive.load > error.context.cognitive.capacity;

export const isAgentResourceError = (error: IAgentError): boolean =>
    error.context.subtype === 'resource' &&
    (error.context.metrics.resources.cpuUsage > 0.9 ||
     error.context.metrics.resources.memoryUsage > 1e9);

export const isAgentRecoverable = (error: IAgentError): boolean =>
    error.recovery !== undefined &&
    error.context.recovery !== undefined &&
    error.context.recovery.attempts < (error.recovery.maxAttempts || 3);
