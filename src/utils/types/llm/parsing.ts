/**
 * @file parsing.ts
 * @path KaibanJS/src/utils/types/llm/parsing.ts
 * @description Centralized LLM parsing types and interfaces
 */

import { Output } from './responses';
import { AgentType } from '../agent/base';
import { TaskType } from '../task/base';
import { AGENT_STATUS_enum } from '../common/enums';

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
 * Output processing result
 */
export interface OutputProcessResult {
    actionType: keyof typeof AGENT_STATUS_enum;
    parsedOutput: ParsedOutput | null;
    feedback: string;
    shouldContinue: boolean;
}

/**
 * Output validation result
 */
export interface OutputValidationResult {
    isValid: boolean;
    error?: Error;
    context?: Record<string, unknown>;
}

/**
 * Parsed output structure
 */
export interface ParsedOutput {
    thought?: string;
    action?: string;
    actionInput?: Record<string, unknown>;
    observation?: string;
    isFinalAnswerReady?: boolean;
    finalAnswer?: string | Record<string, unknown>;
    metadata?: {
        reasoning?: string;
        confidence?: number;
        alternativeActions?: string[];
        metrics?: {
            processingTime?: number;
            tokenCount?: number;
            memoryUsage?: number;
        };
        context?: {
            inputContextLength?: number;
            keyFactors?: string[];
            constraints?: string[];
        };
    };
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
