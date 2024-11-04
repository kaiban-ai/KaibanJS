/**
 * @file parsingErrors.ts
 * @path src/utils/types/llm/parsingErrors.ts
 * @description Types for LLM output parsing errors and handlers
 */

import { AgentType } from "../agent/base";
import { TaskType } from "../task/base";
import { Output } from "./responses";

/**
 * Parameters for parsing error handling
 */
export interface ParsingHandlerParams {
    /** Agent instance handling the parsing */
    agent: AgentType;
    
    /** Task being processed */
    task: TaskType;
    
    /** Raw output that failed parsing */
    output: Output;
    
    /** Raw LLM output string */
    llmOutput: string;
}

/**
 * Enhanced parsing error handler parameters with metadata
 */
export interface ParseErrorHandlerParams extends ParsingHandlerParams {
    /** Error details if available */
    error?: Error;
    
    /** Parsing context */
    context?: {
        /** Attempted parse format */
        expectedFormat?: string;
        
        /** Failed parsing location */
        failurePoint?: string;
        
        /** Partial parsed result if any */
        partialResult?: unknown;
    };
}

/**
 * Parsing result with validation
 */
export interface ParsingResult {
    /** Whether parsing was successful */
    success: boolean;
    
    /** Parsed data if successful */
    data?: Record<string, unknown>;
    
    /** Error details if parsing failed */
    error?: Error;
    
    /** Validation issues if any */
    validationIssues?: string[];
}