/**
 * @file agentExecutionTypes.ts
 * @path src/types/agent/agentExecutionTypes.ts
 * @description Agent execution type definitions
 */

import type { IBaseMetrics } from '../metrics/base/baseMetrics';
import type { IBaseHandlerMetadata } from '../common/baseTypes';

/**
 * Agent execution context interface
 */
export interface IAgentExecutionContext {
    readonly id: string;
    readonly timestamp: number;
    readonly metrics: IBaseMetrics;
    readonly metadata: IBaseHandlerMetadata;
    readonly validationResult?: unknown;
    readonly environment?: Record<string, unknown>;
}

/**
 * Agent execution result interface
 */
export interface IAgentExecutionResult {
    readonly success: boolean;
    readonly data?: unknown;
    readonly error?: Error;
    readonly metrics: IBaseMetrics;
    readonly validationResult?: unknown;
    readonly duration: number;
}

/**
 * Agent execution options interface
 */
export interface IAgentExecutionOptions {
    readonly timeout?: number;
    readonly retryLimit?: number;
    readonly maxConcurrentOperations?: number;
    readonly validationRules?: Record<string, (value: unknown) => boolean>;
}

/**
 * Agent execution validation interface
 */
export interface IAgentExecutionValidation {
    readonly isValid: boolean;
    readonly errors: string[];
    readonly warnings: string[];
}

/**
 * Agent execution factory interface
 */
export interface IAgentExecutionFactory {
    createExecution(params: Record<string, unknown>): IAgentExecutionContext;
    validateExecution(execution: IAgentExecutionContext): IAgentExecutionValidation;
}
