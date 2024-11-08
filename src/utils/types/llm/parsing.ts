/**
 * @file parsing.ts
 * @path src/utils/types/llm/parsing.ts
 * @description Centralized LLM parsing types and interfaces
 */

import { Output } from './responses';
import { AgentType } from '../agent/base';
import { TaskType } from '../task/base';

/**
 * Base parameters for LLM parsing operations
 */
export interface ParsingHandlerParams {
    agent: AgentType;
    task: TaskType;
    output: Output;
    llmOutput: string;
}

/**
 * Enhanced parsing error handler parameters
 */
export interface ParseErrorHandlerParams extends ParsingHandlerParams {
    error?: Error;
    context?: {
        expectedFormat?: string;
        failurePoint?: string;
        partialResult?: unknown;
    };
}

/**
 * Parsing result with validation
 */
export interface ParsingResult<T = unknown> {
    success: boolean;
    data?: T;
    error?: Error;
    validationIssues?: string[];
}

/**
 * Type guards for parsing types
 */
export const ParsingTypeGuards = {
    isParsingHandlerParams: (value: unknown): value is ParsingHandlerParams => {
        return (
            typeof value === 'object' &&
            value !== null &&
            'agent' in value &&
            'task' in value &&
            'output' in value &&
            'llmOutput' in value
        );
    },

    isParseErrorHandlerParams: (value: unknown): value is ParseErrorHandlerParams => {
        return (
            typeof value === 'object' &&
            value !== null &&
            isParsingHandlerParams(value) &&
            ('error' in value || 'context' in value)
        );
    }
};

function isParsingHandlerParams(value: unknown): value is ParsingHandlerParams {
    return (
        typeof value === 'object' &&
        value !== null &&
        'agent' in value &&
        'task' in value &&
        'output' in value &&
        'llmOutput' in value
    );
}