import { StateCreator } from 'zustand';
import {
  AGENT_STATUS_enum,
  FEEDBACK_STATUS_enum,
  TASK_STATUS_enum,
} from '../utils/enums';
import { PrettyError } from '../utils/errors';
import { calculateTaskCost, LLMUsageStats } from '../utils/llmCostCalculator';
import { logger } from '../utils/logger';
import { getTaskTitleForLogs } from '../utils/tasks';
import {
  AgentActionLog,
  AgentStatusLog,
  TaskStatusLog,
} from '../utils/workflowLogs.types';
import { TaskStoreState } from './taskStore.types';
import { CombinedStoresState } from './teamStore.types';

export const useTaskStore: StateCreator<
  CombinedStoresState,
  [],
  [],
  TaskStoreState
> = (set, get) => ({
  getTaskStats: (task) => {
    const endTime = Date.now();
    const lastDoingLog = get()
      .workflowLogs.slice()
      .reverse()
      .find(
        (log) =>
          log.logType === 'TaskStatusUpdate' &&
          (log as TaskStatusLog).taskStatus === TASK_STATUS_enum.DOING &&
          (log as TaskStatusLog).task.id === task.id
      );
    const startTime = lastDoingLog ? lastDoingLog.timestamp : endTime;
    const duration = (endTime - startTime) / 1000;

    const llmUsageStats: LLMUsageStats = {
      inputTokens: 0,
      outputTokens: 0,
      callsCount: 0,
      callsErrorCount: 0,
      parsingErrors: 0,
    };
    let iterationCount = 0;

    get().workflowLogs.forEach((log) => {
      if (
        log.timestamp >= startTime &&
        log.logType === 'AgentStatusUpdate' &&
        (log as AgentStatusLog).task.id === task.id
      ) {
        const agentStatusLog = log as AgentActionLog;
        if (
          agentStatusLog.agentStatus === AGENT_STATUS_enum.THINKING_END &&
          agentStatusLog.metadata?.output
        ) {
          llmUsageStats.inputTokens +=
            agentStatusLog.metadata.output.llmUsageStats.inputTokens;
          llmUsageStats.outputTokens +=
            agentStatusLog.metadata.output.llmUsageStats.outputTokens;
          llmUsageStats.callsCount += 1;
        }
        if (agentStatusLog.agentStatus === AGENT_STATUS_enum.THINKING_ERROR) {
          llmUsageStats.callsErrorCount += 1;
        }
        if (
          agentStatusLog.agentStatus ===
          AGENT_STATUS_enum.ISSUES_PARSING_LLM_OUTPUT
        ) {
          llmUsageStats.parsingErrors += 1;
        }
        if (agentStatusLog.agentStatus === AGENT_STATUS_enum.ITERATION_END) {
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

  handleTaskCompleted: ({ task, result }) => {
    const stats = get().getTaskStats(task);
    task.result = result;

    const updatedFeedbackHistory = (task.feedbackHistory || []).map(
      (feedback) =>
        feedback.status === FEEDBACK_STATUS_enum.PENDING
          ? { ...feedback, status: FEEDBACK_STATUS_enum.PROCESSED }
          : feedback
    );

    if (
      task.externalValidationRequired &&
      task.status !== TASK_STATUS_enum.VALIDATED
    ) {
      task.status = TASK_STATUS_enum.AWAITING_VALIDATION;
      const modelCode = task.agent.llmConfig.model;
      const costDetails = calculateTaskCost(modelCode, stats.llmUsageStats);
      const taskLog = get().prepareNewLog({
        task,
        logDescription: `Task awaiting validation: ${getTaskTitleForLogs(
          task
        )}. Awaiting validation.`,
        metadata: {
          ...stats,
          costDetails,
          result,
        },
        logType: 'TaskStatusUpdate',
      });

      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === task.id
            ? {
                ...task,
                ...stats,
                status: TASK_STATUS_enum.AWAITING_VALIDATION,
                result: result,
                feedbackHistory: updatedFeedbackHistory,
              }
            : t
        ),
        workflowLogs: [...state.workflowLogs, taskLog],
      }));

      get().handleWorkflowBlocked(new Error('Task awaiting validation'));
    } else {
      const modelCode = task.agent.llmConfig.model;
      const costDetails = calculateTaskCost(modelCode, stats.llmUsageStats);
      const taskLog = get().prepareNewLog({
        task: { ...task, status: TASK_STATUS_enum.DONE },
        logDescription: `Task completed: ${getTaskTitleForLogs(task)}.`,
        metadata: {
          ...stats,
          costDetails,
          result,
        },
        logType: 'TaskStatusUpdate',
      });

      logger.debug(
        `Task completed with ID ${task.id}, Duration: ${stats.duration} seconds`
      );

      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === task.id
            ? {
                ...task,
                ...stats,
                status: TASK_STATUS_enum.DONE,
                result: result,
                feedbackHistory: updatedFeedbackHistory,
              }
            : t
        ),
        workflowLogs: [...state.workflowLogs, taskLog],
      }));

      task.status = TASK_STATUS_enum.DONE;

      const tasks = get().tasks;
      const allTasksDone = tasks.every(
        (t) => t.status === TASK_STATUS_enum.DONE
      );
      if (allTasksDone) {
        get().finishWorkflowAction();
      }
    }
  },

  handleTaskError: ({ task, error }) => {
    const stats = get().getTaskStats(task);
    task.status = TASK_STATUS_enum.BLOCKED;
    const modelCode = task.agent.llmConfig.model;
    const costDetails = calculateTaskCost(modelCode, stats.llmUsageStats);
    const updatedFeedbackHistory = task.feedbackHistory.map((f) =>
      f.status === FEEDBACK_STATUS_enum.PENDING
        ? { ...f, status: FEEDBACK_STATUS_enum.PROCESSED }
        : f
    );
    const taskLog = get().prepareNewLog({
      task,
      logDescription: `Task error: ${getTaskTitleForLogs(task)}, Error: ${
        error.message
      }`,
      metadata: {
        ...stats,
        costDetails,
        error,
      },
      logType: 'TaskStatusUpdate',
    });

    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === task.id
          ? {
              ...t,
              ...stats,
              status: TASK_STATUS_enum.BLOCKED,
              error: error.message,
              feedbackHistory: updatedFeedbackHistory,
            }
          : t
      ),
      workflowLogs: [...state.workflowLogs, taskLog],
    }));

    const prettyError = new PrettyError({
      message: 'Task Error Encountered',
      recommendedAction:
        'Try to debug the application to find the root cause of the error.',
      rootError: error,
      context: { task, error },
      location: 'taskStore.ts -> handleTaskError()',
    });

    logger.error(prettyError.prettyMessage);
  },

  handleTaskBlocked: ({ task, error }) => {
    const stats = get().getTaskStats(task);
    task.status = TASK_STATUS_enum.BLOCKED;
    const modelCode = task.agent.llmConfig.model;
    const costDetails = calculateTaskCost(modelCode, stats.llmUsageStats);

    const updatedFeedbackHistory = task.feedbackHistory.map((f) =>
      f.status === FEEDBACK_STATUS_enum.PENDING
        ? { ...f, status: FEEDBACK_STATUS_enum.PROCESSED }
        : f
    );

    const taskLog = get().prepareNewLog({
      task,
      logDescription: `Task blocked: ${getTaskTitleForLogs(task)}, Reason: ${
        error.message
      }`,
      metadata: {
        ...stats,
        costDetails,
        error,
      },
      logType: 'TaskStatusUpdate',
    });

    const prettyError = new PrettyError({
      name: 'TASK BLOCKED',
      message: 'Task blocked due to a possible error during execution.',
      recommendedAction:
        'Enable logLevel: "debug" during team initialization to obtain more detailed logs and facilitate troubleshooting.',
      rootError: error,
      context: { task, error },
    });

    logger.warn(prettyError.prettyMessage);
    logger.debug(prettyError.context);

    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === task.id
          ? {
              ...t,
              ...stats,
              status: TASK_STATUS_enum.BLOCKED,
              feedbackHistory: updatedFeedbackHistory,
            }
          : t
      ),
      workflowLogs: [...state.workflowLogs, taskLog],
    }));

    get().handleWorkflowBlocked(error);
  },

  handleTaskAborted: ({ task, error }) => {
    const stats = get().getTaskStats(task);
    const modelCode = task.agent.llmConfig.model;
    const costDetails = calculateTaskCost(modelCode, stats.llmUsageStats);

    const taskLog = get().prepareNewLog({
      task,
      logDescription: `Task aborted: ${getTaskTitleForLogs(task)}, Reason: ${
        error.message
      }`,
      metadata: {
        ...stats,
        costDetails,
        error,
      },
      logType: 'TaskStatusUpdate',
    });

    const prettyError = new PrettyError({
      name: 'TASK STOPPED',
      message: 'Task manually stopped by user.',
      recommendedAction:
        'Enable logLevel: "debug" during team initialization to obtain more detailed logs and facilitate troubleshooting.',
      rootError: error,
      context: { task, error },
    });

    logger.warn(prettyError.prettyMessage);
    logger.debug(prettyError.context);

    set((state) => ({
      workflowLogs: [...state.workflowLogs, taskLog],
    }));
  },

  handleTaskPaused: ({ task }) => {
    const stats = get().getTaskStats(task);
    const modelCode = task.agent.llmConfig.model;
    const costDetails = calculateTaskCost(modelCode, stats.llmUsageStats);

    const updatedFeedbackHistory = task.feedbackHistory.map((f) =>
      f.status === FEEDBACK_STATUS_enum.PENDING
        ? { ...f, status: FEEDBACK_STATUS_enum.PROCESSED }
        : f
    );

    const taskLog = get().prepareNewLog({
      task: { ...task, status: TASK_STATUS_enum.PAUSED },
      logDescription: `⏸️ Task "${getTaskTitleForLogs(task)}" paused | Agent ${
        task.agent.name
      } has temporarily suspended work`,
      metadata: {
        ...stats,
        costDetails,
      },
      logType: 'TaskStatusUpdate',
    });

    const prettyError = new PrettyError({
      name: 'TASK PAUSED',
      message: `Task "${task.description}" has been paused. Agent ${task.agent.name} will resume work when workflow continues.`,
      recommendedAction:
        'Use resume() to continue workflow execution, or enable logLevel: "debug" for more detailed logs.',
      context: { task },
    });

    logger.warn(prettyError.prettyMessage);
    logger.debug(prettyError.context);

    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === task.id
          ? {
              ...t,
              ...stats,
              status: TASK_STATUS_enum.PAUSED,
              feedbackHistory: updatedFeedbackHistory,
            }
          : t
      ),
      workflowLogs: [...state.workflowLogs, taskLog],
    }));
  },

  handleTaskResumed: ({ task }) => {
    const taskLog = get().prepareNewLog({
      task: { ...task, status: TASK_STATUS_enum.RESUMED },
      logDescription: `🔄 Task resumed: ${getTaskTitleForLogs(task)} | Agent: ${
        task.agent.name
      } is continuing work`,
      metadata: {},
      logType: 'TaskStatusUpdate',
    });

    const prettyError = new PrettyError({
      name: 'TASK RESUMED',
      message: `Task "${task.description}" has been resumed after being paused. Agent ${task.agent.name} will continue working on it.`,
      context: { task },
    });

    logger.debug(prettyError.context);

    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === task.id
          ? {
              ...t,
              status: TASK_STATUS_enum.RESUMED,
            }
          : t
      ),
      workflowLogs: [...state.workflowLogs, taskLog],
    }));
  },
});
