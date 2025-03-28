import { StateCreator } from 'zustand';
import {
  AgentActionLog,
  AgentStatusLog,
  TaskAbortedLog,
  TaskAwaitingValidationLog,
  TaskBlockedLog,
  TaskCompletionLog,
  TaskErrorLog,
  TaskFeedbackLog,
  TaskPausedLog,
  TaskResumedLog,
  TaskStatusLog,
  TaskValidatedLog,
} from '../types/logs';
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
  NewTaskStatusUpdateLogParams,
  TaskStoreState,
} from './taskStore.types';
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

  handleTaskCompleted: ({ agent, task, result }) => {
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

      const taskLog =
        get().prepareTaskStatusUpdateLog<TaskAwaitingValidationLog>({
          task,
          agent,
          logDescription: `Task awaiting validation: ${getTaskTitleForLogs(
            task
          )}. Awaiting validation.`,
          metadata: {
            ...stats,
            costDetails,
            result: result || { success: false, message: 'No result provided' },
          },
          logType: 'TaskStatusUpdate',
          taskStatus: TASK_STATUS_enum.AWAITING_VALIDATION,
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

      get().handleWorkflowBlocked(task, new Error('Task awaiting validation'));
    } else {
      const modelCode = task.agent.llmConfig.model;
      const costDetails = calculateTaskCost(modelCode, stats.llmUsageStats);

      const taskLog = get().prepareTaskStatusUpdateLog<TaskCompletionLog>({
        agent,
        task: { ...task, status: TASK_STATUS_enum.DONE },
        logDescription: `Task completed: ${getTaskTitleForLogs(task)}.`,
        metadata: {
          ...stats,
          costDetails,
          result: result || { success: false, message: 'No result provided' },
        },
        logType: 'TaskStatusUpdate',
        taskStatus: TASK_STATUS_enum.DONE,
      });

      logger.debug(
        `Task completed with ID ${task.id}, Duration: ${stats.duration} seconds`
      );

      set((state) => ({
        ...state,
        workflowLogs: [...state.workflowLogs, taskLog],
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

    const taskLog = get().prepareTaskStatusUpdateLog<TaskErrorLog>({
      task,
      agent: task.agent,
      logDescription: `Task error: ${getTaskTitleForLogs(task)}, Error: ${
        error.message
      }`,
      metadata: {
        ...stats,
        costDetails,
        error,
      },
      logType: 'TaskStatusUpdate',
      taskStatus: TASK_STATUS_enum.BLOCKED,
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

    const taskLog = get().prepareTaskStatusUpdateLog<TaskBlockedLog>({
      agent: task.agent,
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
      taskStatus: TASK_STATUS_enum.BLOCKED,
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

    get().handleWorkflowBlocked(task, error);
  },

  handleTaskAborted: ({ task, error }) => {
    const stats = get().getTaskStats(task);
    const modelCode = task.agent.llmConfig.model;
    const costDetails = calculateTaskCost(modelCode, stats.llmUsageStats);

    const taskLog = get().prepareTaskStatusUpdateLog<TaskAbortedLog>({
      agent: task.agent,
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
      taskStatus: TASK_STATUS_enum.ABORTED,
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

    const taskLog = get().prepareTaskStatusUpdateLog<TaskPausedLog>({
      agent: task.agent,
      task,
      logDescription: `⏸️ Task "${getTaskTitleForLogs(task)}" paused | Agent ${
        task.agent.name
      } has temporarily suspended work`,
      metadata: {
        ...stats,
        costDetails,
      },
      logType: 'TaskStatusUpdate',
      taskStatus: TASK_STATUS_enum.PAUSED,
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
    const taskLog = get().prepareTaskStatusUpdateLog<TaskResumedLog>({
      agent: task.agent,
      task,
      logDescription: `🔄 Task resumed: ${getTaskTitleForLogs(task)} | Agent: ${
        task.agent.name
      } is continuing work`,
      metadata: {},
      logType: 'TaskStatusUpdate',
      taskStatus: TASK_STATUS_enum.RESUMED,
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
  handleTaskRevised: ({ task, feedback }) => {
    const newTaskLog = get().prepareTaskStatusUpdateLog<TaskFeedbackLog>({
      task,
      agent: task.agent,
      metadata: {
        feedback,
      },
      logDescription: `Task with feedback: ${getTaskTitleForLogs(task)}.`,
      logType: 'TaskStatusUpdate',
      taskStatus: TASK_STATUS_enum.REVISE,
    });

    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === task.id ? task : t)),
      workflowLogs: [...state.workflowLogs, newTaskLog],
    }));
  },

  handleTaskValidated: ({ task }) => {
    const newTaskLog = get().prepareTaskStatusUpdateLog<TaskValidatedLog>({
      task,
      agent: task.agent,
      metadata: {},
      logDescription: `Task validated: ${getTaskTitleForLogs(task)}.`,
      logType: 'TaskStatusUpdate',
      taskStatus: TASK_STATUS_enum.VALIDATED,
    });

    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === task.id ? task : t)),
      workflowLogs: [...state.workflowLogs, newTaskLog],
    }));

    get().handleTaskCompleted({
      agent: task.agent,
      task,
      result: task.result,
    });
  },

  prepareTaskStatusUpdateLog: <T extends TaskStatusLog>({
    agent,
    task,
    logDescription,
    workflowStatus,
    taskStatus,
    agentStatus,
    metadata,
    logType = 'TaskStatusUpdate' as T['logType'],
  }: NewTaskStatusUpdateLogParams<T>): T => {
    const timestamp = Date.now();

    let newLog: T = {
      timestamp,
      logDescription,
      metadata,
      logType,
    } as T;

    if (agent && task) {
      newLog = {
        ...newLog,
        task,
        agent,
        agentName: agent.name || 'Unknown Agent',
        taskTitle: task ? getTaskTitleForLogs(task) : 'Untitled Task',
        taskStatus: taskStatus || task.status,
        agentStatus: agentStatus || agent.status,
      } as T;
    }

    if (workflowStatus) {
      newLog = {
        ...newLog,
        workflowStatus,
      } as T;
    }

    return newLog;
  },
});
