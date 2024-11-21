/**
 * @file index.ts
 * @description Central export file for common types and interfaces
 */

// Validation exports
export type {
    IValidationResult,
    IValidationOptions,
    IAgentValidationResult,
    ITaskValidationResult,
    IStatusValidationResult,
    IValidationRule,
    IValidationSchema,
    IValidationContext,
    IValidationFunction,
    IValidationHandlerConfig
} from './commonValidationTypes';
export { ValidationTypeGuards, DEFAULT_VALIDATION_CONFIG } from './commonValidationTypes';

// Status exports
export type {
    IStatusEntity,
    IStatusType,
    IStatusUpdateParams,
    IStatusErrorType,
    IStatusError,
    IStatusTransition,
    IStatusTransitionContext,
    IStatusTransitionRule,
    IStatusChangeEvent,
    IStatusChangeCallback,
    IStatusManagerConfig
} from './commonStatusTypes';
export {
    isStatusEntity,
    isStatusTransition,
    isStatusTransitionContext
} from './commonStatusTypes';

// Parser exports
export type {
    IParsedJSON,
    IParserConfig,
    IParserResult
} from './commonParserTypes';

// Memory exports
export type { IMemoryMetrics } from './commonMemoryTypes';

// Logging exports
export type {
    ILoggerConfig,
    ILogFormattingOptions,
    ILogDestinationConfig,
    ILogFilterOptions
} from './commonLoggingTypes';
export { isLogLevel, isLoggerConfig } from './commonLoggingTypes';

// Error exports
export type {
    IErrorKind,
    IErrorMetadata,
    IBaseError,
    IErrorType,
    IErrorOptions,
    ILLMError,
    IValidationError,
    IWorkflowError
} from './commonErrorTypes';
export {
    KaibanError,
    IErrorTypeGuards,
    toKaibanError,
    toErrorType,
    createError
} from './commonErrorTypes';

// Enum exports
export {
    AGENT_STATUS_enum,
    MESSAGE_STATUS_enum,
    TASK_STATUS_enum,
    WORKFLOW_STATUS_enum,
    FEEDBACK_STATUS_enum,
    STATUS_LOG_TYPE_enum,
    MESSAGE_LOG_TYPE_enum,
    ILogLevel,
    IEnumUtils,
    EnumUtils,
    IEnumTypeGuards,
    EnumTypeGuards
} from './commonEnums';

// Handler exports
export type {
    IHandlerResult,
    IBaseHandlerParams,
    IErrorHandlerParams,
    IThinkingHandlerParams,
    IToolHandlerParams,
    ITaskExecutionParams,
    ITaskCompletionParams,
    ITeamInputs,
    ITeamMessageParams,
    IValidationHandlerParams,
    IResourceHandlerParams
} from './commonHandlerTypes';
export {
    IHandlerTypeGuards,
    createSuccessResult,
    createErrorResult
} from './commonHandlerTypes';

// Metrics exports
export type {
    ITokenCostBreakdown,
    IStandardCostDetails,
    IModelPricingConfig,
    ICostTrackingOptions,
    ICostAggregate,
    IResourceMetrics,
    IUsageMetrics,
    IPerformanceMetrics
} from './commonMetricTypes';
