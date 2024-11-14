/**
 * @file prompts.ts
 * @path KaibanJS/src/utils/types/agent/prompts.ts
 * @description Type definitions for agent prompts and templates
 */

import type { IBaseAgent } from '@/utils/types/agent';
import type { TaskType } from '@/utils/types/task';
import type { Output } from '@/utils/types/llm';

// Base prompt parameters interface
export interface BasePromptParams {
    agent: IBaseAgent; // Agent instance
    task: TaskType; // Task being processed
}

// System message parameters
export interface SystemMessageParams extends BasePromptParams {
    systemContext?: string; // Additional system context
}

// Initial message parameters
export interface InitialMessageParams extends BasePromptParams {
    context?: string; // Additional context
}

// Invalid JSON feedback parameters
export interface InvalidJSONFeedbackParams extends BasePromptParams {
    llmOutput: string; // Raw LLM output
}

// Thought with self-question parameters
export interface ThoughtWithSelfQuestionParams extends BasePromptParams {
    thought: string; // Thought content
    question: string; // Question asked
    parsedLLMOutput: Output; // Parsed LLM output
}

// Thought feedback parameters
export interface ThoughtFeedbackParams extends BasePromptParams {
    thought: string; // Thought content
    parsedLLMOutput: Output; // Parsed LLM output
}

// Self question parameters
export interface SelfQuestionParams extends BasePromptParams {
    question: string; // Question content
    parsedLLMOutput: Output; // Parsed LLM output
}

// Tool result parameters
export interface ToolResultParams extends BasePromptParams {
    toolResult: string; // Tool execution result
    parsedLLMOutput: Output; // Parsed LLM output
}

// Tool error parameters
export interface ToolErrorParams extends BasePromptParams {
    toolName: string; // Tool name
    error: Error; // Error that occurred
    parsedLLMOutput: Output; // Parsed LLM output
}

// Tool not exist parameters
export interface ToolNotExistParams extends BasePromptParams {
    toolName: string; // Requested tool name
    parsedLLMOutput: Output; // Parsed LLM output
}

// Force final answer parameters
export interface ForceFinalAnswerParams extends BasePromptParams {
    iterations: number; // Current iteration
    maxAgentIterations: number; // Maximum iterations
}

// Feedback message parameters
export interface FeedbackMessageParams extends BasePromptParams {
    feedback: string; // Feedback content
}

// Observation feedback parameters
export interface ObservationFeedbackParams extends BasePromptParams {
    parsedLLMOutput: Output; // Parsed LLM output
}

// Weird output feedback parameters
export interface WeirdOutputFeedbackParams extends BasePromptParams {
    parsedLLMOutput: Output; // Parsed LLM output
}

// REACT Champion agent prompts interface
export interface REACTChampionAgentPrompts {
    SYSTEM_MESSAGE: (params: SystemMessageParams) => string; // Generate system message
    INITIAL_MESSAGE: (params: InitialMessageParams) => string; // Generate initial message
    INVALID_JSON_FEEDBACK: (params: InvalidJSONFeedbackParams) => string; // Generate invalid JSON feedback
    THOUGHT_WITH_SELF_QUESTION_FEEDBACK: (params: ThoughtWithSelfQuestionParams) => string; // Generate thought with self-question feedback
    THOUGHT_FEEDBACK: (params: ThoughtFeedbackParams) => string; // Generate thought feedback
    SELF_QUESTION_FEEDBACK: (params: SelfQuestionParams) => string; // Generate self question feedback
    TOOL_RESULT_FEEDBACK: (params: ToolResultParams) => string; // Generate tool result feedback
    TOOL_ERROR_FEEDBACK: (params: ToolErrorParams) => string; // Generate tool error feedback
    TOOL_NOT_EXIST_FEEDBACK: (params: ToolNotExistParams) => string; // Generate tool not exist feedback
    OBSERVATION_FEEDBACK: (params: ObservationFeedbackParams) => string; // Generate observation feedback
    WEIRD_OUTPUT_FEEDBACK: (params: WeirdOutputFeedbackParams) => string; // Generate weird output feedback
    FORCE_FINAL_ANSWER_FEEDBACK: (params: ForceFinalAnswerParams) => string; // Generate force final answer feedback
    WORK_ON_FEEDBACK_FEEDBACK: (params: FeedbackMessageParams) => string; // Generate work on feedback message
    [key: string]: unknown; // Additional templates
}
