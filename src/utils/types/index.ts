/**
 * @file index.ts
 * @path src/types/index.ts
 * @description Central export point for all KaibanJS type definitions
 *
 * This file serves as the main entry point for all types used throughout the KaibanJS library.
 * It provides a clean, organized way to import types from different domains while maintaining
 * clear boundaries between concerns.
 *
 * @packageDocumentation
 * @module @types
 */

/**
 * Re-export all enums
 * @public
 */
export {
    AGENT_STATUS_enum,
    TASK_STATUS_enum,
    WORKFLOW_STATUS_enum,
    FEEDBACK_STATUS_enum
} from '@/utils/core/enums';

/**
 * LLM-related types
 * @public
 */
export type {
    // Provider configurations
    LLMProvider,
    BaseLLMConfig,
    GroqConfig,
    OpenAIConfig,
    AnthropicConfig,
    GoogleConfig,
    MistralConfig,
    LLMConfig,
    LLMInstance,
    
    // Response types
    Output,
    LLMResponse,
    CompletionResponse,
    TokenUsage,
    LLMUsageStats,
    
    // Callback types
    ChatGroqCallbacks,
    LLMEvent,
    EventHandlerConfig,
    StreamingHandlerConfig
} from './llm';

/**
 * Agent-related types
 * @public
 */
export type {
    // Base agent types
    IBaseAgent,
    IReactChampionAgent,
    AgentType,
    SystemAgent,
    
    // Configuration
    BaseAgentConfig,
    IAgentParams,
    AgentRuntimeConfig,
    
    // Handler types
    HandlerBaseParams,
    ThinkingHandlerParams,
    ToolHandlerParams,
    IterationHandlerParams
} from './agent';

/**
 * Task-related types
 * @public
 */
export type {
    // Core task types
    TaskType,
    TaskResult,
    TaskStats,
    ITaskParams,
    
    // Feedback and tracking
    FeedbackObject,
    TaskProgress,
    TaskMetrics,
    TaskHistoryEntry,
    
    // Handler types
    TaskExecutionParams,
    TaskCompletionParams,
    TaskErrorParams,
    TaskValidationParams
} from './task';

/**
 * Team-related types
 * @public
 */
export type {
    // Core team types
    ITeam,
    TeamState,
    TeamStore,
    TeamEnvironment,
    TeamInputs,
    ITeamParams,
    
    // Logging types
    Log,
    LogType,
    LogMetadata,
    AgentLogMetadata,
    TaskLogMetadata,
    WorkflowLogMetadata
} from './team'
/**
 * Workflow-related types
 * @public
 */
export type {
    // Core workflow types
    WorkflowResult,
    WorkflowError,
    WorkflowSuccess,
    WorkflowBlocked,
    WorkflowStopped,
    WorkflowErrored,
    
    // Statistics
    WorkflowStats,
    CostDetails,
    ModelUsageStats,
    PerformanceMetrics,
    BudgetStats
} from './workflow';

/**
 * Message-related types
 * @public
 */
export type {
    // Core message types
    MessageRole,
    MessageContent,
    BaseMessage,
    ChatMessage,
    MessageContext,
    
    // History types
    MessageHistory,
    ChatSession,
    MessageHistoryConfig,
    
    // Handler types
    MessageHandlerConfig,
    MessageStreamConfig,
    MessageValidationConfig
} from './messaging';

/**
 * Common utility types
 * @public
 */
export type {
    ErrorType,
    PrettyErrorType
} from '@/utils/core/errors';

/**
 * Type utilities and guards
 * @public
 */
export {
    // LLM type guards
    isGroqConfig,
    isOpenAIConfig,
    isAnthropicConfig,
    isGoogleConfig,
    isMistralConfig
} from './llm';

export { AgentTypeGuards } from './agent';
export { TaskTypeGuards } from './task';
export { TeamTypeGuards } from './team';
export { WorkflowTypeGuards } from './workflow';
export { MessageTypeUtils } from './messaging';

/**
 * Utility functions
 * @public
 */
export {
    TeamUtils,
    WorkflowUtils,
    StatsUtils
} from './workflow';

/**
 * Constants
 * @public
 */
export {
    TOKEN_LIMITS,
    LLMProviders
} from './llm';

/**
 * @example
 * Import specific types:
 * ```typescript
 * import type { IBaseAgent, TaskType } from '@/types';
 * ```
 *
 * @example
 * Import type guards:
 * ```typescript
 * import { isGroqConfig, AgentTypeGuards } from '@/types';
 * ```
 *
 * @example
 * Import enums:
 * ```typescript
 * import { TASK_STATUS_enum } from '@/types';
 * ```
 *
 * @example
 * Import utilities:
 * ```typescript
 * import { WorkflowUtils, StatsUtils } from '@/types';
 * ```
 */

/**
 * Version information
 * @internal
 */
export const VERSION = '1.0.0';