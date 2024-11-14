/**
 * @file LogManager.ts
 * @path KaibanJS/src/utils/managers/core/LogManager.ts
 * @description Manages logging operations
 *
 * @module @core
 */
import { logger } from '@/utils/core/logger';
import type { Log } from '@/utils/types/team/logs';
import { LogLevel } from '@/utils/types/common/enums';

// ─── Log Manager ───────────────────────────────────────────────────────────────

export class LogManager {
  private static instance: LogManager;
  private state: unknown;

  private constructor() {
    this.state = {};
  }

  public static getInstance(): LogManager {
    if (!LogManager.instance) {
      LogManager.instance = new LogManager();
    }
    return LogManager.instance;
  }

  // ─── Public Methods ───────────────────────────────────────────────────────────

  /**
   * Log a message
   * @param level - The log level
   * @param message - The message to log
   * @param agentName - The name of the agent logging the message
   * @param taskId - The ID of the task being logged
   * @param error - An optional error object
   */
  public log(
    level: LogLevel,
    message: string,
    agentName: string | null,
    taskId: string,
    error?: Error,
  ): void {
    const log: Log = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      level,
      message,
      agentName: agentName || 'Unknown Agent',
      taskId,
      meta: error ? {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      } : undefined,
    };

    logger.log(log);
  }

  /**
   * Log a debug message
   * @param message - The message to log
   * @param agentName - The name of the agent logging the message
   * @param taskId - The ID of the task being logged
   */
  public debug(message: string, agentName: string | null, taskId: string): void {
    this.log(LogLevel.DEBUG, message, agentName, taskId);
  }

  /**
   * Log an info message
   * @param message - The message to log
   * @param agentName - The name of the agent logging the message
   * @param taskId - The ID of the task being logged
   */
  public info(message: string, agentName: string | null, taskId: string): void {
    this.log(LogLevel.INFO, message, agentName, taskId);
  }

  /**
   * Log a warning message
   * @param message - The message to log
   * @param agentName - The name of the agent logging the message
   * @param taskId - The ID of the task being logged
   */
  public warn(message: string, agentName: string | null, taskId: string): void {
    this.log(LogLevel.WARN, message, agentName, taskId);
  }

  /**
   * Log an error message
   * @param message - The message to log
   * @param agentName - The name of the agent logging the message
   * @param taskId - The ID of the task being logged
   * @param error - An optional error object
   */
  public error(message: string, agentName: string | null, taskId: string, error?: Error): void {
    this.log(LogLevel.ERROR, message, agentName, taskId, error);
  }

  public getState(): unknown {
    return this.state;
  }

  public setState(fn: (state: unknown) => unknown): void {
    this.state = fn(this.state);
  }

  public prepareNewLog(params: unknown): unknown {
    // Placeholder implementation
    return params;
  }
}
