/**
 * @file index.ts
 * @path KaibanJS/src/types/agent/index.ts
 * @description Central export file for agent-related types
 *
 * @module types/agent
 */

// ─── Base Agent Types ─────────────────────────────────────────────────────────

export type {
    IAgentType,
    IBaseAgent,
    IAgentMetadata,
    IAgentCapabilities,
    IAgentMetrics,
    IExecutableAgent,
    IReactChampionAgent,
    IStatusType
} from './agentBaseTypes';

export {
    IAgentTypeGuards
} from './agentBaseTypes';

// ─── Validation Types ─────────────────────────────────────────────────────────

export type {
    IAgentValidationSchema,
    IAgentValidationResult,
    IAgentSelectionCriteria,
    IAgentCreationResult
} from './agentValidationTypes';

// ─── State Types ────────────────────────────────────────────────────────────

export type {
    IAgentExecutionState
} from './agentStateTypes';

// ─── Store Types ────────────────────────────────────────────────────────────

export type {
    IAgentStoreMethods,
    IAgentState,
    IAgentStoreConfig
} from './agentStoreTypes';

// ─── Prompt Types ────────────────────────────────────────────────────────────

export type {
    // Base prompt template
    IAgentPromptTemplate,
    
    // REACT Champion agent prompts
    IREACTChampionAgentPrompts,
    
    // Parameter types
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

// ─── Type Guards ────────────────────────────────────────────────────────────

export {
    IPromptTypeGuards
} from './promptsTypes';
