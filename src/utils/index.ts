/**
 * @file index.ts
 * @path KaibanJS/src/utils/index.ts
 * @description Central export point for KaibanJS utilities
 */

/**
 * Core Utilities
 */
export { LogManager as logger } from '../managers/core/logManager';
export { 
    BaseError,
    createError,
    isErrorType,
    isBaseError,
    toErrorType,
    createErrorMetadata,
    createErrorContext,
    ERROR_KINDS
} from '../types/common/errorTypes';

/**
 * Parser Implementations
 */
export {
    parseJSON,
    getParsedJSON
} from './parsers/parser';

/**
 * Type Exports
 */
// Agent types
export type {
    IBaseAgent,
    IReactChampionAgent,
    IAgentType,
    IAgentMetadata,
    IAgentCapabilities
} from '../types/agent/agentBaseTypes';

// Common types
export type {
    IErrorType,
    IBaseError,
    IErrorContext,
    IErrorKind,
    IErrorSeverity,
    IErrorRecoveryConfig,
    IErrorRecoveryResult
} from '../types/common/errorTypes';

export type {
    IParsedJSON,
    IParserConfig,
    IParserResult,
    IBaseHandlerMetadata
} from '../types/common/baseTypes';

// LLM types
export type {
    ILLMConfig,
    ILLMResponse,
    ILLMResult,
    IStreamingOptions
} from '../types/llm/llmBaseTypes';

// Messaging types
export type {
    IMessageHistory,
    IBaseMessageMetadata,
    IMessageHistoryEntry,
    IMessageValidationResult
} from '../types/llm/message/messagingBaseTypes';

// Task types
export type {
    ITaskType,
    ITaskParams,
    ITaskProgress,
    ITaskHistoryEntry
} from '../types/task/taskBaseTypes';

export type {
    ITaskHandlerResult,
    ITaskHandlerMetadata,
    ITaskMetrics,
    ITaskValidationResult
} from '../types/task/taskHandlerTypes';

export type { ITaskFeedback } from '../types/task/taskFeedbackTypes';

// Team types
export type {
    ITeamState,
    ITeamStoreMethods
} from '../types/team/teamBaseTypes';

// Workflow types
export type {
    IWorkflowResult,
    IWorkflowError
} from '../types/workflow/workflowBaseTypes';

/**
 * Enum Exports
 */
export {
    AGENT_STATUS_enum,
    TASK_STATUS_enum,
    WORKFLOW_STATUS_enum,
    ERROR_SEVERITY_enum,
    BATCH_PRIORITY_enum
} from '../types/common/enumTypes';

/**
 * Constants
 */
export {
    DEFAULT_ERROR_RECOVERY_CONFIG,
    DEFAULT_RETRY_CONFIG,
    DEFAULT_CIRCUIT_BREAKER_CONFIG
} from '../types/common/errorTypes';

/**
 * Default Configurations
 */
export { default as REACT_CHAMPION_AGENT_DEFAULT_PROMPTS } from './helpers/prompts/prompts';
