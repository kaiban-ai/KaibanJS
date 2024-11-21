/**
 * @file promptsTypes.ts
 * @path KaibanJS/src/types/agent/promptsTypes.ts
 * @description Type definitions for agent prompt templates
 * 
 * @module types/agent
 */

import { IAgentType } from './agentBaseTypes';
import { ITaskType } from '../task/taskBaseTypes';
import { IParsedOutput } from '../llm/llmResponseTypes';

// ─── Base Prompt Template ─────────────────────────────────────────────────────

/**
 * Base prompt template function type
 */
export interface IAgentPromptTemplate {
    (params: any): string;
}

// ─── Prompt Parameters ─────────────────────────────────────────────────────────

/**
 * System message parameters
 */
export interface ISystemMessageParams {
    agent: IAgentType;
    task: ITaskType;
}

/**
 * Initial message parameters
 */
export interface IInitialMessageParams {
    agent: IAgentType;
    task: ITaskType;
    context?: string;
}

/**
 * Invalid JSON feedback parameters
 */
export interface IInvalidJSONFeedbackParams {
    agent: IAgentType;
    task: ITaskType;
    llmOutput: string;
}

/**
 * Thought with self-question parameters
 */
export interface IThoughtWithSelfQuestionParams {
    agent: IAgentType;
    task: ITaskType;
    thought: string;
    question: string;
    parsedLLMOutput?: IParsedOutput;
}

/**
 * Thought feedback parameters
 */
export interface IThoughtFeedbackParams {
    agent: IAgentType;
    task: ITaskType;
    thought: string;
    parsedLLMOutput?: IParsedOutput;
}

/**
 * Self-question parameters
 */
export interface ISelfQuestionParams {
    agent: IAgentType;
    task: ITaskType;
    question: string;
    parsedLLMOutput?: IParsedOutput;
}

/**
 * Tool result parameters
 */
export interface IToolResultParams {
    agent: IAgentType;
    task: ITaskType;
    toolResult: string | object;
    parsedLLMOutput?: IParsedOutput;
}

/**
 * Tool error parameters
 */
export interface IToolErrorParams {
    agent: IAgentType;
    task: ITaskType;
    toolName: string;
    error: Error;
    parsedLLMOutput?: IParsedOutput;
}

/**
 * Tool not exist parameters
 */
export interface IToolNotExistParams {
    agent: IAgentType;
    task: ITaskType;
    toolName: string;
    parsedLLMOutput?: IParsedOutput;
}

/**
 * Observation feedback parameters
 */
export interface IObservationFeedbackParams {
    agent: IAgentType;
    task: ITaskType;
    parsedLLMOutput?: IParsedOutput;
}

/**
 * Weird output feedback parameters
 */
export interface IWeirdOutputFeedbackParams {
    agent: IAgentType;
    task: ITaskType;
    parsedLLMOutput?: IParsedOutput;
}

/**
 * Force final answer parameters
 */
export interface IForceFinalAnswerParams {
    agent: IAgentType;
    task: ITaskType;
    iterations: number;
    maxAgentIterations: number;
}

/**
 * Feedback message parameters
 */
export interface IFeedbackMessageParams {
    agent: IAgentType;
    task: ITaskType;
    feedback: string;
}

// ─── Type Guards ─────────────────────────────────────────────────────────────

/**
 * Type guards for prompt-related types
 */
export const IPromptTypeGuards = {
    /**
     * Check if value is a valid prompt template
     */
    isPromptTemplate: (value: unknown): value is IAgentPromptTemplate => {
        return typeof value === 'function';
    },

    /**
     * Check if value is a valid REACT Champion agent prompts object
     */
    isREACTChampionAgentPrompts: (value: unknown): value is IREACTChampionAgentPrompts => {
        if (typeof value !== 'object' || value === null) return false;
        
        const prompts = value as Partial<IREACTChampionAgentPrompts>;
        return (
            typeof prompts.SYSTEM_MESSAGE === 'function' &&
            typeof prompts.INITIAL_MESSAGE === 'function' &&
            typeof prompts.INVALID_JSON_FEEDBACK === 'function' &&
            typeof prompts.THOUGHT_WITH_SELF_QUESTION_FEEDBACK === 'function' &&
            typeof prompts.THOUGHT_FEEDBACK === 'function' &&
            typeof prompts.SELF_QUESTION_FEEDBACK === 'function' &&
            typeof prompts.TOOL_RESULT_FEEDBACK === 'function' &&
            typeof prompts.TOOL_ERROR_FEEDBACK === 'function' &&
            typeof prompts.TOOL_NOT_EXIST_FEEDBACK === 'function' &&
            typeof prompts.OBSERVATION_FEEDBACK === 'function' &&
            typeof prompts.WEIRD_OUTPUT_FEEDBACK === 'function' &&
            typeof prompts.FORCE_FINAL_ANSWER_FEEDBACK === 'function' &&
            typeof prompts.WORK_ON_FEEDBACK_FEEDBACK === 'function'
        );
    }
};

// ─── REACT Champion Agent Prompts ───────────────────────────────────────────────

/**
 * Complete set of prompt templates for REACT Champion agents
 */
export interface IREACTChampionAgentPrompts {
    SYSTEM_MESSAGE: IAgentPromptTemplate & ((params: ISystemMessageParams) => string);
    INITIAL_MESSAGE: IAgentPromptTemplate & ((params: IInitialMessageParams) => string);
    INVALID_JSON_FEEDBACK: IAgentPromptTemplate & ((params: IInvalidJSONFeedbackParams) => string);
    THOUGHT_WITH_SELF_QUESTION_FEEDBACK: IAgentPromptTemplate & ((params: IThoughtWithSelfQuestionParams) => string);
    THOUGHT_FEEDBACK: IAgentPromptTemplate & ((params: IThoughtFeedbackParams) => string);
    SELF_QUESTION_FEEDBACK: IAgentPromptTemplate & ((params: ISelfQuestionParams) => string);
    TOOL_RESULT_FEEDBACK: IAgentPromptTemplate & ((params: IToolResultParams) => string);
    TOOL_ERROR_FEEDBACK: IAgentPromptTemplate & ((params: IToolErrorParams) => string);
    TOOL_NOT_EXIST_FEEDBACK: IAgentPromptTemplate & ((params: IToolNotExistParams) => string);
    OBSERVATION_FEEDBACK: IAgentPromptTemplate & ((params: IObservationFeedbackParams) => string);
    WEIRD_OUTPUT_FEEDBACK: IAgentPromptTemplate & ((params: IWeirdOutputFeedbackParams) => string);
    FORCE_FINAL_ANSWER_FEEDBACK: IAgentPromptTemplate & ((params: IForceFinalAnswerParams) => string);
    WORK_ON_FEEDBACK_FEEDBACK: IAgentPromptTemplate & ((params: IFeedbackMessageParams) => string);
}
