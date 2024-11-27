/**
 * @file messageErrorTypes.ts
 * @path KaibanJS/src/types/llm/message/messageErrorTypes.ts
 * @description Message error type definitions for LLM domain
 * 
 * @module @types/llm/message
 */

import { ERROR_TYPE_enum, MESSAGE_ERROR_TYPE_enum } from '../../common/commonEnums';

// ─── Error Details ───────────────────────────────────────────────────────────────

export interface IMessageErrorDetails {
  type: MESSAGE_ERROR_TYPE_enum;
  systemType: ERROR_TYPE_enum;
  code: string;
  message: string;
  timestamp: number;
  context?: IMessageErrorContext;
}

// ─── Error Context ───────────────────────────────────────────────────────────────

export interface IMessageErrorContext {
  messageId?: string;
  queueDepth?: number;
  bufferUtilization?: number;
  channelStatus?: string;
  retryCount?: number;
  resourceMetrics?: IMessageErrorResourceMetrics;
  validationErrors?: string[];
  stackTrace?: string;
}

// ─── Error Resource Metrics ────────────────────────────────────────────────────────

export interface IMessageErrorResourceMetrics {
  cpu?: number;
  memory?: number;
  network?: number;
  diskUsage?: number;
  threadCount?: number;
}

// ─── Error Factory Types ─────────────────────────────────────────────────────────

export interface IMessageErrorFactory {
  createError: (
    type: MESSAGE_ERROR_TYPE_enum,
    message: string,
    context?: IMessageErrorContext
  ) => IMessageErrorDetails;
  createQueueOverflowError: (queueDepth: number, capacity: number) => IMessageErrorDetails;
  createBufferOverflowError: (utilization: number) => IMessageErrorDetails;
  createDeliveryError: (messageId: string, attempts: number) => IMessageErrorDetails;
  createRateLimitError: (messageId: string) => IMessageErrorDetails;
  createNetworkError: (messageId: string, details: string) => IMessageErrorDetails;
}

// ─── Error Handler Types ─────────────────────────────────────────────────────────

export interface IMessageErrorHandler {
  handleError: (error: IMessageErrorDetails) => Promise<void>;
  logError: (error: IMessageErrorDetails) => void;
  recoverFromError: (error: IMessageErrorDetails) => Promise<boolean>;
  getErrorMetrics: () => IMessageErrorMetrics;
}

// ─── Error Metrics Types ─────────────────────────────────────────────────────────

export interface IMessageErrorMetrics {
  totalErrors: number;
  errorsByType: Map<MESSAGE_ERROR_TYPE_enum, number>;
  errorsBySystemType: Map<ERROR_TYPE_enum, number>;
  recoveryAttempts: number;
  recoverySuccess: number;
  lastError?: IMessageErrorDetails;
  errorRate: number;
  meanTimeBetweenErrors: number;
}

// ─── Error Recovery Types ─────────────────────────────────────────────────────────

export interface IMessageErrorRecoveryStrategy {
  canRecover: (error: IMessageErrorDetails) => boolean;
  recover: (error: IMessageErrorDetails) => Promise<boolean>;
  maxAttempts: number;
  backoffStrategy: 'linear' | 'exponential' | 'fixed';
  timeout: number;
}

// ─── Factory Implementation ────────────────────────────────────────────────────────

export const MessageErrorFactory: IMessageErrorFactory = {
  createError: (
    type: MESSAGE_ERROR_TYPE_enum,
    message: string,
    context?: IMessageErrorContext
  ): IMessageErrorDetails => {
    const systemType = (() => {
      switch (type) {
        case MESSAGE_ERROR_TYPE_enum.QUEUE_OVERFLOW:
        case MESSAGE_ERROR_TYPE_enum.BUFFER_OVERFLOW:
        case MESSAGE_ERROR_TYPE_enum.RESOURCE_EXHAUSTED:
          return ERROR_TYPE_enum.RESOURCE;
        case MESSAGE_ERROR_TYPE_enum.VALIDATION_FAILURE:
          return ERROR_TYPE_enum.VALIDATION;
        case MESSAGE_ERROR_TYPE_enum.TIMEOUT:
          return ERROR_TYPE_enum.TIMEOUT;
        case MESSAGE_ERROR_TYPE_enum.NETWORK_ERROR:
        case MESSAGE_ERROR_TYPE_enum.CHANNEL_FAILURE:
          return ERROR_TYPE_enum.SYSTEM;
        default:
          return ERROR_TYPE_enum.EXECUTION;
      }
    })();

    return {
      type,
      systemType,
      code: `MSG_ERR_${type}`,
      message,
      timestamp: Date.now(),
      context
    };
  },

  createQueueOverflowError: (queueDepth: number, capacity: number): IMessageErrorDetails => 
    MessageErrorFactory.createError(
      MESSAGE_ERROR_TYPE_enum.QUEUE_OVERFLOW,
      `Message queue overflow: ${queueDepth}/${capacity}`,
      { queueDepth }
    ),

  createBufferOverflowError: (utilization: number): IMessageErrorDetails =>
    MessageErrorFactory.createError(
      MESSAGE_ERROR_TYPE_enum.BUFFER_OVERFLOW,
      `Buffer overflow: ${utilization * 100}% utilized`,
      { bufferUtilization: utilization }
    ),

  createDeliveryError: (messageId: string, attempts: number): IMessageErrorDetails =>
    MessageErrorFactory.createError(
      MESSAGE_ERROR_TYPE_enum.DELIVERY_FAILURE,
      `Message delivery failed after ${attempts} attempts`,
      { messageId, retryCount: attempts }
    ),

  createRateLimitError: (messageId: string): IMessageErrorDetails =>
    MessageErrorFactory.createError(
      MESSAGE_ERROR_TYPE_enum.RATE_LIMIT_EXCEEDED,
      'Rate limit exceeded',
      { messageId }
    ),

  createNetworkError: (messageId: string, details: string): IMessageErrorDetails =>
    MessageErrorFactory.createError(
      MESSAGE_ERROR_TYPE_enum.NETWORK_ERROR,
      `Network error: ${details}`,
      { messageId }
    )
};
