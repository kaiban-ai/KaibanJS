/**
 * @file parser.ts
 * @path src/types/common/parser.ts
 * @description Type definitions for parsing operations
 */

/**
 * Core parsed output interface
 */
export interface ParsedJSON {
    /** Reasoning or thought process */
    thought?: string;
    
    /** Action to be taken */
    action?: string;
    
    /** Input parameters for the action */
    actionInput?: Record<string, any> | null;
    
    /** Observation from previous actions */
    observation?: string;
    
    /** Whether a final answer is ready */
    isFinalAnswerReady?: boolean;
    
    /** Final answer if ready */
    finalAnswer?: string;
    
    /** Additional properties */
    [key: string]: any;
}

/**
 * Parser configuration options
 */
export interface ParserConfig {
    /** Whether to attempt recovery of malformed JSON */
    attemptRecovery?: boolean;
    
    /** Maximum depth for nested objects */
    maxDepth?: number;
    
    /** Whether to allow non-string properties */
    allowNonStringProps?: boolean;
    
    /** Custom sanitization functions */
    sanitizers?: Array<(input: string) => string>;
}

/**
 * Parser result interface
 */
export interface ParserResult<T> {
    /** Whether parsing was successful */
    success: boolean;
    
    /** Parsed data if successful */
    data?: T;
    
    /** Error information if parsing failed */
    error?: {
        message: string;
        position?: number;
        context?: string;
    };
    
    /** Whether recovery was attempted */
    recoveryAttempted?: boolean;
    
    /** Original input that was parsed */
    originalInput?: string;
}