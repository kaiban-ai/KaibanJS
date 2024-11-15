/**
 * @file prompts.ts
 * @path KaibanJS/src/utils/types/agent/prompts.ts
 * @description Type definitions for agent prompt templates
 */

import { AgentType } from './base';
import { TaskType } from '../task/base';
import { ParsedOutput } from '../llm/responses';

// Common parameters for prompt template functions
export interface SystemMessageParams {
    agent: AgentType;
    task: TaskType;
}

export interface InitialMessageParams {
    agent: AgentType;
    task: TaskType;
    context?: string;
}

export interface InvalidJSONFeedbackParams {
    agent: AgentType;
    task: TaskType;
    llmOutput: string;
}

export interface ThoughtWithSelfQuestionParams {
    agent: AgentType;
    task: TaskType;
    thought: string;
    question: string;
    parsedLLMOutput?: ParsedOutput;
}

export interface ThoughtFeedbackParams {
    agent: AgentType;
    task: TaskType;
    thought: string;
    parsedLLMOutput?: ParsedOutput;
}

export interface SelfQuestionParams {
    agent: AgentType;
    task: TaskType;
    question: string;
    parsedLLMOutput?: ParsedOutput;
}

export interface ToolResultParams {
    agent: AgentType;
    task: TaskType;
    toolResult: string | object;
    parsedLLMOutput?: ParsedOutput;
}

export interface ToolErrorParams {
    agent: AgentType;
    task: TaskType;
    toolName: string;
    error: Error;
    parsedLLMOutput?: ParsedOutput;
}

export interface ToolNotExistParams {
    agent: AgentType;
    task: TaskType;
    toolName: string;
    parsedLLMOutput?: ParsedOutput;
}

export interface ObservationFeedbackParams {
    agent: AgentType;
    task: TaskType;
    parsedLLMOutput?: ParsedOutput;
}

export interface WeirdOutputFeedbackParams {
    agent: AgentType;
    task: TaskType;
    parsedLLMOutput?: ParsedOutput;
}

export interface ForceFinalAnswerParams {
    agent: AgentType;
    task: TaskType;
    iterations: number;
    maxAgentIterations: number;
}

export interface FeedbackMessageParams {
    agent: AgentType;
    task: TaskType;
    feedback: string;
}

// Comprehensive prompt template interface
export interface REACTChampionAgentPrompts {
    SYSTEM_MESSAGE: (params: SystemMessageParams) => string;
    INITIAL_MESSAGE: (params: InitialMessageParams) => string;
    INVALID_JSON_FEEDBACK: (params: InvalidJSONFeedbackParams) => string;
    THOUGHT_WITH_SELF_QUESTION_FEEDBACK: (params: ThoughtWithSelfQuestionParams) => string;
    THOUGHT_FEEDBACK: (params: ThoughtFeedbackParams) => string;
    SELF_QUESTION_FEEDBACK: (params: SelfQuestionParams) => string;
    TOOL_RESULT_FEEDBACK: (params: ToolResultParams) => string;
    TOOL_ERROR_FEEDBACK: (params: ToolErrorParams) => string;
    TOOL_NOT_EXIST_FEEDBACK: (params: ToolNotExistParams) => string;
    OBSERVATION_FEEDBACK: (params: ObservationFeedbackParams) => string;
    WEIRD_OUTPUT_FEEDBACK: (params: WeirdOutputFeedbackParams) => string;
    FORCE_FINAL_ANSWER_FEEDBACK: (params: ForceFinalAnswerParams) => string;
    WORK_ON_FEEDBACK_FEEDBACK: (params: FeedbackMessageParams) => string;
}
