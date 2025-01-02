/**
 * @file messageErrorTypes.ts
 * @path KaibanJS/src/types/llm/message/messageErrorTypes.ts
 * @description Message error type definitions for LLM domain
 */

import { MESSAGE_ERROR_TYPE_enum } from '../../common/enumTypes';
import { ERROR_KINDS, type IErrorKind } from '../../common/errorTypes';
import { createValidationResult } from '../../common/validationTypes';
import type { IValidationResult } from '../../common/validationTypes';

// ─── Message Error Categories ────────────────────────────────────────────────────

export enum MessageErrorCategory {
    Queue = 'QUEUE',
    Buffer = 'BUFFER',
    Delivery = 'DELIVERY',
    Network = 'NETWORK',
    RateLimit = 'RATE_LIMIT',
    Validation = 'VALIDATION'
}

// ─── Message Error Metrics ────────────────────────────────────────────────────

export interface IMessageLatencyMetrics {
    readonly queueLatency: number;
    readonly processingLatency: number;
    readonly deliveryLatency: number;
    readonly throughput: number;
}

export interface IMessageErrorCounts {
    readonly [MessageErrorCategory.Queue]: number;
    readonly [MessageErrorCategory.Buffer]: number;
    readonly [MessageErrorCategory.Delivery]: number;
    readonly [MessageErrorCategory.Network]: number;
    readonly [MessageErrorCategory.RateLimit]: number;
    readonly [MessageErrorCategory.Validation]: number;
}

export interface IMessageTimingMetrics {
    readonly meanTimeBetweenErrors: {
        readonly [K in MessageErrorCategory]: number;
    };
}

export interface IMessageErrorMetrics {
    readonly messageMetrics: {
        readonly errorCounts: IMessageErrorCounts;
        readonly latencies: IMessageLatencyMetrics;
        readonly timing: IMessageTimingMetrics;
    };
}

// ─── Error Details ───────────────────────────────────────────────────────────────

export interface IMessageErrorDetails {
    type: MESSAGE_ERROR_TYPE_enum;
    systemType: IErrorKind;
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
    validationErrors?: string[];
    stackTrace?: string;
    metrics?: IMessageErrorMetrics;
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
    getErrorMetrics: () => IMessageErrorMetrics;
}

// ─── Type Guards ────────────────────────────────────────────────────────────

export const MessageErrorTypeGuards = {
    isMessageErrorMetrics(metrics: unknown): metrics is IMessageErrorMetrics {
        if (!metrics || typeof metrics !== 'object') return false;
        const m = metrics as Partial<IMessageErrorMetrics>;

        // Check message metrics
        if (!m.messageMetrics || typeof m.messageMetrics !== 'object') return false;
        const msgMetrics = m.messageMetrics;

        // Check error counts
        const errorCounts = msgMetrics.errorCounts;
        if (!errorCounts || typeof errorCounts !== 'object') return false;
        for (const category of Object.values(MessageErrorCategory)) {
            if (typeof errorCounts[category] !== 'number') return false;
        }

        // Check latencies
        const latencies = msgMetrics.latencies;
        if (
            !latencies ||
            typeof latencies !== 'object' ||
            typeof latencies.queueLatency !== 'number' ||
            typeof latencies.processingLatency !== 'number' ||
            typeof latencies.deliveryLatency !== 'number' ||
            typeof latencies.throughput !== 'number'
        ) {
            return false;
        }

        // Check timing metrics
        const timing = msgMetrics.timing;
        if (!timing || typeof timing !== 'object') return false;
        const mtbe = timing.meanTimeBetweenErrors;
        if (!mtbe || typeof mtbe !== 'object') return false;
        for (const category of Object.values(MessageErrorCategory)) {
            if (typeof mtbe[category] !== 'number') return false;
        }

        return true;
    },

    isMessageErrorDetails(error: unknown): error is IMessageErrorDetails {
        if (!error || typeof error !== 'object') return false;
        const err = error as Partial<IMessageErrorDetails>;

        return !!(
            typeof err.type === 'string' &&
            Object.values(MESSAGE_ERROR_TYPE_enum).includes(err.type) &&
            typeof err.systemType === 'string' &&
            err.systemType in ERROR_KINDS // Use 'in' operator for enum check
        );
    }
};

// ─── Validation Functions ────────────────────────────────────────────────────

export const MessageErrorValidation = {
    validateMessageErrorMetrics(metrics: unknown): IValidationResult {
        if (!MessageErrorTypeGuards.isMessageErrorMetrics(metrics)) {
            return createValidationResult({
                isValid: false,
                errors: ['Invalid message error metrics structure'],
                warnings: []
            });
        }

        const errors: string[] = [];
        const warnings: string[] = [];

        // Validate latencies
        const latencies = metrics.messageMetrics.latencies;
        if (latencies.queueLatency < 0) {
            errors.push('Queue latency cannot be negative');
        }
        if (latencies.processingLatency < 0) {
            errors.push('Processing latency cannot be negative');
        }
        if (latencies.deliveryLatency < 0) {
            errors.push('Delivery latency cannot be negative');
        }
        if (latencies.throughput < 0) {
            errors.push('Throughput cannot be negative');
        }

        // Validate mean time between errors
        const mtbe = metrics.messageMetrics.timing.meanTimeBetweenErrors;
        for (const category of Object.values(MessageErrorCategory)) {
            if (mtbe[category] < 0) {
                errors.push(`Mean time between errors for ${category} cannot be negative`);
            }
        }

        return createValidationResult({
            isValid: errors.length === 0,
            errors,
            warnings
        });
    },

    validateMessageErrorDetails(error: unknown): IValidationResult {
        if (!MessageErrorTypeGuards.isMessageErrorDetails(error)) {
            return createValidationResult({
                isValid: false,
                errors: ['Invalid message error details structure'],
                warnings: []
            });
        }

        const errors: string[] = [];
        const warnings: string[] = [];

        // Validate timestamp
        if (error.timestamp > Date.now()) {
            warnings.push('Error timestamp is in the future');
        }

        // Validate context if present
        if (error.context) {
            if (error.context.queueDepth !== undefined && error.context.queueDepth < 0) {
                errors.push('Queue depth cannot be negative');
            }
            if (error.context.bufferUtilization !== undefined && 
                (error.context.bufferUtilization < 0 || error.context.bufferUtilization > 1)) {
                errors.push('Buffer utilization must be between 0 and 1');
            }
            if (error.context.retryCount !== undefined && error.context.retryCount < 0) {
                errors.push('Retry count cannot be negative');
            }

            // Validate metrics if present
            if (error.context.metrics) {
                const metricsValidation = this.validateMessageErrorMetrics(error.context.metrics);
                errors.push(...metricsValidation.errors);
                warnings.push(...metricsValidation.warnings);
            }
        }

        return createValidationResult({
            isValid: errors.length === 0,
            errors,
            warnings
        });
    }
};

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
                case MESSAGE_ERROR_TYPE_enum.RATE_LIMIT_EXCEEDED:
                    return ERROR_KINDS.ResourceError;
                case MESSAGE_ERROR_TYPE_enum.VALIDATION_FAILURE:
                    return ERROR_KINDS.ValidationError;
                case MESSAGE_ERROR_TYPE_enum.NETWORK_ERROR:
                case MESSAGE_ERROR_TYPE_enum.CHANNEL_FAILURE:
                    return ERROR_KINDS.NetworkError;
                case MESSAGE_ERROR_TYPE_enum.DELIVERY_FAILURE:
                case MESSAGE_ERROR_TYPE_enum.PROCESSING_FAILURE:
                    return ERROR_KINDS.ExecutionError;
                case MESSAGE_ERROR_TYPE_enum.TIMEOUT:
                    return ERROR_KINDS.SystemError; // Map timeout to system error
                default:
                    return ERROR_KINDS.UnknownError;
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
