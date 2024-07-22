//──── Agent Status Definitions ───────────────────────────────────────
// 
// INITIAL: The agent is set up and waiting to start the task.
// THINKING: The agent is strategizing and planning the approach based on the initial input.
// THOUGHT: The agent has formed a plan and is ready to act. This involves deciding on specific actions based on the reasoning.
// EXECUTING_ACTION: The agent is actively performing the actions determined in the thought phase.
// USING_TOOL: The agent is interacting with external tools to gather or verify information necessary for completing the task.
// OBSERVATION: The agent analyzes the results from the tools to update its understanding and plan.
// FINAL_ANSWER: The agent concludes the task with a final decision based on all collected and processed information.
// IDLE: The agent is idle, waiting for new instructions or tasks.
//
// ─────────────────────────────────────────────────────────────────────

const AGENT_STATUS_enum = {
    INITIAL: "INITIAL",
    THINKING: "THINKING", // LangChain Callback: llmStart()
    THINKING_ERROR: "THINKING_ERROR", // LangChain Callback: handleLLMError()
    THOUGHT: "THOUGHT",   // LangChain Callback: llmEnd()
    EXECUTING_ACTION: "EXECUTING_ACTION", // LangChain Callback: handleAgentAction()
    USING_TOOL: "USING_TOOL",   // LangChain Callback: handleToolStart()
    USING_TOOL_ERROR: "USING_TOOL_ERROR",   // LangChain Callback: handleToolError()
    OBSERVATION: "OBSERVATION", // LangChain Callback: handleToolEnd()
    FINAL_ANSWER: "FINAL_ANSWER", // LangChain Callback: handleAgentEnd(),
    TASK_COMPLETED: "TASK_COMPLETED", // Indicates all task operations, including final outputs, are completed
    MAX_ITERATIONS_ERROR: "MAX_ITERATIONS_ERROR", 
    IDLE: "IDLE",
}

// ──── Task Status Definitions ───────────────────────────────────────
// 
// TODO: Task is queued for initiation, awaiting processing.
// DOING: Task is actively being worked on.
// BLOCKED: Progress on the task is halted due to dependencies or obstacles.
// REVISE: Task requires additional review or adjustments.
// DONE: Task is completed and requires no further action.
// 
// ─────────────────────────────────────────────────────────────────────

const TASK_STATUS_enum = {
    TODO: 'TODO',
    DOING: 'DOING',
    BLOCKED: 'BLOCKED',
    REVISE: 'REVISE',
    DONE: 'DONE'
};

export { AGENT_STATUS_enum, TASK_STATUS_enum };