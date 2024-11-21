/**
 * @file commonLogging.ts
 * @path KaibanJS\src\types\common\commonLogging.ts
 * @description Core logging types and interfaces
 * 
 * @module @types/common
 */

import { ILogLevel } from "./commonEnums";

// ─── Core Logging Types ────────────────────────────────────────────────────────

export interface ILoggerConfig {
    level?: ILogLevel;
    timestamp?: boolean;
    showLevel?: boolean;
    formatter?: (level: string, message: string) => string;
    serializer?: (obj: unknown) => string;
}

// ─── Formatting Types ─────────────────────────────────────────────────────────

export interface ILogFormattingOptions {
    timestamp?: boolean;
    colorize?: boolean;
    padLevels?: boolean;
    levelFormatter?: (level: string) => string;
    messageFormatter?: (message: unknown) => string;
}

// ─── Destination Types ────────────────────────────────────────────────────────

export interface ILogDestinationConfig {
    type: 'console' | 'file' | 'remote';
    level?: ILogLevel;
    format?: ILogFormattingOptions;
    options?: Record<string, unknown>;
}

// ─── Filter Types ───────────────────────────────────────────────────────────

export interface ILogFilterOptions {
    levels?: ILogLevel[];
    excludePatterns?: RegExp[];
    includePatterns?: RegExp[];
    contextFilter?: (context: Record<string, unknown>) => boolean;
}

// ─── Type Guard Functions ────────────────────────────────────────────────────

export function isLogLevel(level: unknown): level is ILogLevel {
    return typeof level === 'string' && 
           ['trace', 'debug', 'info', 'warn', 'error'].includes(level);
}

export function isLoggerConfig(config: unknown): config is ILoggerConfig {
    return typeof config === 'object' && 
           config !== null &&
           (!('level' in config) || typeof config.level === 'string');
}
