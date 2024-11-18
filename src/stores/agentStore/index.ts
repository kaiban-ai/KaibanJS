/**
 * @file index.ts
 * @path src/stores/agentStore/index.ts
 * @description Centralized exports for agent store functionality
 *
 * @module @stores/agent
 */

export { default as createAgentStore } from './store';
export * from './actions';
export * from './selectors';

/**
 * Re-export core types from canonical locations
 */
export type {
    // Store Types
    IAgentState,
    IAgentStoreMethods,
    IAgentStoreConfig,
    IAgentStoreActions,
    IAgentValidationRules,
    IAgentErrorActions,
    IAgentThinkingActions,
    IAgentToolActions,
    IAgentStatusActions
} from '@/utils/types/agent/store';

// Agent Domain Types
export type {
    AgentType,
    IBaseAgent,
    IReactChampionAgent,
    IAgentCapabilities,
    AgentCreationResult,
    AgentSelectionCriteria,
    AgentValidationSchema
} from '@/utils/types/agent/base';

// Agent State Types
export type {
    IAgentMetadata,
    IAgentExecutionState,
    IAgentPerformanceStats
} from '@/utils/types/agent/state';

// Handler Types
export type {
    HandlerResult,
    ErrorHandlerParams,
    ThinkingHandlerParams,
    ToolHandlerParams
} from '@/utils/types/agent/handlers';

// Iteration Types
export type {
    IterationContext,
    IterationControl,
    IterationStats,
    IterationHandlerParams
} from '@/utils/types/agent/iteration';

// Prompt Types
export type {
    SystemMessageParams,
    InitialMessageParams,
    InvalidJSONFeedbackParams,
    ThoughtWithSelfQuestionParams,
    ThoughtFeedbackParams,
    SelfQuestionParams,
    ToolResultParams,
    ToolErrorParams,
    ToolNotExistParams,
    ObservationFeedbackParams,
    WeirdOutputFeedbackParams,
    ForceFinalAnswerParams,
    FeedbackMessageParams,
    REACTChampionAgentPrompts
} from '@/utils/types/agent/prompts';

// Action Types
export type {
    AgentErrorActions,
    AgentThinkingActions,
    AgentToolActions,
    AgentStatusActions,
    AgentStoreActions
} from '@/utils/types/agent/actions';

// Utility Types
export type {
    AgentAttributes,
    ApiKeyConfig,
    TemplateOptions
} from '@/utils/types/agent/utils';

// Re-export type guards
export { 
    AgentTypeGuards,
    AgentStoreTypeGuards,
    AgentConfigTypeGuards,
    AgentActionTypeGuards
} from '@/utils/types/agent';

// Re-export enums
export { AGENT_STATUS_enum } from '@/utils/types/common/enums';

// Re-export validation utilities
export {
    validateAgentConfig,
    validateAgentAttributes,
    validateAgentCapabilities
} from '@/utils/types/agent/validation';

/**
 * Export a use hook for consuming the store
 */
export const useAgentStore = (selector: (state: IAgentState) => unknown) => {
    const store = createAgentStore({
        name: 'agent-store',
        middleware: {
            devtools: true,
            subscribeWithSelector: true
        }
    });
    return store(selector);
};

/**
 * Export default singleton store instance
 */
export default createAgentStore({
    name: 'agent-store',
    middleware: {
        devtools: true,
        subscribeWithSelector: true
    }
});