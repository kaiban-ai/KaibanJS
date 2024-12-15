/**
 * @file errorTypes.ts
 * @path src/types/common/errorTypes.ts
 * @description Consolidated error type definitions including base errors, recovery strategies, and retry mechanisms
 */

import { IErrorMetrics } from '../metrics/base/performanceMetrics';
import { ISystemHealthMetrics } from '../metrics/base/enhancedMetricsTypes';
import { IErrorMetadata } from './metadataTypes';
import { createBaseMetadata } from './baseTypes';
import { ERROR_SEVERITY_enum } from './enumTypes';

// ─── Error Kinds ────────────────────────────────────────────────────────────

export const ERROR_KINDS = {
    ValidationError: 'ValidationError',
    ExecutionError: 'ExecutionError',
    InitializationError: 'InitializationError',
    StateError: 'StateError',
    CognitiveError: 'CognitiveError',
    NetworkError: 'NetworkError',
    ResourceError: 'ResourceError',
    ConfigurationError: 'ConfigurationError',
    AuthenticationError: 'AuthenticationError',
    PermissionError: 'PermissionError',
    NotFoundError: 'NotFoundError',
    TimeoutError: 'TimeoutError',
    RateLimitError: 'RateLimitError',
    SystemError: 'SystemError',
    TaskError: 'TaskError',
    AgentError: 'AgentError',
    LockError: 'LockError',
    StorageError: 'StorageError',
    CircuitBreakerError: 'CircuitBreakerError',
    UnknownError: 'UnknownError'
} as const;

export type IErrorKind = typeof ERROR_KINDS[keyof typeof ERROR_KINDS];
export type IErrorSeverity = keyof typeof ERROR_SEVERITY_enum;

// ─── Base Error Types ────────────────────────────────────────────────────────

export interface IBaseError {
    name: string;
    message: string;
    type: IErrorKind;
    severity?: IErrorSeverity;
    metadata?: IErrorMetadata;
    context?: Record<string, unknown>;
    cause?: Error;
    metrics?: IErrorMetrics;
    systemHealth?: ISystemHealthMetrics;
}

export interface IErrorType extends IBaseError {
    metadata?: IErrorMetadata;
    context?: Record<string, unknown>;
}

export interface IErrorContext extends Record<string, unknown> {
    component: string;
    operation?: string;
    details?: Record<string, unknown>;
    timestamp?: number;
    error: Error;
    severity?: IErrorSeverity;
    recoverable: boolean;
    retryCount: number;
    failureReason: string;
    recommendedAction: string;
    metrics?: IErrorMetrics;
    systemHealth?: ISystemHealthMetrics;
    [key: string]: unknown;
}

export interface IBaseErrorHandlerParams {
    error: Error | IErrorType;
    context?: IErrorContext;
    type?: IErrorKind;
    severity?: IErrorSeverity;
}

// ─── Error Recovery Types ────────────────────────────────────────────────────

export interface IRetryConfig {
    maxRetries: number;
    initialDelay: number;
    backoffFactor: number;
}

export interface ICircuitBreakerConfig {
    failureThreshold: number;
    resetTimeout: number;
    failures: Map<string, number>;
    lastFailure: Map<string, number>;
}

export interface IErrorRecoveryConfig {
    retry?: IRetryConfig;
    circuitBreaker?: ICircuitBreakerConfig;
    fallbackHandler?: (error: IBaseError) => Promise<void>;
}

export interface IErrorTrendData {
    errorType: IErrorKind;
    count: number;
    firstOccurrence: number;
    lastOccurrence: number;
    frequency: number; // errors per minute
    impactLevel: 'low' | 'medium' | 'high';
    affectedComponents: Set<string>;
    metrics?: IErrorMetrics;
}

export interface IErrorImpact {
    severity: 'low' | 'medium' | 'high';
    scope: 'isolated' | 'component' | 'system';
    userImpact: boolean;
    resourceImpact: {
        cpu: number;
        memory: number;
        io: number;
    };
    recoveryTime: number; // estimated time in ms
    metrics?: IErrorMetrics;
    systemHealth?: ISystemHealthMetrics;
}

export interface IErrorRecoveryResult {
    success: boolean;
    strategy: 'retry' | 'circuitBreaker' | 'fallback' | 'none';
    attempts: number;
    duration: number;
    error?: IBaseError;
    metrics?: IErrorMetrics;
    systemHealth?: ISystemHealthMetrics;
}

export interface IErrorAggregation {
    totalErrors: number;
    errorsByType: Map<IErrorKind, number>;
    errorsByComponent: Map<string, number>;
    trends: Map<IErrorKind, IErrorTrendData>;
    impacts: Map<IErrorKind, IErrorImpact>;
    timestamp: number;
    metrics?: IErrorMetrics;
    systemHealth?: ISystemHealthMetrics;
}

export interface IErrorRecoveryHandler {
    canHandle(error: IBaseError): boolean;
    handle(error: IBaseError, context: string): Promise<IErrorRecoveryResult>;
    getConfig(): IErrorRecoveryConfig;
    updateConfig(config: Partial<IErrorRecoveryConfig>): void;
}

// ─── Default Configurations ────────────────────────────────────────────────────

export const DEFAULT_RETRY_CONFIG: IRetryConfig = {
    maxRetries: 3,
    initialDelay: 1000,
    backoffFactor: 1.5
};

export const DEFAULT_CIRCUIT_BREAKER_CONFIG: ICircuitBreakerConfig = {
    failureThreshold: 5,
    resetTimeout: 60000,
    failures: new Map(),
    lastFailure: new Map()
};

export const DEFAULT_ERROR_RECOVERY_CONFIG: IErrorRecoveryConfig = {
    retry: DEFAULT_RETRY_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG
};

// ─── Error Classes ────────────────────────────────────────────────────────────

export class BaseError extends Error implements IBaseError {
    public readonly type: IErrorKind;
    public readonly severity?: IErrorSeverity;
    public readonly metadata?: IErrorMetadata;
    public readonly context?: Record<string, unknown>;
    public readonly cause?: Error;
    public readonly metrics?: IErrorMetrics;
    public readonly systemHealth?: ISystemHealthMetrics;

    constructor(params: {
        message: string;
        type: IErrorKind;
        severity?: IErrorSeverity;
        metadata?: IErrorMetadata;
        context?: Record<string, unknown>;
        cause?: Error;
        metrics?: IErrorMetrics;
        systemHealth?: ISystemHealthMetrics;
    }) {
        super(params.message);
        this.name = 'BaseError';
        this.type = params.type;
        this.severity = params.severity;
        this.metadata = params.metadata;
        this.context = params.context;
        this.cause = params.cause;
        this.metrics = params.metrics;
        this.systemHealth = params.systemHealth;
    }
}

// ─── Utility Functions ────────────────────────────────────────────────────────

export const createError = (params: {
    message: string;
    type: IErrorKind;
    severity?: IErrorSeverity;
    metadata?: IErrorMetadata;
    context?: Record<string, unknown>;
    cause?: Error;
    metrics?: IErrorMetrics;
    systemHealth?: ISystemHealthMetrics;
}): IErrorType => ({
    name: params.type,
    message: params.message,
    type: params.type,
    severity: params.severity,
    metadata: params.metadata,
    context: params.context,
    cause: params.cause,
    metrics: params.metrics,
    systemHealth: params.systemHealth
});

export const isErrorType = (error: unknown): error is IErrorType => {
    if (typeof error !== 'object' || error === null) return false;
    const err = error as Partial<IErrorType>;
    return (
        typeof err.message === 'string' &&
        typeof err.type === 'string' &&
        Object.values(ERROR_KINDS).includes(err.type as IErrorKind)
    );
};

export const isBaseError = (error: unknown): error is IBaseError => {
    if (typeof error !== 'object' || error === null) return false;
    const err = error as Partial<IBaseError>;
    return (
        typeof err.name === 'string' &&
        typeof err.message === 'string' &&
        typeof err.type === 'string' &&
        Object.values(ERROR_KINDS).includes(err.type as IErrorKind)
    );
};

export const toErrorType = (error: Error | unknown, type: IErrorKind = ERROR_KINDS.UnknownError): IErrorType => {
    if (isErrorType(error)) return error;
    if (error instanceof Error) {
        return {
            name: error.name,
            message: error.message,
            type,
            cause: error
        };
    }
    return {
        name: type,
        message: String(error),
        type
    };
};

export const createErrorMetadata = (params: {
    component: string;
    operation?: string;
    details?: Record<string, unknown>;
}): IErrorMetadata => {
    const baseMetadata = createBaseMetadata(params.component, params.operation || '');
    return {
        ...baseMetadata,
        error: {
            code: '',
            message: '',
            timestamp: Date.now(),
            stack: ''
        },
        timestamp: Date.now(),
        component: params.component,
        operation: params.operation || '',
        performance: baseMetadata.performance,
        context: baseMetadata.context,
        validation: baseMetadata.validation
    };
};

export const createErrorContext = (params: {
    component: string;
    operation?: string;
    details?: Record<string, unknown>;
    error: Error;
    severity?: IErrorSeverity;
    recoverable?: boolean;
    retryCount?: number;
    failureReason?: string;
    recommendedAction?: string;
    metrics?: IErrorMetrics;
    systemHealth?: ISystemHealthMetrics;
}): IErrorContext => ({
    component: params.component,
    operation: params.operation || '',
    details: params.details,
    timestamp: Date.now(),
    error: params.error,
    severity: params.severity,
    recoverable: params.recoverable ?? false,
    retryCount: params.retryCount ?? 0,
    failureReason: params.failureReason ?? 'Unknown error',
    recommendedAction: params.recommendedAction ?? 'Contact system administrator',
    metrics: params.metrics,
    systemHealth: params.systemHealth
});
