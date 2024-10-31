/**
 * Path: C:\Users\pwalc\Documents\GroqEmailAssistant\KaibanJS\src\utils\core\enums.ts
 * 
 * Enumeration Definitions for KaibanJS
 * -----------------------------------
 * This file defines various enumerations used throughout the KaibanJS library, such as agent statuses,
 * task statuses, and workflow states. These enums provide a standardized set of constants that
 * facilitate clear and consistent state management and behavior handling across different components
 * of the library.
 * 
 * Usage:
 * Import and reference these enums to ensure consistent state management and behavior checks
 * across the library's various functional areas.
 */

/**
 * Agent Status Enumeration
 * 
 * Defines the various states an agent can be in during its lifecycle.
 * 
 * States and their LangChain callbacks:
 * - IDLE: Agent is available but not actively processing
 * - INITIAL: Agent is initialized but hasn't started processing
 * - THINKING: Agent is processing and analyzing (LangChain Callback: llmStart())
 * - THINKING_END: Agent has completed analysis (LangChain Callback: llmEnd())
 * - THINKING_ERROR: Agent encountered error during analysis (LangChain Callback: handleLLMError())
 * - THOUGHT: Agent has formed a plan (LangChain Callback: llmEnd() with THOUGH Present)
 * - EXECUTING_ACTION: Agent is performing actions (LangChain Callback: handleAgentAction())
 * - USING_TOOL: Agent is utilizing tools (LangChain Callback: handleToolStart())
 * - USING_TOOL_END: Agent has completed tool usage
 * - USING_TOOL_ERROR: Tool usage failed (LangChain Callback: handleToolError())
 * - TOOL_DOES_NOT_EXIST: Agent attempted to use non-existent tool
 * - OBSERVATION: Agent analyzing tool results (LangChain Callback: handleToolEnd())
 * - FINAL_ANSWER: Agent reached conclusion (LangChain Callback: handleAgentEnd())
 * - TASK_COMPLETED: All operations finished, including final outputs
 * - MAX_ITERATIONS_ERROR: Exceeded maximum allowed iterations
 * - ISSUES_PARSING_LLM_OUTPUT: Problems parsing LLM response
 * - SELF_QUESTION: Agent asking clarifying question
 * - ITERATING: Agent is in the process of an iteration
 * - ITERATION_START: Beginning new iteration
 * - ITERATION_END: Completed current iteration
 * - ITERATION_COMPLETE: Successfully completed all iterations
 * - MAX_ITERATIONS_EXCEEDED: Reached maximum iteration limit
 * - AGENTIC_LOOP_ERROR: Error in main processing loop
 * - WEIRD_LLM_OUTPUT: Received unexpected LLM output
 */
export enum AGENT_STATUS_enum {
    IDLE = "IDLE",
    INITIAL = "INITIAL",
    THINKING = "THINKING",
    THINKING_END = "THINKING_END",
    THINKING_ERROR = "THINKING_ERROR",
    THOUGHT = "THOUGHT",
    EXECUTING_ACTION = "EXECUTING_ACTION",
    USING_TOOL = "USING_TOOL",
    USING_TOOL_END = "USING_TOOL_END",
    USING_TOOL_ERROR = "USING_TOOL_ERROR",
    TOOL_DOES_NOT_EXIST = "TOOL_DOES_NOT_EXIST",
    OBSERVATION = "OBSERVATION",
    FINAL_ANSWER = "FINAL_ANSWER",
    TASK_COMPLETED = "TASK_COMPLETED",
    MAX_ITERATIONS_ERROR = "MAX_ITERATIONS_ERROR",
    ISSUES_PARSING_LLM_OUTPUT = "ISSUES_PARSING_LLM_OUTPUT",
    SELF_QUESTION = "SELF_QUESTION",
    ITERATING = "ITERATING",
    ITERATION_START = "ITERATION_START",
    ITERATION_END = "ITERATION_END",
    ITERATION_COMPLETE = "ITERATION_COMPLETE",
    MAX_ITERATIONS_EXCEEDED = "MAX_ITERATIONS_EXCEEDED",
    AGENTIC_LOOP_ERROR = "AGENTIC_LOOP_ERROR",
    WEIRD_LLM_OUTPUT = "WEIRD_LLM_OUTPUT"
}

/**
 * Task Status Enumeration
 * 
 * Defines the various states a task can be in during its lifecycle.
 * 
 * States:
 * - PENDING: Task is initialized but not yet started
 * - TODO: Task is queued for initiation, awaiting processing
 * - DOING: Task is actively being worked on
 * - BLOCKED: Progress is halted due to dependencies or obstacles
 * - REVISE: Task requires additional review or adjustments
 * - DONE: Task is completed and requires no further action
 * - ERROR: Task encountered an error during execution
 * - AWAITING_VALIDATION: Task is completed but needs validation or approval
 * - VALIDATED: Task has been verified and confirmed as correctly completed
 */
export enum TASK_STATUS_enum {
    PENDING = 'PENDING',
    TODO = 'TODO',
    DOING = 'DOING',
    BLOCKED = 'BLOCKED',
    REVISE = 'REVISE',
    DONE = 'DONE',
    ERROR = 'ERROR', 
    AWAITING_VALIDATION = 'AWAITING_VALIDATION',
    VALIDATED = 'VALIDATED'
}

/**
 * Workflow Status Enumeration
 * 
 * Defines the various states a workflow can be in during its lifecycle.
 * 
 * States:
 * - INITIAL: The very beginning of the workflow process, before any action
 * - RUNNING: Workflow is actively processing tasks in full operation
 * - STOPPING: Workflow is being stopped (completion, manual stop, etc.)
 * - STOPPED: Workflow has been completely stopped, ready for review/restart
 * - ERRORED: Workflow encountered critical issue, requires intervention
 * - FINISHED: Successfully completed all tasks, no further actions needed
 * - BLOCKED: Cannot proceed due to blocked tasks, needs review/recovery
 */
export enum WORKFLOW_STATUS_enum {
    INITIAL = 'INITIAL',
    RUNNING = 'RUNNING',
    STOPPING = 'STOPPING',
    STOPPED = 'STOPPED',
    ERRORED = 'ERRORED',
    FINISHED = 'FINISHED',
    BLOCKED = 'BLOCKED'
}

/**
 * Feedback Status Enumeration
 * 
 * Defines the various states feedback can be in during processing.
 * 
 * States:
 * - PENDING: Feedback has been received but not yet processed/addressed
 * - PROCESSED: Feedback has been successfully handled and incorporated
 */
export enum FEEDBACK_STATUS_enum {
    PENDING = 'PENDING',
    PROCESSED = 'PROCESSED'
}