/**
 * ### Agent status
 * @enum {string}
 * @readonly
 * @property {string} INITIAL - The agent is set up and waiting to start the task.
 * @property {string} THINKING - The agent is strategizing and planning the approach based on the initial input.
 * @property {string} THOUGHT - The agent has formed a plan and is ready to act. This involves deciding on specific actions based on the reasoning.
 * @property {string} EXECUTING_ACTION - The agent is actively performing the actions determined in the thought phase.
 * @property {string} USING_TOOL - The agent is interacting with external tools to gather or verify information necessary for completing the task.
 * @property {string} OBSERVATION - The agent analyzes the results from the tools to update its understanding and plan.
 * @property {string} FINAL_ANSWER - The agent concludes the task with a final decision based on all collected and processed information.
 * @property {string} IDLE - The agent is idle, waiting for new instructions or tasks.
 * @property {string} OUTPUT_SCHEMA_VALIDATION_ERROR - The agent's output failed to match the required schema structure and needs correction.
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
  SELF_QUESTION = 'SELF_QUESTION',
  ITERATION_START = 'ITERATION_START',
  ITERATION_END = 'ITERATION_END',
  AGENTIC_LOOP_ERROR = 'AGENTIC_LOOP_ERROR',
  WEIRD_LLM_OUTPUT = 'WEIRD_LLM_OUTPUT',
  OUTPUT_SCHEMA_VALIDATION_ERROR = 'OUTPUT_SCHEMA_VALIDATION_ERROR',
}

/**
 * ### Task status
 * @enum {string}
 * @readonly
 * @property {string} TODO - Task is queued for initiation, awaiting processing.
 * @property {string} DOING - Task is actively being worked on.
 * @property {string} BLOCKED - Progress on the task is halted due to dependencies or obstacles.
 * @property {string} REVISE - Task requires additional review or adjustments.
 * @property {string} DONE - Task is completed and requires no further action.
 */
export declare enum TASK_STATUS_enum {
  TODO = 'TODO',
  DOING = 'DOING',
  BLOCKED = 'BLOCKED',
  REVISE = 'REVISE',
  DONE = 'DONE',
}

/**
 * ### Workflow status
 * @enum {string}
 * @readonly
 * @property {string} INITIAL - The very beginning of the workflow process, before any action has been initiated.
 * @property {string} RUNNING - The workflow is actively processing tasks, indicating that the workflow is in full operation.
 * @property {string} STOPPING - The workflow is in the process of being stopped, which could be due to task completion, a manual stop command, or other reasons.
 * @property {string} STOPPED - The workflow has been completely stopped and is in a stable state, ready for review or restart.
 * @property {string} ERRORED - The workflow has encountered a critical issue and has halted unexpectedly, requiring error handling or intervention.
 * @property {string} FINISHED - The workflow has successfully completed all its tasks and no further operational actions are required.
 * @property {string} BLOCKED - The workflow is unable to proceed due to one or more tasks being blocked, requiring administrative review or automated recovery actions to resume or terminate the blocked tasks.
 */
export declare enum WORKFLOW_STATUS_enum {
  INITIAL = 'INITIAL',
  RUNNING = 'RUNNING',
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
