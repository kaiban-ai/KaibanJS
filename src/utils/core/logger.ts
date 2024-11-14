/**
 * @file logger.ts
 * @path KaibanJS/src/utils/core/logger.ts
 * @description Core logging implementation using LogManager
 */

import log from 'loglevel';
import { LogManager } from '../managers/core/LogManager';
import type { LogLevel, LoggerConfig } from '@/utils/types/common/logging';
import { isLogLevel, isLoggerConfig } from '@/utils/types/common/logging';

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

export function createLogger(name: string) {
    return {
        ...log.getLogger(name),
        error: (message: unknown, metadata?: Record<string, unknown>) => {
            const logEntry = LogManager.createMessageLog({
                role: 'system',
                content: String(message),
                metadata
            });
            log.error(logEntry.logDescription);
        },
        warn: (message: unknown, metadata?: Record<string, unknown>) => {
            const logEntry = LogManager.createMessageLog({
                role: 'system',
                content: String(message),
                metadata
            });
            log.warn(logEntry.logDescription);
        },
        info: (message: unknown, metadata?: Record<string, unknown>) => {
            const logEntry = LogManager.createMessageLog({
                role: 'system',
                content: String(message),
                metadata
            });
            log.info(logEntry.logDescription);
        }
    };
}

// Export configured logger
export const logger = createLogger('core');
