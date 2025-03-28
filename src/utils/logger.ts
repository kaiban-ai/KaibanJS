/**
 * Logging Utility.
 *
 * This module sets up and configures the logging system used across the KaibanJS library.
 * It provides a centralized logger that can be imported and used throughout the library,
 * with support for dynamic log level configuration.
 *
 * @module logger
 */

import log from 'loglevel';

/** Valid log levels for the application */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent';

// Set initial log level
log.setLevel(log.levels.INFO); // Default to 'info' level

/**
 * Sets the logging level for the application
 * @param level - The desired logging level
 */
export const setLogLevel = (level: LogLevel): void => {
  // Convert level to uppercase and explicitly type as keyof typeof log.levels
  const upperLevel = level.toUpperCase() as keyof typeof log.levels;
  log.setLevel(log.levels[upperLevel]);
};

/** The main logger instance */
export const logger = log;
