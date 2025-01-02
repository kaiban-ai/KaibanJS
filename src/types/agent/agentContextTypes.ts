/**
 * @file agentContextTypes.ts
 * @path src/types/agent/agentContextTypes.ts
 * @description Agent context type definitions
 */

import type { IBaseMetrics } from '../metrics/base/baseMetrics';
import type { IBaseHandlerMetadata } from '../common/baseTypes';

/**
 * Agent context interface
 */
export interface IAgentContext {
    readonly id: string;
    readonly timestamp: number;
    readonly metrics: IBaseMetrics;
    readonly metadata: IBaseHandlerMetadata;
    readonly environment?: Record<string, unknown>;
    readonly state?: Record<string, unknown>;
}

/**
 * Agent context validation interface
 */
export interface IAgentContextValidation {
    readonly isValid: boolean;
    readonly errors: string[];
    readonly warnings: string[];
}

/**
 * Agent context factory interface
 */
export interface IAgentContextFactory {
    createContext(params: Record<string, unknown>): IAgentContext;
    validateContext(context: IAgentContext): IAgentContextValidation;
}
