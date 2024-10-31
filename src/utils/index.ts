/**
 * Path: src/utils/types/index.ts
 * 
 * Type Definitions Index
 * ---------------------
 * Main entry point for types in the KaibanJS library. This file centralizes all type exports,
 * making them available through a single import point. Types are organized by category
 * for better maintainability and clarity.
 * 
 * Usage:
 * import { SomeType } from '@/utils/types';
 */

// Re-export all enums
export {
    AGENT_STATUS_enum,
    TASK_STATUS_enum,
    WORKFLOW_STATUS_enum,
    FEEDBACK_STATUS_enum
} from './core/enums';

// LLM-related types
export type {
    LLMProvider,
    BaseLLMConfig,
    GroqConfig,
    OpenAIConfig,
    AnthropicConfig,
    GoogleConfig,
    MistralConfig,
    LLMConfig,
    LLMInstance
} from '@/utils/types';

// Agent-related types
export type {
    BaseAgentConfig,
    IBaseAgent,
    IReactChampionAgent,
    AgentType,
    IAgentParams
} from '@/utils/types';

// Task-related types
export type {
    TaskType,
    TaskResult,
    TaskStats,
    FeedbackObject,
    ITaskParams,
    ITask
} from '@/utils/types';

// Store-related types
export type {
    StoreSubscribe,
    BaseStoreState,
    TaskStoreState,
    TeamState,
    TeamStateActions,
    TeamStore,
    ITeamParams,
    ITeam
} from '@/utils/types';

// Output and Response types
export type {
    Output,
    LLMUsageStats,
    AgenticLoopResult,
    StreamingHandlerConfig,
    CompletionResponse
} from '@/utils/types';

// Handler types
export type {
    HandlerBaseParams,
    ThinkingHandlerParams,
    ToolHandlerParams,
    StatusHandlerParams,
    IterationHandlerParams,
    TaskCompletionParams,
    MessageBuildParams,
    PrepareNewLogParams
} from '@/utils/types';

// Logging and Display types
export type {
    TaskCompletionProps,
    TaskStatusProps,
    WorkflowStatusProps,
    WorkflowResultProps,
    Log
} from '@/utils/types';

// Error types
export type {
    ErrorType,
    PrettyErrorType
} from '@/utils/types';

// Cost Calculation types
export type {
    CostDetails,
    ModelPricing
} from '@/utils/types';

// Parser types
export type {
    ParsedJSON
} from '@/utils/types';

// Factory Pattern types
export type {
    LLMFactory,
    LLMFactoryCreator
} from '@/utils/types';

// Type guard functions
export {
    isGroqConfig,
    isOpenAIConfig,
    isAnthropicConfig,
    isGoogleConfig,
    isMistralConfig
} from '@/utils/types';

// External type re-exports
export type { Tool } from "langchain/tools";
export type { BaseMessage } from "@langchain/core/messages";
export type { ChatGroqInput } from "@langchain/groq";
export type { GoogleGenerativeAIChatInput } from "@langchain/google-genai";