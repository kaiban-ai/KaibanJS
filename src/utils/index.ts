/**
 * @file index.ts
 * @path KaibanJS/src/utils/index.ts
 * @description Central export point for KaibanJS utilities
 */

/**
 * Core Utilities
 */
export { logger, setLogLevel } from './core/logger';
export { 
    PrettyError, 
    LLMInvocationError, 
    LLMConfigurationError,
    isPrettyError, 
    isLLMError,
    wrapError,
    createUserError
} from './core/errors';

/**
 * Factory Implementations
 */
export { DefaultFactory } from './factories/defaultFactory';
export { LogCreator } from './factories/logCreator';
export { MetadataFactory } from './factories/metadataFactory';

/**
 * Handler Implementations
 */
export {
    errorHandler,
    messageHandler,
    storeHandler,
    taskHandler,
    teamHandler
} from './handlers';

/**
 * Helper Functions
 */
// Cost calculation
export {
    calculateTaskCost,
    calculateTotalWorkflowCost,
    formatCost
} from './helpers/llm/llmCostCalculator';

// Agent utils
export {
    getApiKey,
    replaceAgentAttributes,
    validateAgentAttributes
} from './helpers/agent/agentUtils';

// Log formatting
export {
    logPrettyTaskCompletion,
    logPrettyTaskStatus,
    logPrettyWorkflowStatus,
    logPrettyWorkflowResult
} from './helpers/formatting/prettyLogs';

// Statistics calculation
export {
    calculateTaskStats,
    calculateAverageCostPerToken,
    calculateTokenRate
} from './helpers/tasks/stats';

/**
 * Manager Implementations
 */
export { MessageHistoryManager } from './managers/messageHistoryManager';

/**
 * Parser Implementations
 */
export {
    parseJSON,
    getParsedJSON
} from './parsers/parser';

/**
 * Type Guard Exports
 */
// Common type guards
export { EnumTypeGuards } from './types';
export { LogTypeGuards } from '../types/team/teamLogsTypes';
export { MessageTypeUtils } from '../types/messaging/messagingBaseTypes';
export { AgentTypeGuards } from './types/agent/base';
export { TaskTypeGuards } from '../types/task/taskBase';
export { TeamTypeGuards } from '../types/team/teamBaseTypes';
export { WorkflowStoreTypeGuards } from './types';

/**
 * Type Exports
 */
export type {
    // Agent types
    IBaseAgent,
    IReactChampionAgent,
    AgentType,
    SystemAgent,
    BaseAgentConfig,
    IAgentParams
} from './types/agent';

// Common types
export type {
    ErrorType,
    PrettyErrorType,
    ConfigurationError,
    RateLimitError,
    TokenLimitError,
    ErrorConfig,
    ParsedJSON,
    ParserConfig,
    ParserResult
} from './types/common';

// LLM types
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
    ParsedOutput
} from './types/llm';

// Messaging types
export type {
    MessageRole,
    FunctionCall,
    ToolCall,
    AdditionalKwargs,
    MessageMetadataFields,
    InternalChatMessage,
    ChatMessage,
    MessageContext,
    IMessageHistory
} from '../types/messaging';

// Task types
export type {
    TaskType,
    TaskResult,
    TaskStats,
    FeedbackObject,
    ITaskParams
} from '../types/task';

// Team types
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
    PrepareNewLogParams
} from '../types/team';

// Workflow types
export type {
    WorkflowResult,
    WorkflowError,
    WorkflowStats,
    CostDetails
} from '../types/workflow';



/**
 * Enum Exports
 */
export {
    AGENT_STATUS_enum,
    TASK_STATUS_enum,
    WORKFLOW_STATUS_enum,
    FEEDBACK_STATUS_enum
} from './types/common/enums';

/**
 * Constants
 */
export {
    TOKEN_LIMITS,
    LLMProviders
} from './types/llm/common';

/**
 * Default Configurations
 */
export { REACT_CHAMPION_AGENT_DEFAULT_PROMPTS } from './helpers/prompts/prompts';