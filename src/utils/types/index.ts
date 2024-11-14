/**
 * @file index.ts
 * @path KaibanJS/src/utils/types/index.ts
 * @description Central export point for all type definitions
 */

import { WorkflowStoreTypeGuards } from './workflow';

// Agent types and interfaces
export type {
    IBaseAgent,
    IReactChampionAgent,
    AgentType,
    SystemAgent,
    BaseAgentConfig,
    AgentExecutionMetrics,
    AgentRuntimeState,
    AgentStoreState,
    AgentStoreActions,
    AgentSelectionCriteria,
    AgentTypeGuards,
    // Handler types
    HandlerBaseParams,
    ThinkingHandlerParams,
    ToolHandlerParams,
    ToolExecutionResult,
    IterationHandlerParams,
    ErrorHandlerParams,
    HandlerResult,
    IErrorHandler,
    ThinkingResult
} from './agent';

// Common types and interfaces
export type {
    ErrorType,
    PrettyErrorType,
    ConfigurationError,
    RateLimitError,
    TokenLimitError,
    ErrorConfig,
    ParsedJSON,
    ParserConfig,
    ParserResult,
    StatusType,
    StatusEntity,
    StatusTransitionContext,
    StatusChangeEvent,
    StatusChangeCallback,
    StatusHistoryEntry,
    StatusTransitionRule,
    StatusManagerConfig,
    StatusValidationResult,
    StatusErrorType,
    StatusError,
    MemoryMetrics
} from './common';

// LLM types and interfaces
export type {
    LLMProvider,
    LLMConfig,
    BaseLLMConfig,
    GroqConfig,
    OpenAIConfig,
    AnthropicConfig,
    GoogleConfig,
    MistralConfig,
    Output,
    LLMResponse,
    CompletionResponse,
    LLMUsageStats,
    TokenUsage,
    ResponseMetadata,
    ParsedOutput,
    // Parsing types (from canonical location)
    ParsingHandlerParams,
    ParseErrorHandlerParams,
    ParsingResult,
    ParsingTypeGuards
} from './llm';

// Messaging types and interfaces
export type {
    MessageRole,
    FunctionCall,
    ToolCall,
    AdditionalKwargs,
    MessageMetadataFields,
    InternalChatMessage,
    ChatMessage,
    MessageContext,
    IMessageHistory,
    MessageHistoryConfig,
    MessageHistoryState,
    MessageHistoryMetrics,
    MessageTypeGuards,
} from './messaging';

// Store base types
export type {
    BaseStoreState,
    BaseStoreMethods,
    StoreSubscribe,
    SetStoreState,
    GetStoreState,
    IStoreApi,
    BoundStore,
    StoreCreator,
    StoreConfig,
    StoreValidationResult,
    StoreMiddlewareConfig,
    StoreSelector,
    StoreEventType,
    StoreEvent,
    StoreTypeGuards,
} from './store';

// Task types and interfaces
export type {
    TaskType,
    TaskResult,
    TaskStats,
    FeedbackObject,
    ITaskParams,
    TaskValidationResult,
    TaskExecutionParams,
    TaskCompletionParams,
    TaskErrorParams,
    TaskBlockingParams,
    TaskValidationParams,
    TaskFeedbackParams,
    TaskToolExecutionParams,
    TaskObservationParams,
    TaskIterationParams,
    TaskTypeGuards,
} from './task';

// Team types and interfaces
export type {
    TeamState,
    TeamStore,
    TeamEnvironment,
    TeamInputs,
    Log,
    LogType,
    LogMetadata,
    AgentLogMetadata,
    TaskLogMetadata,
    WorkflowLogMetadata,
    MessageLogMetadata,
    PrepareNewLogParams,
    TeamMessageParams,
    TeamTaskParams,
    TeamAgentParams,
    TeamToolParams,
    TeamWorkflowParams,
    TeamFeedbackParams,
    HandlerResult as TeamHandlerResult
} from './team';

export {
    TeamTypeGuards,
} from './team';

// Workflow types and interfaces
export type {
    WorkflowResult,
    WorkflowError,
    WorkflowStats,
    CostDetails,
    ModelUsageStats,
    WorkflowRuntimeState,
    WorkflowExecutionStats,
    WorkflowProgress,
    WorkflowState,
    WorkflowActionParams,
    WorkflowActionResult,
    WorkflowActions,
    WorkflowStoreConfig,
    WorkflowValidationRules,
    // Metadata types
    RequiredWorkflowMetadata,
    OptionalWorkflowMetadata,
    WorkflowMetadata,
} from './workflow';

// Enum exports
export {
    AGENT_STATUS_enum,
    TASK_STATUS_enum,
    WORKFLOW_STATUS_enum,
    FEEDBACK_STATUS_enum,
    STATUS_LOG_TYPE_enum,
    MESSAGE_LOG_TYPE_enum,
    EnumTypeGuards,
} from './common';

// Type guard exports
export { 
    WorkflowStoreTypeGuards,
} from './workflow';



// Constants
export {
    TOKEN_LIMITS,
    LLMProviders
} from './llm';

