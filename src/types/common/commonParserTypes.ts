/** 
 * @file commonParserTypes.ts
 * @path KaibanJS/src/types/common/commonParserTypes.ts
 * @description Type definitions for parsing operations
 * 
 * @module types/common
 */

// ─── Parser Types ────────────────────────────────────────────────────────────

export interface IParsedJSON {
    thought?: string;
    action?: string;
    actionInput?: Record<string, unknown> | null;
    observation?: string;
    isFinalAnswerReady?: boolean;
    finalAnswer?: string;
    [key: string]: unknown;
}

export interface IParserConfig {
    attemptRecovery?: boolean;
    maxDepth?: number;
    allowNonStringProps?: boolean;
    sanitizers?: Array<(input: string) => string>;
}

export interface IParserResult<T> {
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
