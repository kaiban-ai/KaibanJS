/**
 * @file prompts.ts
 * @path src/utils/types/agent/prompts.ts
 * @description Type definitions for agent prompts and templates
 */

import type { IBaseAgent } from '@/utils/types/agent';
import type { TaskType } from '@/utils/types/task';
import type { Output } from '@/utils/types/llm';

/**
 * Base prompt parameters interface
 */
export interface BasePromptParams {
    /** Agent instance */
    agent: IBaseAgent;
    
    /** Task being processed */
    task: TaskType;
}

/**
 * System message parameters
 */
export interface SystemMessageParams extends BasePromptParams {
    /** Additional system context */
    systemContext?: string;
}

/**
 * Initial message parameters
 */
export interface InitialMessageParams extends BasePromptParams {
    /** Additional context */
    context?: string;
}

/**
 * Invalid JSON feedback parameters
 */
export interface InvalidJSONFeedbackParams extends BasePromptParams {
    /** Raw LLM output */
    llmOutput: string;
}

/**
 * Thought with self-question parameters
 */
export interface ThoughtWithSelfQuestionParams extends BasePromptParams {
    /** Thought content */
    thought: string;
    
    /** Question asked */
    question: string;
    
    /** Parsed LLM output */
    parsedLLMOutput: Output;
}

/**
 * Thought feedback parameters
 */
export interface ThoughtFeedbackParams extends BasePromptParams {
    /** Thought content */
    thought: string;
    
    /** Parsed LLM output */
    parsedLLMOutput: Output;
}

/**
 * Self question parameters
 */
export interface SelfQuestionParams extends BasePromptParams {
    /** Question content */
    question: string;
    
    /** Parsed LLM output */
    parsedLLMOutput: Output;
}

/**
 * Tool result parameters
 */
export interface ToolResultParams extends BasePromptParams {
    /** Tool execution result */
    toolResult: string;
    
    /** Parsed LLM output */
    parsedLLMOutput: Output;
}

/**
 * Tool error parameters
 */
export interface ToolErrorParams extends BasePromptParams {
    /** Tool name */
    toolName: string;
    
    /** Error that occurred */
    error: Error;
    
    /** Parsed LLM output */
    parsedLLMOutput: Output;
}

/**
 * Tool not exist parameters
 */
export interface ToolNotExistParams extends BasePromptParams {
    /** Requested tool name */
    toolName: string;
    
    /** Parsed LLM output */
    parsedLLMOutput: Output;
}

/**
 * Force final answer parameters
 */
export interface ForceFinalAnswerParams extends BasePromptParams {
    /** Current iteration */
    iterations: number;
    
    /** Maximum iterations */
    maxAgentIterations: number;
}

/**
 * Feedback message parameters
 */
export interface FeedbackMessageParams extends BasePromptParams {
    /** Feedback content */
    feedback: string;
}

/**
 * Observation feedback parameters
 */
export interface ObservationFeedbackParams extends BasePromptParams {
    /** Parsed LLM output */
    parsedLLMOutput: Output;
}

/**
 * Weird output feedback parameters
 */
export interface WeirdOutputFeedbackParams extends BasePromptParams {
    /** Parsed LLM output */
    parsedLLMOutput: Output;
}

/**
 * REACT Champion agent prompts interface
 */
export interface REACTChampionAgentPrompts {
    /** Generate system message */
    SYSTEM_MESSAGE: (params: SystemMessageParams) => string;
    
    /** Generate initial message */
    INITIAL_MESSAGE: (params: InitialMessageParams) => string;
    
    /** Generate invalid JSON feedback */
    INVALID_JSON_FEEDBACK: (params: InvalidJSONFeedbackParams) => string;
    
    /** Generate thought with self-question feedback */
    THOUGHT_WITH_SELF_QUESTION_FEEDBACK: (params: ThoughtWithSelfQuestionParams) => string;
    
    /** Generate thought feedback */
    THOUGHT_FEEDBACK: (params: ThoughtFeedbackParams) => string;
    
    /** Generate self question feedback */
    SELF_QUESTION_FEEDBACK: (params: SelfQuestionParams) => string;
    
    /** Generate tool result feedback */
    TOOL_RESULT_FEEDBACK: (params: ToolResultParams) => string;
    
    /** Generate tool error feedback */
    TOOL_ERROR_FEEDBACK: (params: ToolErrorParams) => string;
    
    /** Generate tool not exist feedback */
    TOOL_NOT_EXIST_FEEDBACK: (params: ToolNotExistParams) => string;
    
    /** Generate observation feedback */
    OBSERVATION_FEEDBACK: (params: ObservationFeedbackParams) => string;
    
    /** Generate weird output feedback */
    WEIRD_OUTPUT_FEEDBACK: (params: WeirdOutputFeedbackParams) => string;
    
    /** Generate force final answer feedback */
    FORCE_FINAL_ANSWER_FEEDBACK: (params: ForceFinalAnswerParams) => string;
    
    /** Generate work on feedback message */
    WORK_ON_FEEDBACK_FEEDBACK: (params: FeedbackMessageParams) => string;

    /** Additional templates */
    [key: string]: unknown;
}