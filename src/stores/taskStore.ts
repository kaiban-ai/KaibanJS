/**
 * Task Store Management.
 *
 * Defines the Zustand store slice for task management, handling task lifecycle events such as completion, updates, and errors.
 * It ensures tasks are managed consistently with the ability to react to changes in task status and handle errors effectively.
 *
 * Usage:
 * Use this store to manage tasks within your application, providing a robust system for updating and tracking task progress and state.
 */

import { ENUM_TASK_STATUS, ENUM_AGENT_STATUS } from "../utils/enums";
import { getTaskTitleForLogs } from "../utils/tasks";
import { logger } from "../utils/logger";
import { PrettyError } from "../utils/errors";
import { calculateTaskCost } from "../utils/llmCostCalculator";

export type TTaskStoreState = {
  tasks: any[];
  workflowLogs: any[];
  workflowContext: string;
  tasksInitialized: boolean;
};

export type TTaskStore = {
  getTaskStats: (task: any) => any;
  handleTaskCompleted: ({ agent, task, result }) => void;
  handleTaskError: ({ task, error }) => void;
  handleTaskBlocked: ({ task, error }) => void;
} & TTaskStoreState;

export const useTaskStore = (set, get) => ({
  // state
  tasksInitialized: false,

  getTaskStats(task) {
    const endTime = Date.now();
    const lastDoingLog = get()
      .workflowLogs.slice()
      .reverse()
      .find(
        (log) =>
          log.task &&
          log.task.id === task.id &&
          log.logType === "TaskStatusUpdate" &&
          log.task.status === ENUM_TASK_STATUS.DOING
      );
    const startTime = lastDoingLog ? lastDoingLog.timestamp : endTime; // Use endTime if no DOING log is found
    const duration = (endTime - startTime) / 1000; // Calculate duration in seconds

    let llmUsageStats = {
      inputTokens: 0,
      outputTokens: 0,
      callsCount: 0,
      callsErrorCount: 0,
      parsingErrors: 0,
    };
    let iterationCount = 0;

    get().workflowLogs.forEach((log) => {
      if (
        log.task &&
        log.task.id === task.id &&
        log.timestamp >= startTime &&
        log.logType === "AgentStatusUpdate"
      ) {
        if (log.agentStatus === ENUM_AGENT_STATUS.THINKING_END) {
          llmUsageStats.inputTokens +=
            log.metadata.output.llmUsageStats.inputTokens;
          llmUsageStats.outputTokens +=
            log.metadata.output.llmUsageStats.outputTokens;
          llmUsageStats.callsCount += 1;
        }
        if (log.agentStatus === ENUM_AGENT_STATUS.THINKING_ERROR) {
          llmUsageStats.callsErrorCount += 1;
        }
        if (log.agentStatus === ENUM_AGENT_STATUS.ISSUES_PARSING_LLM_OUTPUT) {
          llmUsageStats.parsingErrors += 1;
        }
        if (log.agentStatus === ENUM_AGENT_STATUS.ITERATION_END) {
          iterationCount += 1;
        }
      }
    });

    return {
      startTime,
      endTime,
      duration,
      llmUsageStats,
      iterationCount,
    };
  },

  handleTaskCompleted: ({ agent, task, result }) => {
    const stats = get().getTaskStats(task, get);
    task.status = ENUM_TASK_STATUS.DONE;
    task.result = result;

    const modelCode = agent.llmConfig.model; // Assuming this is where the model code is stored
    // Calculate costs directly using stats
    const costDetails = calculateTaskCost(modelCode, stats.llmUsageStats);

    const taskLog = get().prepareNewLog({
      agent,
      task,
      logDescription: `Task completed: ${getTaskTitleForLogs(task)}.`,
      metadata: {
        ...stats,
        costDetails,
        result,
      },
      logType: "TaskStatusUpdate",
    });
    logger.debug(
      `Task completed with ID ${task.id}, Duration: ${stats.duration} seconds`
    );
    set((state) => ({
      ...state,
      workflowLogs: [...state.workflowLogs, taskLog],
      tasks: state.tasks.map((t) =>
        t.id === task.id
          ? { ...t, ...stats, status: ENUM_TASK_STATUS.DONE, result: result }
          : t
      ),
      workflowContext: `${state.workflowContext} 
            Results from task ${task.description}: \n ${result}
             \n\n`,
    }));

    // This logic is here cause if put it in a subscriber, it will create race conditions
    // that will create a a non deterministic behavior for the Application State
    const tasks = get().tasks;
    const allTasksDone = tasks.every((t) => t.status === ENUM_TASK_STATUS.DONE);
    if (allTasksDone) {
      get().finishWorkflowAction();
    }
  },

  handleTaskError: ({ task, error }) => {
    const stats = get().getTaskStats(task, get);
    task.status = ENUM_TASK_STATUS.BLOCKED;

    const taskLog = get().prepareNewLog({
      agent: task.agent,
      task,
      logDescription: `Task error: ${getTaskTitleForLogs(task)}, Error: ${
        error.message
      }`,
      metadata: {
        ...stats,
        error: error.message,
      },
      logType: "TaskStatusUpdate",
    });

    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === task.id
          ? { ...t, ...stats, status: ENUM_TASK_STATUS.BLOCKED }
          : t
      ),
      workflowLogs: [...state.workflowLogs, taskLog],
    }));

    const prettyError = new PrettyError({
      message: "Task Error Encountered",
      recommendedAction:
        "Try to debug the application to find the root cause of the error.",
      originalError: error,
      context: { task, error },
      location: "taskStore.js -> handleTaskError()",
    });

    logger.error(prettyError.prettyMessage);
  },

  // Centralized error handling method for tasks
  handleTaskBlocked: ({ task, error }) => {
    const stats = get().getTaskStats(task, get);
    task.status = ENUM_TASK_STATUS.BLOCKED;

    const taskLog = get().prepareNewLog({
      agent: task.agent,
      task,
      logDescription: `Task blocked: ${getTaskTitleForLogs(task)}, Reason: ${
        error.message
      }`,
      metadata: {
        ...stats,
        error,
      },
      logType: "TaskStatusUpdate",
    });

    const prettyError = new PrettyError({
      name: "TASK BLOCKED",
      message: "Task blocked due to a possible error during execution.",
      recommendedAction:
        'Enable logLevel: "debug" during team initialization to obtain more detailed logs and facilitate troubleshooting.',
      originalError: error,
      context: { task, error },
    });

    logger.warn(prettyError.prettyMessage);
    logger.debug(prettyError.context);
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === task.id
          ? { ...t, ...stats, status: ENUM_TASK_STATUS.BLOCKED }
          : t
      ),
      workflowLogs: [...state.workflowLogs, taskLog],
    }));
    get().handleWorkflowBlocked({ task, error });
  },
});
