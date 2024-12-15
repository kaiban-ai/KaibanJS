/**
 * @file index.ts
 * @path src/managers/core/recovery/index.ts
 * @description Recovery strategy exports and type definitions
 *
 * @module @managers/core/recovery
 */

// Strategy Implementations
export { default as RetryStrategy } from './retryStrategy';
export { default as CircuitBreakerStrategy } from './circuitBreakerStrategy';
export { default as GracefulDegradationStrategy } from './gracefulDegradationStrategy';
export { default as AgentRestartStrategy } from './agentRestartStrategy';
export { default as AgentReassignStrategy } from './agentReassignStrategy';
export { default as AgentFallbackModelStrategy } from './agentFallbackModelStrategy';

// Recovery Types
export type {
    IRecoveryContext,
    IRecoveryResult,
    IRecoveryMetrics,
    IRecoveryStrategy,
    IStrategyMetrics,
    IResourceUsage,
    IRecoveryManagerConfig,
    IRecoveryValidationResult,
    IRecoveryEvent,
    IRetryStrategyConfig,
    ICircuitBreakerStrategyConfig,
    IGracefulDegradationConfig,
    IAgentRecoveryConfig,
    IDegradationLevel,
    IAgentReassignmentRule,
    IRecoveryMetadata,
    IPerformanceImpact,
    ITimeBasedMetrics,
    IMetricCount,
    IErrorPattern,
    IRecoveryValidator,
    IValidationCheck,
    IMetricCollectionConfig
} from '../../../types/common/recoveryTypes';

// Recovery Enums
export {
    RecoveryStrategyType,
    RecoveryPhase,
    RecoveryEventType
} from '../../../types/common/recoveryTypes';

// Error Types
export type {
    IBaseError,
    IErrorContext,
    IErrorRecoveryHandler,
    IErrorRecoveryResult,
    IErrorRecoveryConfig,
    IRetryConfig,
    ICircuitBreakerConfig
} from '../../../types/common/errorTypes';

// Base Types
export type {
    IBaseEvent,
    IBaseHandlerMetadata,
    IBaseContextRequired,
    IBaseContextPartial
} from '../../../types/common/baseTypes';

// Metric Types
export type { IResourceMetrics } from '../../../types/metrics/base/resourceMetrics';
export type { IPerformanceMetrics } from '../../../types/metrics/base/performanceMetrics';

// Validation Types
export type {
    IValidationResult
} from '../../../types/common/validationTypes';

// Utility Functions
export {
    createBaseMetadata
} from '../../../types/common/baseTypes';

export {
    createErrorContext
} from '../../../types/common/errorTypes';

export {
    ResourceMetricsValidation
} from '../../../types/metrics/base/resourceMetrics';

export {
    PerformanceMetricsValidation
} from '../../../types/metrics/base/performanceMetrics';
