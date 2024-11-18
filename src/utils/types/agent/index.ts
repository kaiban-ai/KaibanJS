/**
 * @file index.ts
 * @description Central export point for all agent-related types
 */

// Export base agent types
export type {
    AgentType,
    AgentCapabilities,
    IBaseAgent,
    IReactChampionAgent,
    SystemAgent,
    StatusType
} from './base';

export { AgentTypeGuards } from './base';

// Export execution-related types
export type {
    // Thinking Types
    IThinkingExecutionParams,
    IThinkingHandlerParams,
    IThinkingResult,
    IThinkingStats,

    // Handler Types
    IHandlerResult,
    IHandlerBaseParams,
    IToolExecutionParams,
    IToolExecutionResult,
    IIterationHandlerParams,
    ILoopControlParams,
    ILoopControlResult,
    IErrorStore,
    IErrorHandlerParams,

    // Convenience Types
    HandlerParams,
    HandlerResult,
    ExecutionParams,
    ExecutionResult
} from './execution';

// Export execution-related values
export {
    // Type Guards
    thinkingTypeGuards,
    handlerTypeGuards,
    executionTypeGuards,
    
    // Constants
    DEFAULT_THINKING_STATS,
    DEFAULT_MAX_ITERATIONS,
    DEFAULT_ERROR_CONTEXT,
    
    // Enums
    ErrorSeverity
} from './execution';

// Export configuration types
export type {
    AgentValidationSchema,
    AgentCreationResult,
    ExecutionContext
} from './config';

export {
    AgentConfigTypeGuards,
    AgentConfigUtils
} from './config';

/**
 * @deprecated Use types from './execution' instead
 * These exports are maintained for backward compatibility
 * and will be removed in a future version
 */
export type {
    IThinkingExecutionParams as ThinkingExecutionParams,
    IThinkingResult as ThinkingResult,
    IHandlerBaseParams as HandlerBaseParams
} from './execution';
