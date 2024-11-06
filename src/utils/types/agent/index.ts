/**
 * @file index.ts
 * @path src/utils/types/agent/index.ts
 * @description Central export point for agent-related types and interfaces
 */

// Base agent types
export type {
    IBaseAgent,
    IReactChampionAgent,
    SystemAgent,
    AgentType
} from './base';

export {
    AgentTypeGuards
} from './base';

// Configuration types
export type {
    BaseAgentConfig,
    ExtendedBaseAgentConfig,
    IAgentParams,
    AgentValidationSchema,
    AgentCreationResult
} from './config';

// Handler types
export type {
    HandlerBaseParams,
    ThinkingHandlerParams,
    ToolHandlerParams,
    ToolExecutionResult,
    ToolExecutionParams,
    IterationHandlerParams,
    TaskCompletionParams,
    StreamHandlerParams,
    RetryHandlerParams,
    ValidationHandlerParams,
    StatusHandlerParams,
    ErrorHandlerParams,
    ParsingHandlerParams,
    HandlerResult,
    IErrorHandler,
    ThinkingResult
} from './handlers';

// Store types
export type {
    AgentRuntimeState,
    AgentExecutionMetrics,
    AgentExecutionContext,
    AgentStoreState,
    AgentStoreActions,
    AgentExecutionResult,
    AgentSelectionCriteria
} from './store';

export {
    AgentStoreTypeGuards
} from './store';

// Prompt types
export type {
    BasePromptParams,
    SystemMessageParams,
    InitialMessageParams,
    InvalidJSONFeedbackParams,
    ThoughtWithSelfQuestionParams,
    ThoughtFeedbackParams,
    SelfQuestionParams,
    ToolResultParams,
    ToolErrorParams,
    ToolNotExistParams,
    ForceFinalAnswerParams,
    FeedbackMessageParams,
    ObservationFeedbackParams,
    WeirdOutputFeedbackParams,
    REACTChampionAgentPrompts
} from './prompts';

// Utility types
export type {
    AgentAttributes,
    ApiKeyConfig,
    TemplateOptions
} from './utils';