/**
 * @file agentErrorTypes.ts
 * @path src/types/agent/agentErrorTypes.ts
 * @description Error handling types and utilities for agent operations
 *
 * @module @types/agent
 */

import { createValidationResult } from '@utils/validation/validationUtils';
import type { IValidationResult } from '../common/validationTypes';
import { 
    ERROR_KINDS,
    IBaseError,
    IErrorContext,
    createError,
    createErrorMetadata
} from '../common/errorTypes';
import { IErrorMetadata } from '../common/metadataTypes';
import { 
    IErrorMetrics,
    IPerformanceMetrics,
    IErrorPattern,
    IErrorImpact
} from '../metrics/base/performanceMetrics';
import { IResourceMetrics } from '../metrics/base/resourceMetrics';
import { ErrorMetricsValidation } from '../metrics/base/errorMetrics';

// ─── Agent Error Metrics ────────────────────────────────────────────────────

export interface IAgentErrorMetrics extends IErrorMetrics {
    performance: IPerformanceMetrics;
    resources: IResourceMetrics;
    cognitive?: {
        confidence: number;
        coherence: number;
        relevance: number;
    };
    agentSpecific: {
        toolErrors: Record<string, number>;
        phaseErrors: Record<string, number>;
        cognitivePatterns: IErrorPattern[];
        toolImpact: IErrorImpact;
        learningMetrics: {
            adaptationRate: number;
            recoveryEfficiency: number;
            patternRecognition: number;
        };
    };
}

// ─── Configuration Types ────────────────────────────────────────────────────

export interface IRetryConfig {
    maxRetries: number;
    backoffFactor: number;
    initialDelay: number;
}

export interface ICircuitBreakerConfig {
    failureThreshold: number;
    resetTimeout: number;
    failures: Map<string, number>;
    lastFailure: Map<string, number>;
}

export interface ICognitiveErrorConfig {
    confidenceThreshold: number;
    coherenceThreshold: number;
    adaptabilityThreshold: number;
    learningRate: number;
    maxCognitiveRetries: number;
}

// ─── Error Details Types ────────────────────────────────────────────────────

export interface IRetryDetails {
    retryCount: number;
    nextRetryDelay: number;
    maxRetries: number;
    operationKey: string;
}

export interface ICircuitBreakerDetails {
    failureCount: number;
    failureThreshold: number;
    resetTime: number;
    operationKey: string;
}

export interface ICognitiveErrorDetails extends Record<string, unknown> {
    confidence: number;
    coherence: number;
    adaptability: number;
    learningProgress: number;
    retryCount: number;
    lastAdjustment?: {
        type: 'confidence' | 'coherence' | 'adaptability';
        value: number;
        timestamp: number;
    };
}

// ─── Agent Error Types ────────────────────────────────────────────────────

export interface IAgentError extends Omit<IBaseError, 'metrics'> {
    agentId: string;
    taskId?: string;
    toolName?: string;
    iteration?: number;
    phase?: string;
    metrics?: IAgentErrorMetrics;
}

export interface IAgentErrorContext extends IErrorContext {
    agentState: {
        currentPhase: string;
        iterationCount: number;
        lastSuccessfulAction?: string;
        memory?: unknown;
        tools?: string[];
    };
    taskContext?: {
        objective: string;
        constraints?: string[];
        progress: number;
        dependencies?: string[];
    };
    toolContext?: {
        name: string;
        parameters?: Record<string, unknown>;
        lastUsage?: number;
        successRate?: number;
    };
}

// ─── Default Configurations ────────────────────────────────────────────────────

export const DEFAULT_RETRY_CONFIG: IRetryConfig = {
    maxRetries: 3,
    backoffFactor: 1.5,
    initialDelay: 1000
};

export const DEFAULT_CIRCUIT_BREAKER_CONFIG: ICircuitBreakerConfig = {
    failureThreshold: 5,
    resetTimeout: 60000,
    failures: new Map(),
    lastFailure: new Map()
};

export const DEFAULT_COGNITIVE_CONFIG: ICognitiveErrorConfig = {
    confidenceThreshold: 0.7,
    coherenceThreshold: 0.8,
    adaptabilityThreshold: 0.6,
    learningRate: 0.1,
    maxCognitiveRetries: 3
};

// ─── Error Creation Utilities ────────────────────────────────────────────────

export function createRetryError(
    message: string,
    retryCount: number,
    nextRetryDelay: number,
    operationKey: string,
    maxRetries: number,
    originalError?: Error
): IAgentError {
    const metadata = createErrorMetadata({
        component: 'AgenticLoopManager',
        operation: operationKey,
        details: {
            retryCount,
            nextRetryDelay,
            maxRetries,
            operationKey
        }
    });

    const baseError = createError({
        message,
        type: ERROR_KINDS.ExecutionError,
        metadata,
        context: {
            retryAttempt: retryCount,
            maxRetries,
            nextDelay: nextRetryDelay,
            originalError
        }
    });

    return {
        ...baseError,
        agentId: 'system'
    } as IAgentError;
}

export function createCircuitBreakerError(
    operationKey: string,
    failureCount: number,
    failureThreshold: number,
    resetTime: number
): IAgentError {
    const metadata = createErrorMetadata({
        component: 'AgenticLoopManager',
        operation: operationKey,
        details: {
            failureCount,
            failureThreshold,
            resetTime,
            operationKey
        }
    });

    const baseError = createError({
        message: `Circuit breaker open for operation: ${operationKey}`,
        type: ERROR_KINDS.ResourceError,
        metadata,
        context: {
            currentFailures: failureCount,
            threshold: failureThreshold,
            resetAt: new Date(resetTime).toISOString()
        }
    });

    return {
        ...baseError,
        agentId: 'system'
    } as IAgentError;
}

export function createCognitiveError(
    message: string,
    details: ICognitiveErrorDetails,
    agentId: string,
    taskId?: string
): IAgentError {
    const metadata = createErrorMetadata({
        component: 'AgenticLoopManager',
        operation: 'cognitive_processing',
        details: details as Record<string, unknown>
    });

    const baseError = createError({
        message,
        type: ERROR_KINDS.CognitiveError,
        metadata,
        context: {
            agentId,
            taskId,
            cognitiveState: {
                confidence: details.confidence,
                coherence: details.coherence,
                adaptability: details.adaptability
            },
            learningProgress: details.learningProgress,
            retryCount: details.retryCount
        }
    });

    return {
        ...baseError,
        agentId,
        taskId
    } as IAgentError;
}

// ─── Type Guards ────────────────────────────────────────────────────────────

export const AgentErrorTypeGuards = {
    isRetryDetails(details: unknown): details is IRetryDetails {
        if (!details || typeof details !== 'object') return false;
        const retryDetails = details as unknown as Partial<IRetryDetails>;
        
        return !!(
            typeof retryDetails.retryCount === 'number' &&
            typeof retryDetails.nextRetryDelay === 'number' &&
            typeof retryDetails.maxRetries === 'number' &&
            typeof retryDetails.operationKey === 'string'
        );
    },

    isCircuitBreakerDetails(details: unknown): details is ICircuitBreakerDetails {
        if (!details || typeof details !== 'object') return false;
        const cbDetails = details as unknown as Partial<ICircuitBreakerDetails>;
        
        return !!(
            typeof cbDetails.failureCount === 'number' &&
            typeof cbDetails.failureThreshold === 'number' &&
            typeof cbDetails.resetTime === 'number' &&
            typeof cbDetails.operationKey === 'string'
        );
    },

    isCognitiveErrorDetails(details: unknown): details is ICognitiveErrorDetails {
        if (!details || typeof details !== 'object') return false;
        const cogDetails = details as unknown as Partial<ICognitiveErrorDetails>;
        
        return !!(
            typeof cogDetails.confidence === 'number' &&
            typeof cogDetails.coherence === 'number' &&
            typeof cogDetails.adaptability === 'number' &&
            typeof cogDetails.learningProgress === 'number' &&
            typeof cogDetails.retryCount === 'number'
        );
    },

    isAgentError(error: unknown): error is IAgentError {
        if (!error || typeof error !== 'object') return false;
        const agentError = error as unknown as Partial<IAgentError>;
        
        return !!(
            typeof agentError.agentId === 'string' &&
            typeof agentError.message === 'string' &&
            typeof agentError.type === 'string' &&
            Object.values(ERROR_KINDS).includes(agentError.type as keyof typeof ERROR_KINDS)
        );
    },

    isAgentErrorMetrics(metrics: unknown): metrics is IAgentErrorMetrics {
        if (!metrics || typeof metrics !== 'object') return false;
        const agentMetrics = metrics as unknown as Partial<IAgentErrorMetrics>;

        // Early return if any required property is missing
        if (!agentMetrics.performance || !agentMetrics.resources || !agentMetrics.agentSpecific) {
            return false;
        }

        // Check agent-specific metrics
        const agentSpecific = agentMetrics.agentSpecific as unknown as Partial<IAgentErrorMetrics['agentSpecific']>;
        if (!agentSpecific.toolErrors || !agentSpecific.phaseErrors || 
            !agentSpecific.cognitivePatterns || !agentSpecific.toolImpact || 
            !agentSpecific.learningMetrics) {
            return false;
        }

        // Check learning metrics
        const learning = agentSpecific.learningMetrics as unknown as {
            adaptationRate?: number;
            recoveryEfficiency?: number;
            patternRecognition?: number;
        };

        return !!(
            typeof learning.adaptationRate === 'number' &&
            typeof learning.recoveryEfficiency === 'number' &&
            typeof learning.patternRecognition === 'number'
        );
    }
};

// ─── Validation Functions ────────────────────────────────────────────────────

export const AgentErrorValidation = {
    validateRetryDetails(details: unknown): IValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!AgentErrorTypeGuards.isRetryDetails(details)) {
            errors.push('Invalid retry details structure');
            return createValidationResult(false, errors);
        }

        if (details.retryCount > details.maxRetries) {
            errors.push('Retry count exceeds maximum retries');
        }

        if (details.nextRetryDelay < 0) {
            errors.push('Next retry delay cannot be negative');
        }

        return createValidationResult(errors.length === 0, errors, warnings);
    },

    validateCircuitBreakerDetails(details: unknown): IValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!AgentErrorTypeGuards.isCircuitBreakerDetails(details)) {
            errors.push('Invalid circuit breaker details structure');
            return createValidationResult(false, errors);
        }

        if (details.failureCount > details.failureThreshold) {
            errors.push('Failure count exceeds threshold');
        }

        if (details.resetTime < Date.now()) {
            warnings.push('Reset time is in the past');
        }

        return createValidationResult(errors.length === 0, errors, warnings);
    },

    validateCognitiveErrorDetails(details: unknown): IValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!AgentErrorTypeGuards.isCognitiveErrorDetails(details)) {
            errors.push('Invalid cognitive error details structure');
            return createValidationResult(false, errors);
        }

        // Validate thresholds
        if (details.confidence < 0 || details.confidence > 1) {
            errors.push('Confidence must be between 0 and 1');
        }

        if (details.coherence < 0 || details.coherence > 1) {
            errors.push('Coherence must be between 0 and 1');
        }

        if (details.adaptability < 0 || details.adaptability > 1) {
            errors.push('Adaptability must be between 0 and 1');
        }

        if (details.learningProgress < 0 || details.learningProgress > 1) {
            errors.push('Learning progress must be between 0 and 1');
        }

        // Validate last adjustment if present
        if (details.lastAdjustment) {
            if (!['confidence', 'coherence', 'adaptability'].includes(details.lastAdjustment.type)) {
                errors.push('Invalid adjustment type');
            }

            if (details.lastAdjustment.value < -1 || details.lastAdjustment.value > 1) {
                errors.push('Adjustment value must be between -1 and 1');
            }

            if (details.lastAdjustment.timestamp > Date.now()) {
                warnings.push('Adjustment timestamp is in the future');
            }
        }

        return createValidationResult(errors.length === 0, errors, warnings);
    },

    validateAgentErrorMetrics(metrics: unknown): IValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!AgentErrorTypeGuards.isAgentErrorMetrics(metrics)) {
            errors.push('Invalid agent error metrics structure');
            return createValidationResult(false, errors);
        }

        // Validate base error metrics
        const baseValidation = ErrorMetricsValidation.validateEnhancedErrorMetrics(metrics);
        errors.push(...baseValidation.errors);
        warnings.push(...baseValidation.warnings);

        // Validate cognitive metrics if present
        if (metrics.cognitive) {
            if (metrics.cognitive.confidence < 0 || metrics.cognitive.confidence > 1) {
                errors.push('Cognitive confidence must be between 0 and 1');
            }
            if (metrics.cognitive.coherence < 0 || metrics.cognitive.coherence > 1) {
                errors.push('Cognitive coherence must be between 0 and 1');
            }
            if (metrics.cognitive.relevance < 0 || metrics.cognitive.relevance > 1) {
                errors.push('Cognitive relevance must be between 0 and 1');
            }
        }

        // Validate agent-specific metrics
        const learning = metrics.agentSpecific.learningMetrics;
        if (learning.adaptationRate < 0 || learning.adaptationRate > 1) {
            errors.push('Adaptation rate must be between 0 and 1');
        }
        if (learning.recoveryEfficiency < 0 || learning.recoveryEfficiency > 1) {
            errors.push('Recovery efficiency must be between 0 and 1');
        }
        if (learning.patternRecognition < 0 || learning.patternRecognition > 1) {
            errors.push('Pattern recognition must be between 0 and 1');
        }

        // Validate tool errors distribution
        const totalToolErrors = Object.values(metrics.agentSpecific.toolErrors)
            .reduce<number>((sum, val) => sum + (val as number), 0);
        const totalPhaseErrors = Object.values(metrics.agentSpecific.phaseErrors)
            .reduce<number>((sum, val) => sum + (val as number), 0);

        if (totalToolErrors !== totalPhaseErrors) {
            warnings.push('Tool errors and phase errors totals do not match');
        }

        return createValidationResult(errors.length === 0, errors, warnings);
    },

    validateAgentError(error: unknown): IValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!AgentErrorTypeGuards.isAgentError(error)) {
            errors.push('Invalid agent error structure');
            return createValidationResult(false, errors);
        }

        // Validate metrics if present
        if ((error as IAgentError).metrics) {
            const metricsValidation = this.validateAgentErrorMetrics((error as IAgentError).metrics);
            errors.push(...metricsValidation.errors);
            warnings.push(...metricsValidation.warnings);
        }

        return createValidationResult(errors.length === 0, errors, warnings);
    }
};
