/**
 * Custom Error Definitions.
 *
 * This module defines custom error classes for handling specific error scenarios within the KaibanJS library.
 * It includes errors for API invocation failures and more nuanced errors that provide detailed diagnostic information.
 *
 * @module errors
 */

/** Base type for error context data */
export type ErrorContext = Record<string, unknown>;

/** Configuration for creating a pretty error */
export type PrettyErrorConfig = {
  /** The main error message */
  message: string;
  /** The original error that caused this error */
  rootError?: Error | null;
  /** Suggested steps to resolve the error */
  recommendedAction?: string | null;
  /** Additional context about the error */
  context?: ErrorContext;
  /** Where the error occurred */
  location?: string;
  /** Type of error */
  type?: string;
  /** Name of the error */
  name?: string;
};

/**
 * Error thrown when LLM API invocation fails
 */
export class LLMInvocationError extends Error {
  /** Additional context about the error */
  public context: ErrorContext;
  /** The original error that caused this error */
  public originalError: Error | null;
  /** Suggested steps to resolve the error */
  public recommendedAction: string | null;

  constructor(
    message: string,
    originalError: Error | null = null,
    recommendedAction: string | null = null,
    context: ErrorContext = {}
  ) {
    super(message);
    this.name = 'LLMInvocationError';
    this.context = context;
    this.originalError = originalError;
    this.recommendedAction = recommendedAction;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Base error class with enhanced error reporting capabilities
 */
export class PrettyError extends Error {
  /** Type of error */
  public type: string;
  /** The original error that caused this error */
  public rootError: Error | null;
  /** Suggested steps to resolve the error */
  public recommendedAction: string | null;
  /** Additional context about the error */
  public context: ErrorContext;
  /** Where the error occurred */
  public location: string;
  /** Formatted error message */
  public prettyMessage: string;

  constructor({
    message,
    rootError = null,
    recommendedAction = null,
    context = {},
    location = '',
    type = 'Error',
    name = 'PrettyError',
  }: PrettyErrorConfig) {
    super(message);
    this.type = type;
    this.name = name;
    this.rootError = rootError;
    this.recommendedAction = recommendedAction;
    this.context = context;
    this.location = location;
    Error.captureStackTrace(this, this.constructor);
    this.prettyMessage = PrettyError.createPrettyMessage(
      name,
      message,
      rootError,
      recommendedAction
    );
  }

  /**
   * Creates a standardized error message incorporating all relevant information
   * @returns Formatted and informative error message
   */
  public static createPrettyMessage(
    name: string,
    message: string,
    rootError: Error | null,
    recommendedAction: string | null
  ): string {
    let msg = `${name}: ${message}\n`;

    if (rootError?.message) {
      msg += `Details: ${rootError.message}\n\n`;
    }

    if (recommendedAction) {
      msg += `Recommended Action: ${recommendedAction}\n`;
    }

    return msg;
  }
}

/**
 * Base class for operation abortion errors
 */
export class AbortError extends Error {
  constructor(message = 'Operation was aborted') {
    super(message);
    this.name = 'AbortError';
  }
}

/**
 * Error thrown when an operation is stopped
 */
export class StopAbortError extends AbortError {
  constructor(message = 'Operation was aborted and stopped') {
    super(message);
    this.name = 'StopAbortError';
  }
}

/**
 * Error thrown when an operation is paused
 */
export class PauseAbortError extends AbortError {
  constructor(message = 'Operation was aborted and paused') {
    super(message);
    this.name = 'PauseAbortError';
  }
}

/**
 * Error thrown when a workflow operation fails
 */
export class WorkflowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkflowError';
  }
}

export class AgentBlockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AgentBlockError';
  }
}

export class TaskBlockError extends Error {
  public blockReason: string;
  public blockedBy: string;
  public isAgentDecision: boolean;
  constructor(
    message: string,
    blockReason: string,
    blockedBy: string,
    isAgentDecision: boolean
  ) {
    super(message);
    this.name = 'TaskBlockError';
    this.blockReason = blockReason;
    this.blockedBy = blockedBy;
    this.isAgentDecision = isAgentDecision;
  }
}
