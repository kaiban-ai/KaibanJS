// src/utils/types/agent/index.ts

// Importing from base.ts
import {
    IBaseAgent,
    IReactChampionAgent,
    SystemAgent,
    AgentType,
    AgentTypeGuards
} from "./base";

// Importing from config.ts
import {
    BaseAgentConfig,
    ExtendedBaseAgentConfig,
    IAgentParams,
    AgentValidationSchema,
    AgentCreationResult
} from "./config";

// Importing from handlers.ts
import {
    HandlerBaseParams,
    ThinkingHandlerParams,
    ToolHandlerParams,
    ToolExecutionResult,
    IterationHandlerParams,
    ThinkingResult,
    ErrorHandlerParams,
    HandlerResult,
    IErrorHandler,
    HandlerTypeGuards
} from "./handlers";

// Importing from prompts.ts
import {
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
} from "./prompts";

// Importing from store.ts
import {
    AgentRuntimeState,
    AgentExecutionMetrics,
    AgentExecutionContext,
    AgentStoreState,
    AgentStoreActions,
    AgentExecutionResult,
    AgentSelectionCriteria,
    AgentStoreTypeGuards
} from "./store";

// Importing from utils.ts
import {
    AgentAttributes,
    ApiKeyConfig,
    TemplateOptions
} from "./utils";

// Exporting all modules, types, interfaces, and utility functions
export {
    // Base Agent Types
    IBaseAgent,
    IReactChampionAgent,
    SystemAgent,
    AgentType,
    AgentTypeGuards,

    // Agent Configurations
    BaseAgentConfig,
    ExtendedBaseAgentConfig,
    IAgentParams,
    AgentValidationSchema,
    AgentCreationResult,

    // Agent Handlers
    HandlerBaseParams,
    ThinkingHandlerParams,
    ToolHandlerParams,
    ToolExecutionResult,
    IterationHandlerParams,
    ThinkingResult,
    ErrorHandlerParams,
    HandlerResult,
    IErrorHandler,
    HandlerTypeGuards,

    // Agent Prompts
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
    REACTChampionAgentPrompts,

    // Agent Store
    AgentRuntimeState,
    AgentExecutionMetrics,
    AgentExecutionContext,
    AgentStoreState,
    AgentStoreActions,
    AgentExecutionResult,
    AgentSelectionCriteria,
    AgentStoreTypeGuards,

    // Agent Utilities
    AgentAttributes,
    ApiKeyConfig,
    TemplateOptions
};
