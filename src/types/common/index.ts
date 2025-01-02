/**
 * @file index.ts
 * @description Consolidated type system exports
 */

// ================ Base Types ================

// Context Types
export type {
    IBaseContextRequired,
    IBaseContextPartial
} from './baseTypes';

// Memory Types
export type {
    IMemoryMetrics
} from './baseTypes';

// Parser Types
export type {
    IParsedJSON,
    IParserConfig,
    IParserResult
} from './baseTypes';

// Version Types
export type {
    ISemanticVersion,
    VersionOperator,
    IVersionConstraint,
    IVersionRange,
    IDependencySpec,
    IDependencyResolution,
    IDependencyNode
} from './baseTypes';

export { DEPENDENCY_ERROR_TYPE } from './baseTypes';

// Version Utilities
export {
    parseVersion,
    compareVersions,
    parseConstraint,
    satisfiesConstraint,
    satisfiesRange,
    isSemanticVersion,
    isVersionConstraint
} from './baseTypes';

// Metrics Types
export type {
    ITokenCostBreakdown,
    IStandardCostDetails,
    IModelPricingConfig,
    ICostTrackingOptions,
    ICostAggregate,
} from './baseTypes';

// Resource and Usage Metrics Types
// Resource and Usage Metrics Types are now imported from metrics/index.ts
export type {
    IResourceMetrics,
    IUsageMetrics
} from '../metrics';

// Handler Types
export type {
    IBaseHandlerMetadata,
    IBaseHandler,
    IHandlerResult,
    IBaseHandlerParams,
    IBaseExecutionOptions
} from './baseTypes';

// Event Types
export type {
    IBaseEvent,
    IStateChangeEvent,
    IEventHandler,
    IEventEmitter,
    IEventSubscription,
    IEventBus,
    IEventRegistry,
    IEventValidationMetadata,
    IEventValidationResult
} from './baseTypes';

// Type Guards and Utilities
export type {
    TypeGuardCheck
} from './baseTypes';

export {
    createTypeGuard,
    commonChecks,
    createSuccessResult,
    createErrorResult,
    createBaseMetadata
} from './baseTypes';

// ================ Logging Types ================

// Core Logging Types
export type {
    ILoggerConfig,
    ILogFormattingOptions,
    ILogDestinationConfig,
    ILogFilterOptions
} from './loggingTypes';

// Log Event Types
export type {
    ILogCreatedEvent,
    ILogUpdatedEvent,
    ILogClearedEvent,
    ITaskLogAddedEvent,
    IWorkflowLogAddedEvent,
    IAgentLogAddedEvent,
    LogEvent,
    ILogEventHandler
} from './loggingTypes';

// Log Entry Types
export type {
    ILogEntry,
    ILogPattern,
    ILogAnomaly,
    ILogCorrelation
} from './loggingTypes';

// Storage Types
export type {
    ILogStorageIndex,
    ILogStorageSegment,
    ILogStorageQuery,
    ILogStorageQueryResult,
    ILogStorageStats,
    ILogStorageMaintenance,
    ILogStorageMaintenanceResult,
    ILogStorageConfig
} from './loggingTypes';

// Analysis Types
export type {
    ILogAnalysisConfig,
    ILogAggregationOptions,
    ILogAggregation
} from './loggingTypes';

// Default Configurations
export {
    DEFAULT_LOG_STORAGE_CONFIG,
    DEFAULT_LOG_ANALYSIS_CONFIG
} from './loggingTypes';

// Type Guards
export {
    isLogLevel,
    isLoggerConfig
} from './loggingTypes';

// ================ Validation Types ================

// Base Validation Types
export type {
    ValidationErrorType,
    ValidationWarningType,
    IBaseValidation,
    IValidationResult
} from './validationTypes';

// Validation Process Types
export type {
    IValidationStep,
    IValidationMetrics,
    IValidationSchema,
    IValidationContext,
    IValidationHandlerMetadata
} from './validationTypes';

// Status Validation Types
export type {
    IStatusValidationResult
} from './validationTypes';

// Validation Utilities
export {
    createValidationResult,
    createStatusValidationResult,
    createValidationMetadata,
    formatValidationMessage,
    toValidationError,
    toValidationWarning
} from './validationTypes';

// ================ Status Types ================

// Core Status Types
export type {
    IStatusEntity,
    IStatusType,
    IStatusErrorType,
    IStatusError,
    IStatusChangeEvent,
    IStatusTransitionContext,
    IStatusManagerConfig,
    IStatusTransitionRule,
    IStatusChangeCallback
} from './statusTypes';

// History Types
export type {
    IStatusHistoryEntry,
    StatusDurationRecord,
    IStatusHistoryAnalysis,
    IStatusHistoryQuery
} from './statusTypes';

// Reporting Types
export type {
    IStatusTrendAnalysis,
    IStatusImpactAssessment,
    IStatusDashboardMetrics
} from './statusTypes';

// Status Utilities and Type Guards
export {
    createEmptyStatusFrequency,
    DEFAULT_STATUS_RECORDS,
    isValidStatusEntity
} from './statusTypes';

// ================ Enum Types ================
export {
    MANAGER_CATEGORY_enum,
    SERVICE_STATUS_enum,
    HEALTH_STATUS_enum,
    SERVICE_EVENT_TYPE_enum,
    AGENT_STATUS_enum,
    MESSAGE_STATUS_enum,
    TASK_STATUS_enum,
    WORKFLOW_STATUS_enum,
    FEEDBACK_STATUS_enum,
    LLM_STATUS_enum,
    ERROR_TYPE_enum,
    MESSAGE_ERROR_TYPE_enum,
    LLM_ERROR_KIND_enum,
    VALIDATION_ERROR_enum,
    VALIDATION_WARNING_enum,
    EnumUtils,
    EnumTypeGuards
} from './enumTypes';

export type { ILogLevel, IEnumUtils, IEnumTypeGuards } from './enumTypes';

// ================ Metadata Types ================
export type {
    IErrorMetadata,
    IToolExecutionMetadata,
    IResponseMetadata,
    IMessageMetadata,
    ITeamMetadata,
    IWorkflowMetadata,
    IAgentMetadata,
    IAgentCreationMetadata,
    IAgentExecutionMetadata,
    ITaskMetadata,
    IErrorHandlerParams,
    IThinkingHandlerParams,
    IToolHandlerParams,
    ITaskExecutionParams,
    ITaskCompletionParams,
    ITeamMessageParams,
    IResourceHandlerParams,
    IAgentCreationResult,
    IAgentExecutionResult
} from './metadataTypes';

// ================ Error Types ================
export type {
    IErrorKind,
    IBaseError,
    IErrorType,
    IErrorContext,
} from './errorTypes';

export {
    ERROR_KINDS,
    BaseError,
    createError,
    createErrorMetadata
} from './errorTypes';
