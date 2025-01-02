/**
 * @file errorHandlingTypes.ts
 * @description Agent-specific error handling type definitions
 */

import { ERROR_KINDS } from '../common/errorTypes';
import type { IErrorSeverity } from '../common/errorTypes';
import { ERROR_SEVERITY_enum } from '../common/enumTypes';
import type { 
    IAgentErrorDetails,
    IAgentErrorContext 
} from './agentErrorTypes';
import type { IErrorMetrics } from '../metrics/base/errorMetrics';

// ─── Agent Error Factory ────────────────────────────────────────────────────────

export interface IAgentErrorParams {
    message: string;
    severity?: IErrorSeverity;
    context: Partial<Omit<IAgentErrorContext, 'metrics'>> & { 
        agentId: string;
        metrics?: IErrorMetrics;
    };
    cause?: Error;
}

export const createAgentError = (params: IAgentErrorParams): IAgentErrorDetails => {
    const errorMetrics: IErrorMetrics = params.context.metrics || {
        count: 1,
        type: ERROR_KINDS.AgentError,
        severity: params.severity || ERROR_SEVERITY_enum.ERROR,
        timestamp: Date.now(),
        message: params.message
    };

    const context: IAgentErrorContext = {
        component: params.context.component || 'agent',
        operation: params.context.operation || 'unknown',
        error: params.cause || new Error(params.message),
        severity: params.severity || ERROR_SEVERITY_enum.ERROR,
        timestamp: Date.now(),
        retryCount: params.context.retryCount || 0,
        failureReason: params.context.failureReason || params.message,
        recommendedAction: params.context.recommendedAction || 'Check agent logs',
        metrics: errorMetrics,
        metadata: params.context.metadata
    };

    return {
        message: params.message,
        type: ERROR_KINDS.AgentError,
        severity: params.severity || ERROR_SEVERITY_enum.ERROR,
        context,
        timestamp: Date.now()
    };
};

// ─── Type Guards ────────────────────────────────────────────────────────────

export const isAgentError = (error: unknown): error is IAgentErrorDetails => {
    if (typeof error !== 'object' || error === null) return false;
    const err = error as Partial<IAgentErrorDetails>;
    return !!(
        err.type === ERROR_KINDS.AgentError &&
        typeof err.message === 'string' &&
        typeof err.context === 'object' &&
        typeof err.context?.component === 'string' &&
        typeof err.context?.operation === 'string'
    );
};

export type { IAgentErrorDetails, IAgentErrorContext };
