/**
 * @file logging.ts
 * @path C:\Users\pwalc\Documents\GroqEmailAssistant\KaibanJS\src\utils\types\common\logging.ts
 * @description Core logging types and interfaces
 */

// ─── Core Logging Types ────────────────────────────────────────────────────────

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error';

export interface LoggerConfig {
    level?: LogLevel;
    timestamp?: boolean;
    showLevel?: boolean;
    formatter?: (level: string, message: string) => string;
    serializer?: (obj: unknown) => string;
}

// ─── Formatting Types ─────────────────────────────────────────────────────────

export interface LogFormattingOptions {
    timestamp?: boolean;
    colorize?: boolean;
    padLevels?: boolean;
    levelFormatter?: (level: string) => string;
    messageFormatter?: (message: unknown) => string;
}

// ─── Destination Types ────────────────────────────────────────────────────────

export interface LogDestinationConfig {
    type: 'console' | 'file' | 'remote';
    level?: LogLevel;
    format?: LogFormattingOptions;
    options?: Record<string, unknown>;
}

// ─── Filter Types ───────────────────────────────────────────────────────────

export interface LogFilterOptions {
    levels?: LogLevel[];
    excludePatterns?: RegExp[];
    includePatterns?: RegExp[];
    contextFilter?: (context: Record<string, unknown>) => boolean;
}

// ─── Type Guard Functions ────────────────────────────────────────────────────

export function isLogLevel(level: unknown): level is LogLevel {
    return typeof level === 'string' && 
           ['trace', 'debug', 'info', 'warn', 'error'].includes(level);
}

export function isLoggerConfig(config: unknown): config is LoggerConfig {
    return typeof config === 'object' && 
           config !== null &&
           (!('level' in config) || typeof config.level === 'string');
}