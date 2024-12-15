/**
 * @file index.ts
 * @path KaibanJS/src/types/agent/index.ts
 * @description Consolidated export file for agent-related types
 */

// External type re-exports
export type { BaseMessage } from "@langchain/core/messages";
export type { IHandlerResult } from '../common/baseTypes';
export type { IResourceMetrics } from '../metrics/base/resourceMetrics';
export type { IUsageMetrics } from '../metrics/base/usageMetrics';
export type { 
    POOL_RESOURCE_TYPE_enum as RESOURCE_TYPE,
    POOL_RESOURCE_STATUS_enum as RESOURCE_STATUS,
    BATCH_PRIORITY_enum,
    BATCH_STATUS_enum
} from '../common/enumTypes';

// ─── Base Agent Types (agentBaseTypes.ts) ───────────────────────────────────────
export type {
    IAgentType,
    IBaseAgent,
    IAgentMetadata,
    IAgentCapabilities,
    IExecutableAgent,
    IReactChampionAgent,
    IStatusType
} from './agentBaseTypes';

// ─── Action Types (agentActionsTypes.ts) ─────────────────────────────────────
export type {
    IAgentErrorActions,
    IAgentThinkingActions,
    IAgentToolActions,
    IAgentStatusActions,
    IAgentStoreActions
} from './agentActionsTypes';

// ─── Error Types (agentErrorTypes.ts) ─────────────────────────────────────────
export type {
    IRetryConfig,
    ICircuitBreakerConfig,
    IRetryDetails,
    ICircuitBreakerDetails
} from './agentErrorTypes';

export {
    DEFAULT_RETRY_CONFIG,
    DEFAULT_CIRCUIT_BREAKER_CONFIG,
    createRetryError,
    createCircuitBreakerError,
    ErrorTypeGuards
} from './agentErrorTypes';

// ─── Event Types (events.ts) ─────────────────────────────────────────────────
export type {
    IAgentEventMetadata,
    IBaseAgentEvent,
    IAgentCreatedEvent,
    IAgentUpdatedEvent,
    IAgentDeletedEvent,
    IAgentStatusChangedEvent,
    IAgentIterationStartedEvent,
    IAgentIterationCompletedEvent,
    IAgentIterationFailedEvent,
    IAgentMetricsUpdatedEvent,
    IAgentConfigUpdatedEvent,
    IAgentValidationCompletedEvent,
    IAgentErrorOccurredEvent,
    IAgentErrorHandledEvent,
    IAgentErrorRecoveryStartedEvent,
    IAgentErrorRecoveryCompletedEvent,
    IAgentErrorRecoveryFailedEvent,
    IAgentEventHandler,
    AgentEvent,
    AgentLifecycleEvent,
    AgentStateEvent,
    AgentIterationEvent,
    AgentMetricsEvent,
    AgentConfigEvent,
    AgentValidationEvent,
    AgentErrorEvent,
    IAgentEventValidationResult,
    IAgentEventValidationSchema
} from './events';

export {
    AGENT_EVENT_TYPE,
    AGENT_EVENT_CATEGORY,
    createAgentEventValidationResult,
    AgentEventTypeGuards,
    isAgentEventMetadata
} from './events';

// ─── Execution Types (agentExecutionTypes.ts) ──────────────────────────────────
export type {
    IAgentExecutionMetadata,
    IAgentExecutionContext,
    IAgentExecutionResult,
    IAgentExecutionErrorContext,
    IAgentExecutionHistoryEntry
} from './agentExecutionTypes';

export { ExecutionTypeGuards } from './agentExecutionTypes';

// ─── Execution Flow Types (executionFlow.ts) ────────────────────────────────────
export type {
    ExecutionStatus,
    IBaseExecutionContext,
    IBaseExecutionControl,
    IIterationStartParams,
    IIterationEndParams,
    IIterationControlParams,
    IIterationContext,
    IIterationControl,
    IIterationHandlerMetadata,
    IIterationResult,
    IIterationHandlerResult,
    ILoopExecutionParams,
    ILoopContext,
    ILoopControl,
    IStateTransaction,
    IStateManager,
    ILoopHandlerMetadata,
    ILoopResult,
    ILoopHandlerResult
} from './executionFlow';

export {
    ExecutionFlowTypeGuards,
    createLoopHandlerResult
} from './executionFlow';

// ─── Handler Types (agentHandlersTypes.ts) ─────────────────────────────────────
export type {
    IBaseAgentHandlerMetadata,
    IBaseHandlerParams,
    IBaseAgentHandler,
    ILifecycleHandlerParams,
    IStateHandlerParams,
    IErrorHandlerParams,
    IThinkingHandlerParams,
    IToolHandlerParams,
    ILifecycleHandlerMetadata,
    IStateHandlerMetadata,
    IThinkingMetadata,
    IErrorHandlerMetadata,
    IThinkingExecutionParams,
    IThinkingResult,
    ILifecycleHandlerResult,
    IStateHandlerResult,
    IThinkingHandlerResult,
    IErrorHandlerResult,
    ILifecycleHandler,
    IStateHandler,
    IThinkingHandler,
    IErrorHandler
} from './agentHandlersTypes';

// ─── Manager Types (agentManagerTypes.ts) ─────────────────────────────────────
export type {
    IAgenticLoopManager,
    IMessageManager,
    ILLMManager,
    IToolManager,
    IThinkingManager,
    IIterationManager,
    IMetricsManager,
    IManagerFactory,
    IManagerRegistry,
    IBaseManager,
    IBaseManagerMetadata
} from './agentManagerTypes';

export { MANAGER_CATEGORY_enum } from './agentManagerTypes';

// ─── Metric Types (agentMetricTypes.ts) ─────────────────────────────────────
export type {
    IBaseMetrics,
    IBaseResourceMetrics,
    IBasePerformanceMetrics,
    IBaseUsageMetrics,
    IAgentMetrics,
    ICognitiveResourceMetrics,
    IThinkingOperationMetrics,
    IAgentStateMetrics,
    IAgentResourceMetrics,
    IAgentPerformanceMetrics,
    IAgentUsageMetrics
} from './agentMetricTypes';

export { MetricsValidation } from './agentMetricTypes';

// ─── Pool Types (from pool subdirectory) ─────────────────────────────────────
export type {
    IResource,
    IPoolMetrics,
    IPoolConfig,
    IHealthCheckResult
} from './pool/poolTypes';

export { DEFAULT_POOL_CONFIG } from './pool/poolTypes';

// ─── Batch Types (from batch subdirectory) ────────────────────────────────────
export type {
    IBatchOperation,
    IBatchMetrics,
    IBatchConfig
} from './batch/batchTypes';

export { DEFAULT_BATCH_CONFIG } from './batch/batchTypes';

// ─── Selector Types (agentSelectorsTypes.ts) ────────────────────────────────
export type {
    IAgentRuntimeSelectors,
    IAgentMetricSelectors,
    IAgentStoreSelectors
} from './agentSelectorsTypes';

export { AgentSelectorTypeGuards } from './agentSelectorsTypes';

// ─── State Types (agentStateTypes.ts) ─────────────────────────────────────────
export type {
    ICoreState,
    ITimingState,
    IErrorState,
    IAssignmentState,
    IAgentExecutionState,
    IStateValidationRules,
    IStateValidationResult,
    IStateHistoryEntry,
    IStateTransition
} from './agentStateTypes';

export { STATE_CATEGORY, AgentStateTypeGuards } from './agentStateTypes';

// ─── Validation Types (agentValidationTypes.ts) ──────────────────────────────
export type {
    IAgentValidationSchema,
    IAgentValidationResult,
    IAgentSelectionCriteria,
    IAgentCreationResult
} from './agentValidationTypes';

export { AgentValidationSchema } from './agentValidationTypes';

// ─── Prompt Types (promptsTypes.ts) ─────────────────────────────────────────
export type {
    IAgentPromptTemplate,
    IREACTChampionAgentPrompts,
    ISystemMessageParams,
    IInitialMessageParams,
    IInvalidJSONFeedbackParams,
    IThoughtWithSelfQuestionParams,
    IThoughtFeedbackParams,
    ISelfQuestionParams,
    IToolResultParams,
    IToolErrorParams,
    IToolNotExistParams,
    IObservationFeedbackParams,
    IWeirdOutputFeedbackParams,
    IForceFinalAnswerParams,
    IFeedbackMessageParams
} from './promptsTypes';

export { IPromptTypeGuards } from './promptsTypes';

// ─── Type Guards (agentTypeGuards.ts) ─────────────────────────────────────────
export {
    AgentTypeGuards,
    MetricsTypeGuards,
    SelectorTypeGuards,
    EventTypeGuards,
    ValidationTypeGuards
} from './agentTypeGuards';

// ─── Utils Types (agentUtilsTypes.ts) ─────────────────────────────────────────
export type {
    AgentAttributes,
    ApiKeyConfig,
    TemplateOptions
} from './agentUtilsTypes';
