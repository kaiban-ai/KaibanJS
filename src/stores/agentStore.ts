/**
 * Agent Store Configuration.
 *
 * This file configures a Zustand store specifically for managing the state of agents within the KaibanJS library.
 * It outlines actions and state changes related to the lifecycle of agents, including task execution, status updates, and error handling.
 *
 * Usage:
 * Employ this store to handle state updates for agents dynamically throughout the lifecycle of their tasks and interactions.
 */

import { AGENT_STATUS_enum, TASK_STATUS_enum } from '../utils/enums';
import { logger } from '../utils/logger';
import { StateCreator } from 'zustand';
import { AgentStoreState } from './agentStore.types';
import { CombinedStoresState } from './teamStore.types';
import {
  WorkflowLog,
  AgentActionLog,
  AgentIterationLog,
  AgentBlockLog,
  TaskCompletionLog,
  TaskValidationLog,
  WorkflowStatusLog,
  AgentActionMetadata,
  AgentIterationMetadata,
  AgentBlockMetadata,
  TaskCompletionMetadata,
  TaskValidationMetadata,
} from '../utils/workflowLogs.types';
import { ParsedLLMOutput, ThinkingResult } from '../utils/llm.types';
import { LLMInvocationError } from '../utils/errors';
import { Agent, Task } from '..';

type ToolOutput = {
  action?: string;
  reason?: string;
  result?: any;
  [key: string]: any;
};

type WorkflowMetadata = {
  output?: ToolOutput | ParsedLLMOutput | ThinkingResult;
  tool?: string;
  toolName?: string;
  error?: Error | LLMInvocationError;
  iterations?: number;
  maxAgentIterations?: number;
  result?: any;
  isAgentDecision?: boolean;
  blockReason?: string;
  blockedBy?: string;
};

interface AgentTaskParams {
  agent: Agent;
  task: Task;
  error?: Error;
}

export const useAgentStore: StateCreator<
  CombinedStoresState,
  [],
  [],
  AgentStoreState
> = (set, get) => ({
  prepareNewLog: ({
    task,
    agent,
    metadata,
    logType,
    agentStatus,
    taskStatus,
    logDescription,
  }): WorkflowLog => {
    const baseLog = {
      timestamp: Date.now(),
      logDescription,
    };

    if (logType === 'AgentStatusUpdate') {
      if (
        agentStatus === AGENT_STATUS_enum.ITERATION_START ||
        agentStatus === AGENT_STATUS_enum.ITERATION_END
      ) {
        return {
          ...baseLog,
          logType,
          task,
          agentStatus,
          metadata: metadata as AgentIterationMetadata,
        } as AgentIterationLog;
      } else if (agentStatus === AGENT_STATUS_enum.DECIDED_TO_BLOCK_TASK) {
        return {
          ...baseLog,
          logType,
          task,
          agentStatus,
          metadata: metadata as AgentBlockMetadata,
        } as AgentBlockLog;
      } else {
        return {
          ...baseLog,
          logType,
          task,
          agentStatus,
          metadata: metadata as AgentActionMetadata,
        } as AgentActionLog;
      }
    } else if (logType === 'TaskStatusUpdate') {
      if (taskStatus === 'DONE') {
        return {
          ...baseLog,
          logType,
          task,
          agent,
          taskStatus,
          metadata: metadata as TaskCompletionMetadata,
        } as TaskCompletionLog;
      } else if (
        taskStatus === 'VALIDATED' ||
        taskStatus === 'AWAITING_VALIDATION'
      ) {
        return {
          ...baseLog,
          logType,
          task,
          agent,
          taskStatus,
          metadata: metadata as TaskValidationMetadata,
        } as TaskValidationLog;
      }
    }

    // Default case for workflow status updates
    return {
      ...baseLog,
      logType,
      task,
      agent,
      metadata,
      workflowStatus: agentStatus,
    } as WorkflowStatusLog;
  },

  handleAgentIterationStart: ({
    agent,
    task,
    iterations,
    maxAgentIterations,
  }) => {
    agent.status = AGENT_STATUS_enum.ITERATION_START;
    const newLog = get().prepareNewLog({
      task,
      logDescription: `🏁 Agent ${agent.name} - ${
        AGENT_STATUS_enum.ITERATION_START
      } (${iterations + 1}/${maxAgentIterations})`,
      metadata: { iterations, maxAgentIterations },
      logType: 'AgentStatusUpdate',
      agentStatus: agent.status,
    });
    logger.trace(
      `🏁 ${AGENT_STATUS_enum.ITERATION_START}: Agent ${agent.name} -  (${
        iterations + 1
      }/${maxAgentIterations})`
    );
    set((state) => ({ workflowLogs: [...state.workflowLogs, newLog] }));
  },

  handleAgentIterationEnd: ({
    agent,
    task,
    iterations,
    maxAgentIterations,
  }) => {
    agent.status = AGENT_STATUS_enum.ITERATION_END;
    const newLog = get().prepareNewLog({
      task,
      logDescription: `🔄 Agent ${agent.name} - ${AGENT_STATUS_enum.ITERATION_END}`,
      metadata: { iterations, maxAgentIterations },
      logType: 'AgentStatusUpdate',
      agentStatus: agent.status,
    });
    logger.trace(
      `🔄 ${AGENT_STATUS_enum.ITERATION_END}: Agent ${agent.name} ended another iteration.`
    );
    set((state) => ({ workflowLogs: [...state.workflowLogs, newLog] }));
  },

  handleAgentThinkingStart: ({ agent, task, messages }) => {
    agent.status = AGENT_STATUS_enum.THINKING;
    const newLog = get().prepareNewLog({
      task,
      logDescription: `🤔 Agent ${agent.name} starts thinking...`,
      metadata: { messages },
      logType: 'AgentStatusUpdate',
      agentStatus: agent.status,
    });
    logger.info(
      `🤔 ${AGENT_STATUS_enum.THINKING}: Agent ${agent.name} starts thinking...`
    );
    logger.debug('System Message:', messages[0]);
    logger.debug('Feedback Message:', messages[messages.length - 1].content);
    logger.debug('All Messages', messages);
    set((state) => ({ workflowLogs: [...state.workflowLogs, newLog] }));
  },

  handleAgentThinkingEnd: ({ agent, task, output }) => {
    agent.status = AGENT_STATUS_enum.THINKING_END;
    const newLog = get().prepareNewLog({
      task,
      logDescription: `🤔 Agent ${agent.name} finished thinking.`,
      metadata: { output },
      logType: 'AgentStatusUpdate',
      agentStatus: agent.status,
    });
    logger.info(
      `💡 ${AGENT_STATUS_enum.THINKING_END}: Agent ${agent.name} finished thinking.`
    );
    logger.trace(`Output:`, output.parsedLLMOutput);
    logger.trace(`Usage:`, output.llmUsageStats);
    set((state) => ({ workflowLogs: [...state.workflowLogs, newLog] }));
  },

  handleAgentThinkingError: ({ agent, task, error }) => {
    const errorToLog = error.originalError || error;
    agent.status = AGENT_STATUS_enum.THINKING_ERROR;
    const newLog = get().prepareNewLog({
      task,
      logDescription: `🛑 Agent ${agent.name} encountered an error during ${AGENT_STATUS_enum.THINKING}.`,
      metadata: { error: errorToLog },
      logType: 'AgentStatusUpdate',
      agentStatus: agent.status,
    });
    logger.error(
      `🛑 ${AGENT_STATUS_enum.THINKING_ERROR}: Agent ${
        agent.name
      } encountered an error thinking. Further details: ${
        error.name ? error.name : 'No additional error details'
      }`,
      errorToLog.message
    );
    set((state) => ({
      workflowLogs: [...state.workflowLogs, newLog],
    }));
    get().handleTaskBlocked({ task, error });
  },

  handleAgentIssuesParsingLLMOutput: ({ agent, task, output, error }) => {
    agent.status = AGENT_STATUS_enum.ISSUES_PARSING_LLM_OUTPUT;
    const newLog = get().prepareNewLog({
      task,
      logDescription: `😡 Agent ${agent.name} found some ${AGENT_STATUS_enum.ISSUES_PARSING_LLM_OUTPUT}. ${error.message}`,
      metadata: { output, error },
      logType: 'AgentStatusUpdate',
      agentStatus: agent.status,
    });
    logger.debug(
      `😡 ${AGENT_STATUS_enum.ISSUES_PARSING_LLM_OUTPUT}: Agent ${agent.name} found issues parsing the LLM output. ${error.message}`
    );
    set((state) => ({ workflowLogs: [...state.workflowLogs, newLog] }));
  },

  handleAgentIssuesParsingSchemaOutput: ({ agent, task, output, error }) => {
    agent.status = AGENT_STATUS_enum.ISSUES_PARSING_SCHEMA_OUTPUT;
    const newLog = get().prepareNewLog({
      task,
      logDescription: `😡 Agent ${agent.name} found some ${AGENT_STATUS_enum.ISSUES_PARSING_SCHEMA_OUTPUT}. ${error.message}`,
      metadata: { output, error },
      logType: 'AgentStatusUpdate',
      agentStatus: agent.status,
    });
    logger.debug(
      `😡 ${AGENT_STATUS_enum.ISSUES_PARSING_SCHEMA_OUTPUT}: Agent ${agent.name} found issues parsing the Schema output. ${error.message}`
    );
    set((state) => ({ workflowLogs: [...state.workflowLogs, newLog] }));
  },

  handleAgentFinalAnswer: ({ agent, task, output }) => {
    agent.status = AGENT_STATUS_enum.FINAL_ANSWER;
    const newLog = get().prepareNewLog({
      task,
      logDescription: `🥳 Agent ${agent.name} got the ${AGENT_STATUS_enum.FINAL_ANSWER}`,
      metadata: { output },
      logType: 'AgentStatusUpdate',
      agentStatus: agent.status,
    });
    logger.info(
      `🥳 ${AGENT_STATUS_enum.FINAL_ANSWER}: Agent ${agent.name} arrived to the Final Answer.`
    );
    logger.debug(`${output.finalAnswer}`);
    set((state) => ({ workflowLogs: [...state.workflowLogs, newLog] }));
  },

  handleAgentThought: ({ agent, task, output }) => {
    agent.status = AGENT_STATUS_enum.THOUGHT;
    const newLog = get().prepareNewLog({
      task,
      logDescription: `💭 Agent ${agent.name} ${AGENT_STATUS_enum.THOUGHT}.`,
      metadata: { output },
      logType: 'AgentStatusUpdate',
      agentStatus: agent.status,
    });
    logger.info(
      `💭 ${AGENT_STATUS_enum.THOUGHT}: Agent ${agent.name} has a cool though.`
    );
    logger.info(`${output.thought}`);
    set((state) => ({ workflowLogs: [...state.workflowLogs, newLog] }));
  },

  handleAgentSelfQuestion: ({ agent, task, output }) => {
    agent.status = AGENT_STATUS_enum.SELF_QUESTION;
    const newLog = get().prepareNewLog({
      task,
      logDescription: `❓Agent ${agent.name} have a ${AGENT_STATUS_enum.SELF_QUESTION}`,
      metadata: { output },
      logType: 'AgentStatusUpdate',
      agentStatus: agent.status,
    });
    logger.info(
      `❓${AGENT_STATUS_enum.SELF_QUESTION}: Agent ${agent.name} have a self question.`
    );
    logger.debug(output);
    set((state) => ({ workflowLogs: [...state.workflowLogs, newLog] }));
  },

  handleAgentToolStart: ({ agent, task, tool, input }) => {
    agent.status = AGENT_STATUS_enum.USING_TOOL;
    const newLog = get().prepareNewLog({
      task,
      logDescription: `🛠️⏳ Agent ${agent.name} is ${AGENT_STATUS_enum.USING_TOOL} ${tool.name}...`,
      metadata: { tool: tool.name, input },
      logType: 'AgentStatusUpdate',
      agentStatus: agent.status,
    });
    logger.info(
      `🛠️⏳ ${AGENT_STATUS_enum.USING_TOOL}: Agent ${agent.name} is  using ${tool.name}...`
    );
    logger.debug(`Tool Input:`, input);
    set((state) => ({ workflowLogs: [...state.workflowLogs, newLog] }));
  },

  handleAgentToolEnd: ({ agent, task, output, tool }) => {
    agent.status = AGENT_STATUS_enum.USING_TOOL_END;
    const newLog = get().prepareNewLog({
      task,
      logDescription: `🛠️✅ ${AGENT_STATUS_enum.USING_TOOL_END}: Agent ${agent.name} - got results from tool:${tool.name}`,
      metadata: { output },
      logType: 'AgentStatusUpdate',
      agentStatus: agent.status,
    });
    logger.info(
      `🛠️✅ ${AGENT_STATUS_enum.USING_TOOL_END}: Agent ${agent.name} - got results from tool:${tool.name}`
    );
    logger.debug(`Tool Output:`, output);
    set((state) => ({
      workflowLogs: [...state.workflowLogs, newLog],
    }));
  },

  handleAgentToolError: ({ agent, task, tool, error }) => {
    agent.status = AGENT_STATUS_enum.USING_TOOL_ERROR;
    const newLog = get().prepareNewLog({
      task,
      logDescription: 'Error during tool use',
      metadata: { error },
      logType: 'AgentStatusUpdate',
      agentStatus: agent.status,
    });
    logger.error(
      `🛠️🛑 ${AGENT_STATUS_enum.USING_TOOL_ERROR}: Agent ${agent.name} found an error using the tool: ${tool.name}`
    );
    logger.error(error);
    set((state) => ({ workflowLogs: [...state.workflowLogs, newLog] }));
  },

  handleAgentToolDoesNotExist: ({ agent, task, toolName }) => {
    agent.status = AGENT_STATUS_enum.USING_TOOL_ERROR;
    const newLog = get().prepareNewLog({
      task,
      logDescription: `🛠️🚫 Agent ${agent.name} - Oops... it seems that the tool:${toolName} ${AGENT_STATUS_enum.TOOL_DOES_NOT_EXIST}.`,
      metadata: { tool: toolName },
      logType: 'AgentStatusUpdate',
      agentStatus: agent.status,
    });
    logger.warn(
      `🛠️🚫 ${AGENT_STATUS_enum.TOOL_DOES_NOT_EXIST}: Agent ${agent.name} - is trying to use a tool that does not exist. Tool Name:${toolName}.`
    );
    set((state) => ({ workflowLogs: [...state.workflowLogs, newLog] }));
  },

  handleAgentObservation: ({ agent, task, output }) => {
    agent.status = AGENT_STATUS_enum.OBSERVATION;
    const newLog = get().prepareNewLog({
      task,
      logDescription: `🔍 Agent ${agent.name} - ${AGENT_STATUS_enum.OBSERVATION}`,
      metadata: { output },
      logType: 'AgentStatusUpdate',
      agentStatus: agent.status,
    });
    logger.info(
      `🔍 ${AGENT_STATUS_enum.OBSERVATION}: Agent ${agent.name} made an observation.`
    );
    logger.debug(`${output.observation}`);
    set((state) => ({ workflowLogs: [...state.workflowLogs, newLog] }));
  },

  handleWeirdOutput: ({ agent, task, output }) => {
    agent.status = AGENT_STATUS_enum.WEIRD_LLM_OUTPUT;
    const newLog = get().prepareNewLog({
      task,
      logDescription: `🤔 Agent ${agent.name} - ${AGENT_STATUS_enum.WEIRD_LLM_OUTPUT}`,
      metadata: { output },
      logType: 'AgentStatusUpdate',
      agentStatus: agent.status,
    });
    logger.warn(
      `🤔 ${AGENT_STATUS_enum.WEIRD_LLM_OUTPUT} - Agent: ${agent.name}`
    );
    set((state) => ({ workflowLogs: [...state.workflowLogs, newLog] }));
  },

  handleAgentLoopError: ({
    agent,
    task,
    error,
    iterations,
    maxAgentIterations,
  }) => {
    agent.status = AGENT_STATUS_enum.AGENTIC_LOOP_ERROR;
    const newLog = get().prepareNewLog({
      task,
      logDescription: `🚨 Agent ${agent.name} - ${AGENT_STATUS_enum.AGENTIC_LOOP_ERROR} | Iterations: ${iterations}/${maxAgentIterations}`,
      metadata: { error, iterations, maxAgentIterations },
      logType: 'AgentStatusUpdate',
      agentStatus: agent.status,
    });
    logger.error(
      `🚨 ${AGENT_STATUS_enum.AGENTIC_LOOP_ERROR}  - Agent: ${agent.name} | Iterations: ${iterations}/${maxAgentIterations}`,
      error.message
    );
    set((state) => ({
      workflowLogs: [...state.workflowLogs, newLog],
    }));
    get().handleTaskBlocked({ task, error });
  },

  handleAgentTaskAborted: ({ agent, task, error }) => {
    agent.setStatus(AGENT_STATUS_enum.TASK_ABORTED);
    const newLog = get().prepareNewLog({
      task,
      logDescription: `🛑 Agent ${agent.name} - ${AGENT_STATUS_enum.TASK_ABORTED}`,
      metadata: { error },
      logType: 'AgentStatusUpdate',
      agentStatus: agent.status as AGENT_STATUS_enum,
    });
    logger.info(
      `🛑 ${AGENT_STATUS_enum.TASK_ABORTED}: Agent ${agent.name} - Task Aborted.`
    );
    set((state) => ({ workflowLogs: [...state.workflowLogs, newLog] }));
    get().handleTaskAborted({ task, error });
  },

  handleAgentMaxIterationsError: ({
    agent,
    task,
    error,
    iterations = -1,
    maxAgentIterations = -1,
  }) => {
    agent.status = AGENT_STATUS_enum.MAX_ITERATIONS_ERROR;
    const newLog = get().prepareNewLog({
      task,
      logDescription: `🛑 Agent ${agent.name} - ${AGENT_STATUS_enum.MAX_ITERATIONS_ERROR} | Iterations: ${iterations}`,
      metadata: { error, iterations, maxAgentIterations },
      logType: 'AgentStatusUpdate',
      agentStatus: agent.status,
    });

    logger.error(
      `🛑 ${AGENT_STATUS_enum.MAX_ITERATIONS_ERROR} - Agent ${agent.name} | Iterations: ${iterations}/${maxAgentIterations}. You can adjust the maxAgentIterations property in the agent initialization. Current value is ${maxAgentIterations}`
    );
    set((state) => ({
      workflowLogs: [...state.workflowLogs, newLog],
    }));
    get().handleTaskBlocked({ task, error });
  },

  handleAgentTaskCompleted: ({
    agent,
    task,
    result,
    iterations,
    maxAgentIterations,
  }) => {
    agent.status = AGENT_STATUS_enum.TASK_COMPLETED;
    const agentLog = get().prepareNewLog({
      task,
      logDescription: `🏁 Agent ${agent.name} - ${AGENT_STATUS_enum.TASK_COMPLETED}`,
      metadata: { result, iterations, maxAgentIterations } as WorkflowMetadata,
      logType: 'AgentStatusUpdate',
      agentStatus: agent.status,
    });
    logger.info(
      `🏁 ${AGENT_STATUS_enum.TASK_COMPLETED}: Agent ${agent.name} finished the given task.`
    );
    set((state) => ({
      workflowLogs: [...state.workflowLogs, agentLog],
    }));
    get().handleTaskCompleted({ agent, task, result });
  },

  handleAgentBlockTask: ({ agent, task, reason, metadata = {} }) => {
    agent.status = AGENT_STATUS_enum.DECIDED_TO_BLOCK_TASK;
    const blockLog = get().prepareNewLog({
      task,
      logDescription: `🚫 Agent ${agent.name} decided to block task: ${reason}`,
      metadata: {
        isAgentDecision: true,
        blockReason: reason,
        blockedBy: metadata.blockedBy || agent.name,
        ...metadata,
      } as WorkflowMetadata,
      logType: 'AgentStatusUpdate',
      agentStatus: agent.status,
    });

    logger.warn(`🚫 Agent ${agent.name} has decided to block task:`, {
      reason,
      metadata: blockLog.metadata,
    });

    set((state) => ({
      workflowLogs: [...state.workflowLogs, blockLog],
    }));

    const blockError = new Error(reason);
    (blockError as any).isAgentDecision = true;
    (blockError as any).metadata = metadata;

    get().handleTaskBlocked({ task, error: blockError });
  },

  handleAgentTaskPaused: ({ agent, task, error }: AgentTaskParams) => {
    agent.status = AGENT_STATUS_enum.PAUSED;
    const newLog = get().prepareNewLog({
      agent,
      task,
      logDescription: `🛑 Agent ${agent.name} - ${AGENT_STATUS_enum.PAUSED}`,
      metadata: { error },
      logType: 'AgentStatusUpdate',
      agentStatus: AGENT_STATUS_enum.PAUSED,
      taskStatus: TASK_STATUS_enum.PAUSED,
    });

    logger.info(
      `🛑 ${AGENT_STATUS_enum.PAUSED}: Agent ${agent.name} - Paused.`
    );
    set((state) => ({ workflowLogs: [...state.workflowLogs, newLog] }));
    get().handleTaskPaused({ task, error });
  },

  handleAgentTaskResumed: ({ agent, task, error }: AgentTaskParams) => {
    agent.status = AGENT_STATUS_enum.RESUMED;
    const newLog = get().prepareNewLog({
      agent,
      task,
      logDescription: `🔄 Agent ${agent.name} - ${AGENT_STATUS_enum.RESUMED}`,
      metadata: { error },
      logType: 'AgentStatusUpdate',
      agentStatus: AGENT_STATUS_enum.RESUMED,
      taskStatus: TASK_STATUS_enum.RESUMED,
    });

    logger.info(
      `🔄 ${AGENT_STATUS_enum.RESUMED}: Agent ${agent.name} - Resumed.`
    );
    set((state) => ({ workflowLogs: [...state.workflowLogs, newLog] }));
    get().handleTaskResumed({ task });
  },
});
