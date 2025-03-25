/**
 * Enumeration Definitions.
 *
 * This module defines various enumerations used throughout the KaibanJS library for managing
 * agent statuses, task statuses, workflow states, and other core system states.
 * These enums provide type-safe constants that facilitate clear and consistent state management.
 *
 * @module enums
 */

/**
 * Agent status states throughout their lifecycle
 * @enum {string}
 */
export enum AGENT_STATUS_enum {
  /** Initial state when agent is set up */
  INITIAL = 'INITIAL',
  /** Agent is strategizing (LangChain Callback: llmStart()) */
  THINKING = 'THINKING',
  /** Agent completed thinking (LangChain Callback: llmEnd()) */
  THINKING_END = 'THINKING_END',
  /** Error during thinking (LangChain Callback: handleLLMError()) */
  THINKING_ERROR = 'THINKING_ERROR',
  /** Thought formed (LangChain Callback: llmEnd() with THOUGHT present) */
  THOUGHT = 'THOUGHT',
  /** Executing planned action (LangChain Callback: handleAgentAction()) */
  EXECUTING_ACTION = 'EXECUTING_ACTION',
  /** Using a tool (LangChain Callback: handleToolStart()) */
  USING_TOOL = 'USING_TOOL',
  /** Completed tool usage */
  USING_TOOL_END = 'USING_TOOL_END',
  /** Error during tool usage (LangChain Callback: handleToolError()) */
  USING_TOOL_ERROR = 'USING_TOOL_ERROR',
  /** Requested tool doesn't exist */
  TOOL_DOES_NOT_EXIST = 'TOOL_DOES_NOT_EXIST',
  /** Observing results (LangChain Callback: handleToolEnd()) */
  OBSERVATION = 'OBSERVATION',
  /** Task conclusion (LangChain Callback: handleAgentEnd()) */
  FINAL_ANSWER = 'FINAL_ANSWER',
  /** All operations completed including outputs */
  TASK_COMPLETED = 'TASK_COMPLETED',
  /** Maximum iterations reached */
  MAX_ITERATIONS_ERROR = 'MAX_ITERATIONS_ERROR',
  /** Error parsing LLM output */
  ISSUES_PARSING_LLM_OUTPUT = 'ISSUES_PARSING_LLM_OUTPUT',
  /** Error parsing schema output */
  OUTPUT_SCHEMA_VALIDATION_ERROR = 'OUTPUT_SCHEMA_VALIDATION_ERROR',
  /** Error parsing schema output */
  ISSUES_PARSING_SCHEMA_OUTPUT = 'ISSUES_PARSING_SCHEMA_OUTPUT',
  /** Agent is asking itself a question */
  SELF_QUESTION = 'SELF_QUESTION',
  /** Starting a new iteration */
  ITERATION_START = 'ITERATION_START',
  /** Completed an iteration */
  ITERATION_END = 'ITERATION_END',
  /** Error in agentic loop */
  AGENTIC_LOOP_ERROR = 'AGENTIC_LOOP_ERROR',
  /** Unexpected LLM output */
  WEIRD_LLM_OUTPUT = 'WEIRD_LLM_OUTPUT',
  /** Agent decided to block the task */
  DECIDED_TO_BLOCK_TASK = 'DECIDED_TO_BLOCK_TASK',
  /** Task was aborted */
  TASK_ABORTED = 'TASK_ABORTED',
  /** Agent is paused */
  PAUSED = 'PAUSED',
  /** Agent is resumed */
  RESUMED = 'RESUMED',
}

/**
 * Task status states throughout their lifecycle
 * @enum {string}
 */
export enum TASK_STATUS_enum {
  /** Task is queued for initiation */
  TODO = 'TODO',
  /** Task is actively being worked on */
  DOING = 'DOING',
  /** Progress halted due to dependencies or obstacles */
  BLOCKED = 'BLOCKED',
  /** Task is temporarily paused */
  PAUSED = 'PAUSED',
  /** Task is resumed after being paused */
  RESUMED = 'RESUMED',
  /** Task requires review or adjustments */
  REVISE = 'REVISE',
  /** Task is completed */
  DONE = 'DONE',
  /** Task completed but needs validation */
  AWAITING_VALIDATION = 'AWAITING_VALIDATION',
  /** Task has been validated */
  VALIDATED = 'VALIDATED',
  /** Task has been aborted */
  ABORTED = 'ABORTED',
}

/**
 * Workflow status states throughout their lifecycle
 * @enum {string}
 */
export enum WORKFLOW_STATUS_enum {
  /** Initial workflow state */
  INITIAL = 'INITIAL',
  /** Workflow is actively processing */
  RUNNING = 'RUNNING',
  /** Workflow is temporarily paused */
  PAUSED = 'PAUSED',
  /** Workflow is resumed after being paused */
  RESUMED = 'RESUMED',
  /** Workflow is in process of stopping */
  STOPPING = 'STOPPING',
  /** Workflow has been stopped */
  STOPPED = 'STOPPED',
  /** Workflow encountered an error */
  ERRORED = 'ERRORED',
  /** Workflow completed successfully */
  FINISHED = 'FINISHED',
  /** Workflow is blocked by dependencies */
  BLOCKED = 'BLOCKED',
}

/**
 * Feedback status states
 * @enum {string}
 */
export enum FEEDBACK_STATUS_enum {
  /** Feedback received but not processed */
  PENDING = 'PENDING',
  /** Feedback has been addressed */
  PROCESSED = 'PROCESSED',
}

/**
 * Available Kanban tools that can be enabled/disabled
 * @enum {string}
 */
export enum KANBAN_TOOLS_enum {
  /** Tool for blocking tasks */
  BLOCK_TASK = 'block_task',
  /** @deprecated Use BLOCK_TASK instead */
  BLOCK_TASK_TOOL = 'block-task-tool',
}

/**
 * Workflow action types
 * @enum {string}
 */
export enum WORKFLOW_ACTION_enum {
  /** Stop the workflow */
  STOP = 'STOP',
  /** Pause the workflow */
  PAUSE = 'PAUSE',
  /** Resume the workflow */
  RESUME = 'RESUME',
  /** Start the workflow */
  INITIATE = 'INITIATE',
}
