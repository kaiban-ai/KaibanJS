import pino from 'pino';

/**
 * Centralized logger configuration for the application
 */
const isProd = process.env.NODE_ENV === 'production';
const logLevel =
  (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info';

/**
 * Creates a standardized Pino logger instance with consistent configuration
 * @param name - The name identifier for the logger component
 * @returns Configured Pino logger instance
 */
export function createLogger(name: string): pino.Logger {
  if (isProd) {
    // Production: Compact JSON format for efficient logging
    return pino({
      name,
      level: logLevel,
    });
  } else {
    // Development: Use pino-pretty for readable logs
    return pino({
      name,
      level: logLevel,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss dd/mm/yyyy',
          ignore: 'pid,hostname',
          singleLine: false,
        },
      },
    });
  }
}

// Export the factory function as default
export default createLogger;
