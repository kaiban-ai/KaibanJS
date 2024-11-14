/**
 * @file parsingErrors.ts
 * @path KaibanJS/src/utils/types/llm/parsingErrors.ts
 * @description Types for LLM output parsing errors and handlers
 */

import { AgentType } from "../agent/base";
import { TaskType } from "../task/base";
import { Output } from "./responses";

// Parameters for parsing error handling
export interface ParsingHandlerParams {
    agent: AgentType;
    task: TaskType;
    output: Output;
    llmOutput: string;
}

// Enhanced parsing error handler parameters with metadata
export interface ParseErrorHandlerParams extends ParsingHandlerParams {
    error?: Error;
    context?: {
        expectedFormat?: string;
        failurePoint?: string;
        partialResult?: unknown;
    };
}

// Parsing result with validation
export interface ParsingResult {
    success: boolean;
    data?: Record<string, unknown>;
    error?: Error;
    validationIssues?: string[];
}
