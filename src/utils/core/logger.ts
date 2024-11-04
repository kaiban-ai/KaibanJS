/**
 * @file logger.ts
 * @path src/utils/core/logger.ts
 * @description Core logging implementation
 */

import log from 'loglevel';
import type { 
    LogLevel, 
    LoggerConfig,
    LogFormattingOptions,
    LogDestinationConfig,
    LogFilterOptions
} from '@/utils/types/common/logging';

/**
 * Default logger configuration
 */
const DEFAULT_CONFIG: Required<LoggerConfig> = {
    level: 'info',
    timestamp: true,
    showLevel: true,
    formatter: (level: string, message: string) => 
        `[${new Date().toISOString()}] ${level.toUpperCase()}: ${message}`,
    serializer: (obj: unknown) => 
        typeof obj === 'object' ? JSON.stringify(obj, null, 2) : String(obj)
};

/**
 * Configure the logger
 */
export function configureLogger(config: LoggerConfig = {}): void {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    
    // Set log level
    log.setLevel(finalConfig.level);

    // Override logging methods to add formatting
    const originalFactory = log.methodFactory;
    log.methodFactory = function (methodName, logLevel, loggerName) {
        const rawMethod = originalFactory(methodName, logLevel, loggerName);
        
        return function (message: unknown) {
            let formattedMessage = typeof message === 'string' 
                ? message 
                : finalConfig.serializer(message);

            if (finalConfig.showLevel) {
                formattedMessage = finalConfig.formatter(methodName, formattedMessage);
            }

            rawMethod(formattedMessage);
        };
    };

    log.setLevel(log.getLevel()); // Apply factory changes
}

/**
 * Set the log level
 */
export function setLogLevel(level: LogLevel): void {
    const logLevel = level.toUpperCase() as keyof typeof log.levels;
    log.setLevel(log.levels[logLevel]);
}

/**
 * Create a named logger instance
 */
export function createLogger(name: string) {
    return log.getLogger(name);
}

// Export configured logger
export const logger = log;

// Initial configuration
configureLogger();