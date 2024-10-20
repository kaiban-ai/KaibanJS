/** 
 * C:\Users\pwalc\Documents\GroqEmailAssistant\KaibanJS\src\utils\logger.ts
 * Logging Utility.
 *
 * This file sets up and configures the logging system used across the KaibanJS library. It allows for setting log levels 
 * dynamically and provides a centralized logger that can be imported and used throughout the library.
 *
 * Usage:
 * Import this logger to add logging capabilities to any part of the application, facilitating debugging and tracking of 
 * application flow and state changes.
 */

import log from 'loglevel';

// Set initial log level
log.setLevel(log.levels.INFO);  // Default to 'info' level

/**
 * Dynamically sets the log level for the application.
 * 
 * @param {string} level - The log level to set ('trace', 'debug', 'info', 'warn', 'error', 'silent').
 */
const setLogLevel = (level: string): void => {
  const logLevel = level.toUpperCase() as keyof typeof log.levels;
  log.setLevel(log.levels[logLevel]);
};

export { log as logger, setLogLevel };
