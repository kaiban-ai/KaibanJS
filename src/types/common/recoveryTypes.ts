/**
 * @file recoveryTypes.ts
 * @path src/types/common/recoveryTypes.ts
 * @description Type definitions for error recovery mechanisms and strategies
 */

import type { IBaseEvent, IBaseHandlerMetadata } from './baseTypes';
import type { 
    IBaseError, 
    IErrorContext, 
    IErrorKind, 
    IErrorSeverity,
    IErrorRecoveryConfig
} from './errorTypes';

// ================ Recovery Strategy Types ================

export enum RecoveryStrategyType {
    RETRY = 'RETRY',
    FALLBACK = 'FALLBACK',
    CIRCUIT_BREAKER = 'CIRCUIT_BREAKER',
    GRACEFUL_DEGRADATION = 'GRACEFUL_DEGRADATION',
    HUMAN_INTERVENTION = 'HUMAN_INTERVENTION',
    STATE_RESET = 'STATE_RESET',
    ROLLBACK = 'ROLLBACK',
    // Agent-specific strategies
    AGENT_RESTART = 'AGENT_RESTART',
    AGENT_REASSIGN = 'AGENT_REASSIGN',
    AGENT_FALLBACK_MODEL = 'AGENT_FALLBACK_MODEL'
}

export enum RecoveryPhase {
    INITIATED = 'INITIATED',
    ANALYZING = 'ANALYZING',
    PLANNING = 'PLANNING',
    EXECUTING = 'EXECUTING',
    VALIDATING = 'VALIDATING',
    SUCCEEDED = 'SUCCEEDED',
    FAILED = 'FAILED',
    ABANDONED = 'ABANDONED'
}

// ================ Recovery Context Types ================

export interface IRecoveryMetadata {
    component: string;
    operation?: string;
    previousState?: unknown;
    resourceUsage?: IResourceUsage;
    [key: string]: unknown;
}

export interface IResourceUsage {
    cpu: number;
    memory: number;
    io: number;
    networkLatency?: number;
    modelTokens?: number;
}

export interface IRecoveryContext {
    id: string;
    error: IBaseError;
    errorContext: IErrorContext;
    strategy: RecoveryStrategyType;
    phase: RecoveryPhase;
    startTime: number;
    lastAttemptTime?: number;
    attemptCount: number;
    maxAttempts: number;
    timeout: number;
    metadata: IRecoveryMetadata;
}

// ================ Recovery Strategy Configuration ================

export interface IRecoveryStrategyConfig {
    type: RecoveryStrategyType;
    enabled: boolean;
    maxAttempts: number;
    timeout: number;
    backoffFactor?: number;
    applicableErrors: IErrorKind[];
    applicableSeverities: IErrorSeverity[];
    requiresApproval: boolean;
    validateAfterRecovery: boolean;
    metadata?: Record<string, unknown>;
}

export interface IRetryStrategyConfig extends IRecoveryStrategyConfig {
    type: RecoveryStrategyType.RETRY;
    initialDelay: number;
    maxDelay: number;
    exponentialBackoff: boolean;
}

export interface ICircuitBreakerStrategyConfig extends IRecoveryStrategyConfig {
    type: RecoveryStrategyType.CIRCUIT_BREAKER;
    failureThreshold: number;
    resetTimeout: number;
    halfOpenRequests: number;
}

export interface IGracefulDegradationConfig extends IRecoveryStrategyConfig {
    type: RecoveryStrategyType.GRACEFUL_DEGRADATION;
    fallbackBehavior: string;
    degradationLevels: IDegradationLevel[];
}

export interface IDegradationLevel {
    level: number;
    conditions: string[];
    actions: string[];
}

export interface IAgentRecoveryConfig extends IRecoveryStrategyConfig {
    type: RecoveryStrategyType.AGENT_RESTART | RecoveryStrategyType.AGENT_REASSIGN | RecoveryStrategyType.AGENT_FALLBACK_MODEL;
    preserveState: boolean;
    fallbackModels?: string[];
    reassignmentRules?: IAgentReassignmentRule[];
}

export interface IAgentReassignmentRule {
    condition: string;
    targetAgentType: string;
    priority: number;
}

// ================ Recovery Strategy Implementation ================

export interface IRecoveryStrategy {
    readonly config: IRecoveryStrategyConfig;
    
    execute(context: IRecoveryContext): Promise<IRecoveryResult>;
    validate(error: IBaseError, context: IErrorContext): boolean;
    cleanup(context: IRecoveryContext): Promise<void>;
    reset(): Promise<void>;
    
    getMetrics(): IRecoveryMetrics;
    updateConfig(config: Partial<IRecoveryStrategyConfig>): void;
}

// ================ Recovery Results ================

export interface IRecoveryResult {
    successful: boolean;
    context: IRecoveryContext;
    duration: number;
    error?: Error;
    recoveredState?: unknown;
    metadata: IRecoveryResultMetadata;
}

export interface IRecoveryResultMetadata {
    strategy: RecoveryStrategyType;
    attempts: number;
    resourceUsage?: IResourceUsage;
    validationResult?: boolean;
    performanceImpact?: IPerformanceImpact;
    [key: string]: unknown;
}

export interface IPerformanceImpact {
    latencyIncrease: number;
    resourceOverhead: number;
    userExperienceScore: number;
}

// ================ Recovery Metrics ================

export interface IRecoveryMetrics {
    totalAttempts: number;
    successfulRecoveries: number;
    failedRecoveries: number;
    averageRecoveryTime: number;
    recoverySuccessRate: number;
    strategyMetrics: Record<RecoveryStrategyType, IStrategyMetrics>;
    timeBasedMetrics: ITimeBasedMetrics;
}

export interface IStrategyMetrics {
    attempts: number;
    successes: number;
    failures: number;
    averageTime: number;
    resourceUsage: IResourceUsage;
    errorPatterns?: IErrorPattern[];
}

export interface ITimeBasedMetrics {
    hourly: IMetricCount;
    daily: IMetricCount;
    weekly: IMetricCount;
}

export interface IMetricCount {
    attempts: number;
    successes: number;
    failures: number;
    averageResponseTime: number;
}

export interface IErrorPattern {
    pattern: string;
    frequency: number;
    lastOccurrence: number;
    associatedStrategies: RecoveryStrategyType[];
}

// ================ Recovery Events ================

export enum RecoveryEventType {
    RECOVERY_INITIATED = 'RECOVERY_INITIATED',
    RECOVERY_PHASE_CHANGED = 'RECOVERY_PHASE_CHANGED',
    RECOVERY_ATTEMPT_STARTED = 'RECOVERY_ATTEMPT_STARTED',
    RECOVERY_ATTEMPT_COMPLETED = 'RECOVERY_ATTEMPT_COMPLETED',
    RECOVERY_SUCCEEDED = 'RECOVERY_SUCCEEDED',
    RECOVERY_FAILED = 'RECOVERY_FAILED',
    RECOVERY_ABANDONED = 'RECOVERY_ABANDONED',
    STRATEGY_CHANGED = 'STRATEGY_CHANGED',
    METRICS_UPDATED = 'METRICS_UPDATED'
}

export interface IRecoveryEvent extends IBaseEvent {
    type: RecoveryEventType;
    context: IRecoveryContext;
}

export type IRecoveryEventListener = (event: IRecoveryEvent) => void;

// ================ Recovery Manager Configuration ================

export interface IRecoveryManagerConfig {
    enabled: boolean;
    defaultStrategy: RecoveryStrategyType;
    globalMaxAttempts: number;
    globalTimeout: number;
    metricsEnabled: boolean;
    autoApprovalEnabled: boolean;
    validateAfterRecovery: boolean;
    strategies: {
        [key in RecoveryStrategyType]?: IRecoveryStrategyConfig;
    };
    errorRecoveryConfig?: IErrorRecoveryConfig;
    metricCollectionConfig?: IMetricCollectionConfig;
}

export interface IMetricCollectionConfig {
    enabled: boolean;
    samplingRate: number;
    retentionPeriod: number;
    aggregationIntervals: string[];
    customMetrics?: string[];
}

// ================ Recovery Validation ================

export interface IRecoveryValidationResult {
    valid: boolean;
    context: IRecoveryContext;
    checks: IValidationCheck[];
    metadata?: Record<string, unknown>;
}

export interface IValidationCheck {
    name: string;
    passed: boolean;
    message?: string;
    severity?: 'low' | 'medium' | 'high';
}

export type IRecoveryValidator = (
    context: IRecoveryContext,
    result: IRecoveryResult
) => Promise<IRecoveryValidationResult>;
