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

// ─── Config Types (agentConfigTypes.ts) ─────────────────────────────────────
export type {
    IAgentConfig,
    IAgentConfigValidation,
    IAgentConfigFactory
} from './agentConfigTypes';

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

// ─── Context Types (agentContextTypes.ts) ─────────────────────────────────────
export type {
    IAgentContext,
    IAgentContextValidation,
    IAgentContextFactory
} from './agentContextTypes';

// ─── Action Types (agentActionsTypes.ts) ─────────────────────────────────────
export type {
    IAgentErrorActions,
    IAgentThinkingActions,
    IAgentToolActions,
    IAgentStatusActions,
    IAgentStoreActions
} from './agentActionsTypes';

// ─── Event Types (agentEventTypes.ts) ─────────────────────────────────────────
export type {
    IAgentEventBase,
    IAgentStatusChangeEvent,
    IAgentErrorEvent,
    IAgentExecutionEvent,
    IAgentValidationEvent,
    AgentEvent,
    IAgentEventHandler,
    IAgentEventFactory
} from './agentEventTypes';

export {
    AgentEventTypeGuards
} from './agentEventValidation';

// ─── Error Types (agentErrorTypes.ts) ─────────────────────────────────────────
export type {
    IAgentErrorContext,
    IAgentErrorDetails,
    IAgentErrorValidation,
    IAgentErrorFactory
} from './agentErrorTypes';

// ─── Handler Types (agentHandlersTypes.ts) ─────────────────────────────────────
export type {
    IAgentHandler,
    IAgentHandlerResult,
    IAgentHandlerFactory,
    IAgentHandlerRegistry
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
    IAgentState,
    IAgentStateValidation,
    IAgentStateFactory,
    IAgentStateTransition,
    IAgentStateHistory
} from './agentStateTypes';

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
    ValidationTypeGuards
} from './agentTypeGuards';

// ─── Utils Types (agentUtilsTypes.ts) ─────────────────────────────────────────
export type {
    AgentAttributes,
    ApiKeyConfig,
    TemplateOptions
} from './agentUtilsTypes';
