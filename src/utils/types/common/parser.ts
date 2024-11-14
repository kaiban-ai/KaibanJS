/** 
 * @file parser.ts
 * @path KaibanJS/src/types/common/parser.ts
 * @description Type definitions for parsing operations
 */

export interface ParsedJSON {
    thought?: string;
    action?: string;
    actionInput?: Record<string, any> | null;
    observation?: string;
    isFinalAnswerReady?: boolean;
    finalAnswer?: string;
    [key: string]: any;
}

export interface ParserConfig {
    attemptRecovery?: boolean;
    maxDepth?: number;
    allowNonStringProps?: boolean;
    sanitizers?: Array<(input: string) => string>;
}

export interface ParserResult<T> {
    success: boolean;
    data?: T;
    error?: {
        message: string;
        position?: number;
        context?: string;
    };
    recoveryAttempted?: boolean;
    originalInput?: string;
}
