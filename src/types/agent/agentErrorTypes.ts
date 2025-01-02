/**
 * @file agentErrorTypes.ts
 * @path src/types/agent/agentErrorTypes.ts
 * @description Agent error type definitions
 */

import type { IErrorKind, IErrorSeverity } from '../common/errorTypes';
import type { IErrorMetrics } from '../metrics/base/errorMetrics';
import type { IBaseHandlerMetadata } from '../common/baseTypes';

/**
 * Agent error context interface
 */
export interface IAgentErrorContext {
    readonly component: string;
    readonly operation: string;
    readonly error: Error;
    readonly severity: IErrorSeverity;
    readonly timestamp: number;
    readonly retryCount: number;
    readonly failureReason: string;
    readonly recommendedAction: string;
    readonly metrics: IErrorMetrics;
    readonly metadata?: IBaseHandlerMetadata;
}

/**
 * Agent error details interface
 */
export interface IAgentErrorDetails {
    readonly message: string;
    readonly type: IErrorKind;
    readonly severity: IErrorSeverity;
    readonly context: IAgentErrorContext;
    readonly timestamp: number;
}

/**
 * Agent error validation interface
 */
export interface IAgentErrorValidation {
    readonly isValid: boolean;
    readonly errors: string[];
    readonly warnings: string[];
}

/**
 * Agent error factory interface
 */
export interface IAgentErrorFactory {
    createError(
        message: string,
        type: IErrorKind,
        context: IAgentErrorContext
    ): IAgentErrorDetails;
    validateError(error: IAgentErrorDetails): IAgentErrorValidation;
}
