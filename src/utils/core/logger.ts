/**
 * @file logger.ts
 * @path C:\Users\pwalc\Documents\GroqEmailAssistant\KaibanJS\src\utils\core\logger.ts
 * @description Core logging implementation using LogManager
 */

import log from 'loglevel';
import { LogManager } from '../managers/core/logManager';
import type { LogLevel, LoggerConfig } from '../types/common/logging';
import { isLogLevel, isLoggerConfig } from '../types/common/logging';

// ─── Configuration ───────────────────────────────────────────────────────────

const DEFAULT_CONFIG: Required<LoggerConfig> = {
    level: 'info',
    timestamp: true,
    showLevel: true,
    formatter: (level: string, message: string) => 
        `[${new Date().toISOString()}] ${level.toUpperCase()}: ${message}`,
    serializer: (obj: unknown) => 
        typeof obj === 'object' ? JSON.stringify(obj, null, 2) : String(obj)
};

// ─── Logger Implementation ────────────────────────────────────────────────────

export function configureLogger(config: LoggerConfig = {}): void {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    if (!isLoggerConfig(finalConfig)) {
        throw new Error('Invalid logger configuration');
    }
    log.setLevel(finalConfig.level);
}

export function setLogLevel(level: LogLevel): void {
    if (!isLogLevel(level)) {
        throw new Error('Invalid log level');
    }
    log.setLevel(level);
}

// Get the LogManager instance
const logManager = LogManager.getInstance();

export function createLogger(name: string) {
    return {
        ...log.getLogger(name),
        error: (message: unknown, metadata?: Record<string, unknown>) => {
            // Create an error object if metadata is provided
            const error = metadata ? new Error(String(message)) : undefined;
            if (error && metadata) {
                Object.assign(error, metadata);
            }
            logManager.error(String(message), undefined, undefined, error);
            log.error(String(message));
        },
        warn: (message: unknown, metadata?: Record<string, unknown>) => {
            logManager.warn(String(message), undefined, undefined);
            log.warn(String(message));
        },
        info: (message: unknown, metadata?: Record<string, unknown>) => {
            logManager.info(String(message), undefined, undefined);
            log.info(String(message));
        }
    };
}

// Export configured logger
export const logger = createLogger('core');
