/**
 * @file handlers.ts
 * @path src/utils/types/agent/handlers.ts
 * @description Agent handler types and interfaces
 *
 * @module @types/agent
 */

import type { AgentType } from './base';
import type { TaskType } from '../task/base';
import type { Output, ParsedOutput } from '../llm/responses';
import type { ErrorType } from '../common/errors';

// ─── Handler Result Types ────────────────────────────────────────────────────────

/**
 * Generic handler result interface
 */
export interface HandlerResult<T = unknown> {
    success: boolean;
    error?: ErrorType;
    data?: T;
    metadata?: Record<string, unknown>;
}

// ─── Handler Parameter Types ──────────────────────────────────────────────────

/**
 * Error handler parameters
 */
export interface ErrorHandlerParams {
    agent: AgentType;
    task: TaskType;
    error: ErrorType;
    context?: Record<string, unknown>;
}

/**
 * Thinking handler parameters
 */
export interface ThinkingHandlerParams {
    agent: AgentType;
    task: TaskType;
    messages: any[];
    output?: Output;
}

/**
 * Tool handler parameters
 */
export interface ToolHandlerParams {
    agent: AgentType;
    task: TaskType;
    tool?: any;
    error: Error;
    toolName: string;
}

/**
 * Output handler parameters
 */
export interface OutputHandlerParams {
    agent: AgentType;
    task: TaskType;
    output: Output;
    type: 'thought' | 'observation' | 'finalAnswer' | 'selfQuestion' | 'weird';
}

/**
 * Status handler parameters
 */
export interface StatusHandlerParams {
    agent: AgentType;
    task: TaskType;
    status: string;
    metadata?: Record<string, unknown>;
}

// ─── Handler Type Guards ────────────────────────────────────────────────────────

export const HandlerTypeGuards = {
    /**
     * Check if value is handler result
     */
    isHandlerResult: <T>(value: unknown): value is HandlerResult<T> => {
        if (typeof value !== 'object' || value === null) return false;
        const result = value as Partial<HandlerResult<T>>;
        return typeof result.success === 'boolean';
    },

    /**
     * Check if value is error handler params
     */
    isErrorHandlerParams: (value: unknown): value is ErrorHandlerParams => {
        if (typeof value !== 'object' || value === null) return false;
        const params = value as Partial<ErrorHandlerParams>;
        return !!(params.agent && params.task && params.error);
    },

    /**
     * Check if value is thinking handler params
     */
    isThinkingHandlerParams: (value: unknown): value is ThinkingHandlerParams => {
        if (typeof value !== 'object' || value === null) return false;
        const params = value as Partial<ThinkingHandlerParams>;
        return !!(params.agent && params.task && Array.isArray(params.messages));
    }
};

// ─── Handler Creation Utilities ───────────────────────────────────────────────

/**
 * Create success handler result
 */
export const createSuccessResult = <T>(
    data?: T,
    metadata?: Record<string, unknown>
): HandlerResult<T> => ({
    success: true,
    data,
    metadata
});

/**
 * Create error handler result
 */
export const createErrorResult = (
    error: ErrorType,
    metadata?: Record<string, unknown>
): HandlerResult => ({
    success: false,
    error,
    metadata
});