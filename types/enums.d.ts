/**
 * ### Agent status
 * @enum {string}
 * @readonly
 * @property {string} INITIAL - The agent is set up and waiting to start the task.
 * @property {string} THINKING - The agent is strategizing and planning the approach based on the initial input.
 * @property {string} THINKING_END - LangChain Callback: llmEnd()
 * @property {string} THINKING_ERROR - LangChain Callback: handleLLMError()
 * @property {string} THOUGHT - The agent has formed a plan and is ready to act based on reasoning.
 * @property {string} EXECUTING_ACTION - The agent is actively performing the actions determined in the thought phase.
 * @property {string} USING_TOOL - The agent is interacting with external tools to gather or verify information.
 * @property {string} USING_TOOL_END - Tool usage has completed successfully.
 * @property {string} USING_TOOL_ERROR - LangChain Callback: handleToolError()
 * @property {string} TOOL_DOES_NOT_EXIST - Requested tool was not found.
 * @property {string} OBSERVATION - The agent analyzes the results from the tools to update its understanding.
 * @property {string} FINAL_ANSWER - The agent concludes the task with a final decision.
 * @property {string} TASK_COMPLETED - Indicates all task operations, including final outputs, are completed.
 * @property {string} MAX_ITERATIONS_ERROR - Maximum number of iterations reached.
 * @property {string} ISSUES_PARSING_LLM_OUTPUT - Problems parsing the LLM's response.
 * @property {string} ISSUES_PARSING_SCHEMA_OUTPUT - Problems parsing against the output schema.
 * @property {string} SELF_QUESTION - Agent is asking itself a clarifying question.
 * @property {string} ITERATION_START - Beginning of a new iteration.
 * @property {string} ITERATION_END - End of current iteration.
 * @property {string} AGENTIC_LOOP_ERROR - Error in the agent's decision loop.
 * @property {string} WEIRD_LLM_OUTPUT - Unexpected or malformed LLM output.
 * @property {string} TASK_ABORTED - Task has been aborted.
 * @property {string} PAUSED - Agent has been paused.
 * @property {string} RESUMED - Agent has been resumed.
 */
export declare enum AGENT_STATUS_enum {
  INITIAL = 'INITIAL',
  THINKING = 'THINKING',
  THINKING_END = 'THINKING_END',
  THINKING_ERROR = 'THINKING_ERROR',
  THOUGHT = 'THOUGHT',
  EXECUTING_ACTION = 'EXECUTING_ACTION',
  USING_TOOL = 'USING_TOOL',
  USING_TOOL_END = 'USING_TOOL_END',
  USING_TOOL_ERROR = 'USING_TOOL_ERROR',
  TOOL_DOES_NOT_EXIST = 'TOOL_DOES_NOT_EXIST',
  OBSERVATION = 'OBSERVATION',
  FINAL_ANSWER = 'FINAL_ANSWER',
  TASK_COMPLETED = 'TASK_COMPLETED',
  MAX_ITERATIONS_ERROR = 'MAX_ITERATIONS_ERROR',
  ISSUES_PARSING_LLM_OUTPUT = 'ISSUES_PARSING_LLM_OUTPUT',
  ISSUES_PARSING_SCHEMA_OUTPUT = 'ISSUES_PARSING_SCHEMA_OUTPUT',
  SELF_QUESTION = 'SELF_QUESTION',
  ITERATION_START = 'ITERATION_START',
  ITERATION_END = 'ITERATION_END',
  AGENTIC_LOOP_ERROR = 'AGENTIC_LOOP_ERROR',
  WEIRD_LLM_OUTPUT = 'WEIRD_LLM_OUTPUT',
  TASK_ABORTED = 'TASK_ABORTED',
  PAUSED = 'PAUSED',
  RESUMED = 'RESUMED',
}

/**
 * ### Task status
 * @enum {string}
 * @readonly
 * @property {string} TODO - Task is queued for initiation, awaiting processing.
 * @property {string} DOING - Task is actively being worked on.
 * @property {string} BLOCKED - Progress on the task is halted due to dependencies or obstacles.
 * @property {string} PAUSED - Task is paused due to an external interruption.
 * @property {string} RESUMED - Task has been resumed after being paused.
 * @property {string} REVISE - Task requires additional review or adjustments.
 * @property {string} DONE - Task is completed and requires no further action.
 * @property {string} AWAITING_VALIDATION - Task is completed but requires validation or approval.
 * @property {string} VALIDATED - Task has been validated and confirmed as correctly completed.
 */
export declare enum TASK_STATUS_enum {
  TODO = 'TODO',
  DOING = 'DOING',
  BLOCKED = 'BLOCKED',
  PAUSED = 'PAUSED',
  RESUMED = 'RESUMED',
  REVISE = 'REVISE',
  DONE = 'DONE',
  AWAITING_VALIDATION = 'AWAITING_VALIDATION',
  VALIDATED = 'VALIDATED',
}

/**
 * ### Workflow status
 * @enum {string}
 * @readonly
 * @property {string} INITIAL - The very beginning of the workflow process, before any action has been initiated.
 * @property {string} RUNNING - The workflow is actively processing tasks, indicating that the workflow is in full operation.
 * @property {string} PAUSED - The workflow is paused, which could be due to task completion, a manual stop command, or other reasons.
 * @property {string} RESUMED - The workflow is resumed after being paused.
 * @property {string} STOPPING - The workflow is in the process of being stopped.
 * @property {string} STOPPED - The workflow has been completely stopped and is in a stable state, ready for review or restart.
 * @property {string} ERRORED - The workflow has encountered a critical issue and has halted unexpectedly, requiring error handling or intervention.
 * @property {string} FINISHED - The workflow has successfully completed all its tasks and no further operational actions are required.
 * @property {string} BLOCKED - The workflow is unable to proceed due to one or more tasks being blocked, requiring administrative review or automated recovery actions.
 */
export declare enum WORKFLOW_STATUS_enum {
  INITIAL = 'INITIAL',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  RESUMED = 'RESUMED',
  STOPPING = 'STOPPING',
  STOPPED = 'STOPPED',
  ERRORED = 'ERRORED',
  FINISHED = 'FINISHED',
  BLOCKED = 'BLOCKED',
}

/**
 * ### Kanban Tools
 * @enum {string}
 * @readonly
 * @property {string} BLOCK_TASK - Tool for blocking tasks that cannot or should not proceed.
 */
export declare enum KANBAN_TOOLS_enum {
  BLOCK_TASK = 'block-task-tool',
}

/**
 * ### Feedback status
 * @enum {string}
 * @readonly
 * @property {string} PENDING - Feedback has been received but not yet processed or addressed.
 * @property {string} PROCESSED - Feedback has been successfully addressed and incorporated.
 */
export declare enum FEEDBACK_STATUS_enum {
  PENDING = 'PENDING',
  PROCESSED = 'PROCESSED',
}

/**
 * ### Workflow action
 * @enum {string}
 * @readonly
 * @property {string} STOP - Stop the workflow.
 * @property {string} PAUSE - Pause the workflow.
 * @property {string} RESUME - Resume the workflow.
 * @property {string} INITIATE - Start the workflow.
 */
export declare enum WORKFLOW_ACTION_enum {
  STOP = 'STOP',
  PAUSE = 'PAUSE',
  RESUME = 'RESUME',
  INITIATE = 'INITIATE',
}
