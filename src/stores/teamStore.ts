/**
 * State Management Store.
 *
 * This file defines the Zustand store used across the library to manage and maintain state. The store
 * facilitates reactive and efficient updates to the state of agents, tasks, and team workflows, ensuring
 * that the application remains responsive and data-driven. It provides a centralized location for state.
 *
 * Usage:
 * The store is designed to be imported and used directly in components or services where state management
 * is required, offering straightforward access to state properties and actions to modify them.
 */
import { create, StateCreator } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { useAgentStore } from './agentStore';
import { useTaskStore } from './taskStore';
import { useWorkflowLoopStore } from './workflowLoopStore';
import {
  AGENT_STATUS_enum,
  FEEDBACK_STATUS_enum,
  TASK_STATUS_enum,
  WORKFLOW_STATUS_enum,
} from '../utils/enums';
import {
  calculateTotalWorkflowCost,
  LLMUsageStats,
} from '../utils/llmCostCalculator';
import { logger, LogLevel, setLogLevel } from '../utils/logger';
import {
  getTaskTitleForLogs,
  interpolateTaskDescriptionV2,
} from '../utils/tasks';
import { initializeTelemetry } from '../utils/telemetry';
import {
  CombinedStoresState,
  TeamStore,
  TeamStoreState,
} from './teamStore.types';
import { Task, Agent } from '..';
import {
  WorkflowLog,
  WorkflowFinishedLog,
  WorkflowErrorLog,
  WorkflowBlockedLog,
  WorkflowStoppedLog,
  WorkflowInitialLog,
  TaskStatusLog,
  TaskCompletionLog,
  AgentStatusLog,
  AgentActionLog,
} from '../utils/workflowLogs.types';
import { Env } from '../agents/baseAgent';

// Initialize telemetry with default values
const td = initializeTelemetry();

// ──── Store Factory for Multiple Teams ───────────────────────────────
//
// Implements a store factory instead of a standard Zustand store to manage state for multiple teams.
// This design supports isolated state management for each team's agents and workflows,
// allowing multiple teams to operate concurrently with their own tasks and statuses.
// ─────────────────────────────────────────────────────────────────────

const createTeamStore = (
  initialState: Partial<TeamStoreState> = {}
): TeamStore => {
  // Define the store with centralized state management and actions
  if (initialState.logLevel) {
    setLogLevel(initialState.logLevel as LogLevel); // Update logger level if provided
  }

  const stateCreatorFn: StateCreator<CombinedStoresState, [], []> = (
    set,
    get
  ) => ({
    ...useAgentStore(set, get, useTeamStore),
    ...useTaskStore(set, get, useTeamStore),
    ...useWorkflowLoopStore(set, get, useTeamStore),
    teamWorkflowStatus:
      initialState.teamWorkflowStatus || WORKFLOW_STATUS_enum.INITIAL,
    workflowResult: initialState.workflowResult || null,
    name: initialState.name || '',
    agents: initialState.agents || [],
    tasks: initialState.tasks || [],
    workflowLogs: initialState.workflowLogs || [],
    inputs: initialState.inputs || {},
    workflowContext: initialState.workflowContext || '',
    env: initialState.env || {},
    logLevel: initialState.logLevel,
    memory: initialState.memory !== undefined ? initialState.memory : true,
    insights: initialState.insights || '',
    flowType: initialState.flowType,
    workflowExecutionStrategy: '_deterministic',
    workflowController: initialState.workflowController || {},
    maxConcurrency: initialState.maxConcurrency || 5,

    setInputs: (inputs: Record<string, unknown>) => set({ inputs }),
    setName: (name: string) => set({ name }),
    setEnv: (env: Env) => {
      set({ env });
      const agents = get().agents;
      agents.forEach((agent) => {
        agent.agentInstance.updateEnv(env);
      });
    },

    addAgents: (agents: Agent[]) => {
      const { env } = get();
      agents.forEach((agent) => {
        agent.initialize(useTeamStore, env);
      });
      set((state) => ({ agents: [...state.agents, ...agents] }));
    },

    addTasks: (tasks: Task[]) => {
      tasks.forEach((task) => (task.store = useTeamStore));
      set((state) => ({
        tasks: [...state.tasks, ...tasks],
      }));
    },

    updateTaskStatus: (taskId: string, status: TASK_STATUS_enum) => {
      set((state) => {
        const updatedTasks = state.tasks.map((task) =>
          task.id === taskId ? { ...task, status } : task
        );

        return {
          ...state,
          tasks: updatedTasks,
        };
      });
    },

    setWorkflowExecutionStrategy: (strategy: string) => {
      set({ workflowExecutionStrategy: strategy });
    },

    startWorkflow: async (inputs?: Record<string, unknown>) => {
      logger.info(`🚀 Team *${get().name}* is starting to work.`);
      td.signal('workflow_started');
      get().resetWorkflowStateAction();

      if (inputs) {
        get().setInputs({ ...get().inputs, ...inputs });
      }

      const initialLog: WorkflowInitialLog = {
        timestamp: Date.now(),
        logDescription: `Workflow initiated for team *${get().name}*.`,
        logType: 'WorkflowStatusUpdate',
        workflowStatus: WORKFLOW_STATUS_enum.RUNNING,
        metadata: {
          message: 'Workflow has been initialized with input settings.',
          inputs: inputs || {},
        },
      };

      set((state) => ({
        ...state,
        workflowLogs: [...state.workflowLogs, initialLog],
        teamWorkflowStatus: WORKFLOW_STATUS_enum.RUNNING,
      }));
    },

    resetWorkflowStateAction: () => {
      set((state) => {
        const resetTasks = state.tasks.map((task) => ({
          ...task,
          status: TASK_STATUS_enum.TODO,
        }));

        get().agents.forEach((agent) => {
          agent.reset();
        });

        const resetAgents = [...state.agents];

        return {
          ...state,
          tasks: resetTasks,
          agents: resetAgents,
          workflowLogs: [],
          workflowContext: '',
          workflowResult: null,
          teamWorkflowStatus: WORKFLOW_STATUS_enum.INITIAL,
        };
      });

      logger.debug('Workflow state has been reset.');
    },

    finishWorkflowAction: () => {
      const stats = get().getWorkflowStats();
      const tasks = get().tasks;
      const deliverableTask = tasks
        .slice()
        .reverse()
        .find((task) => task.isDeliverable);
      const lastTaskResult = tasks[tasks.length - 1].result;

      logger.debug(
        `Workflow Result:`,
        deliverableTask ? deliverableTask.result : lastTaskResult
      );

      const newLog: WorkflowFinishedLog = {
        timestamp: Date.now(),
        logDescription: `Workflow finished with result: ${
          deliverableTask ? deliverableTask.result : lastTaskResult
        }`,
        logType: 'WorkflowStatusUpdate',
        workflowStatus: WORKFLOW_STATUS_enum.FINISHED,
        metadata: {
          result: deliverableTask ? deliverableTask.result : lastTaskResult,
          ...stats,
        },
      };

      set((state) => ({
        ...state,
        workflowResult: deliverableTask
          ? deliverableTask.result
          : lastTaskResult,
        teamWorkflowStatus: WORKFLOW_STATUS_enum.FINISHED,
        workflowLogs: [...state.workflowLogs, newLog],
      }));
    },

    setTeamWorkflowStatus: (status: WORKFLOW_STATUS_enum) =>
      set({ teamWorkflowStatus: status }),

    handleWorkflowError: (error: Error) => {
      logger.error(`Workflow Error:`, error.message, error.stack);

      const newLog: WorkflowErrorLog = {
        timestamp: Date.now(),
        logDescription: `Workflow error encountered: ${error.message}`,
        logType: 'WorkflowStatusUpdate',
        workflowStatus: WORKFLOW_STATUS_enum.ERRORED,
        metadata: {
          error,
          teamName: get().name,
          taskCount: get().tasks.length,
          agentCount: get().agents.length,
        },
      };

      set((state) => ({
        ...state,
        teamWorkflowStatus: WORKFLOW_STATUS_enum.ERRORED,
        workflowLogs: [...state.workflowLogs, newLog],
      }));
    },

    handleWorkflowBlocked: (error: Error) => {
      logger.warn(`WORKFLOW BLOCKED:`, error.message);

      const newLog: WorkflowBlockedLog = {
        timestamp: Date.now(),
        logDescription: `Workflow blocked: ${error.message}`,
        logType: 'WorkflowStatusUpdate',
        workflowStatus: WORKFLOW_STATUS_enum.BLOCKED,
        metadata: {
          error,
          teamName: get().name,
          taskCount: get().tasks.length,
          agentCount: get().agents.length,
        },
      };

      set((state) => ({
        ...state,
        teamWorkflowStatus: WORKFLOW_STATUS_enum.BLOCKED,
        workflowLogs: [...state.workflowLogs, newLog],
      }));
    },

    handleWorkflowAborted: (error: Error) => {
      logger.warn(`WORKFLOW ABORTED:`, error.message);

      const newLog: WorkflowStoppedLog = {
        timestamp: Date.now(),
        logDescription: `Workflow aborted: ${error.message}`,
        logType: 'WorkflowStatusUpdate',
        workflowStatus: WORKFLOW_STATUS_enum.STOPPED,
        metadata: {
          message: error.message,
          previousStatus: get().teamWorkflowStatus,
          tasksReset: get().tasks.length,
        },
      };

      set((state) => ({
        ...state,
        teamWorkflowStatus: WORKFLOW_STATUS_enum.STOPPED,
        workflowLogs: [...state.workflowLogs, newLog],
      }));
    },

    workOnTask: async (agent: Agent, task: Task, context: string) => {
      if (task && agent) {
        logger.debug(`Task: ${getTaskTitleForLogs(task)} starting...`);
        task.status = TASK_STATUS_enum.DOING;

        set((state) => {
          const newLog = get().prepareNewLog({
            agent,
            task,
            logDescription: `Task: ${getTaskTitleForLogs(task)} started.`,
            metadata: {},
            logType: 'TaskStatusUpdate',
          });
          return {
            ...state,
            workflowLogs: [...state.workflowLogs, newLog],
          };
        });

        task.inputs = get().inputs;
        const interpolatedTaskDescription = interpolateTaskDescriptionV2(
          task.description,
          get().inputs,
          get().getTaskResults()
        );
        task.interpolatedTaskDescription = interpolatedTaskDescription;

        const pendingFeedbacks = task.feedbackHistory.filter(
          (f) => f.status === FEEDBACK_STATUS_enum.PENDING
        );

        const currentContext = get().memory ? context : '';

        if (pendingFeedbacks.length > 0) {
          await agent.workOnFeedback(
            task,
            task.feedbackHistory,
            currentContext
          );
        } else {
          await agent.workOnTask(task, get().inputs, currentContext);
        }
      }
    },

    workOnTaskResume: async (agent: Agent, task: Task) => {
      logger.debug(`🔄 Running task: ${getTaskTitleForLogs(task)}`);
      task.status = TASK_STATUS_enum.DOING;

      set((state) => {
        const newLog = get().prepareNewLog({
          agent,
          task,
          logDescription: `Task "${getTaskTitleForLogs(task)}" running again.`,
          metadata: {},
          logType: 'TaskStatusUpdate',
        });
        return {
          ...state,
          workflowLogs: [...state.workflowLogs, newLog],
        };
      });

      await agent.workOnTaskResume(task);
    },

    deriveContextFromLogs: (
      logs: WorkflowLog[],
      currentTaskId: string
    ): string => {
      const taskResults = new Map<
        string,
        {
          taskTitle: string;
          taskDescription: string;
          result: unknown;
          index: number;
        }
      >();
      const tasks = get().tasks;
      const currentTaskIndex = tasks.findIndex(
        (task) => task.id === currentTaskId
      );

      if (currentTaskIndex === -1) {
        console.warn(
          `Current task with ID ${currentTaskId} not found in the task list.`
        );
        return '';
      }

      for (const log of logs) {
        if (log.logType === 'TaskStatusUpdate') {
          const taskStatusLog = log as TaskStatusLog;

          if (taskStatusLog.taskStatus === TASK_STATUS_enum.DONE) {
            const logMetadata = (taskStatusLog as TaskCompletionLog).metadata;
            const taskIndex = tasks.findIndex(
              (task) => task.id === taskStatusLog.task.id
            );
            if (taskIndex !== -1 && taskIndex < currentTaskIndex) {
              taskResults.set(taskStatusLog.task.id, {
                taskTitle: taskStatusLog.task.title,
                taskDescription:
                  taskStatusLog.task.title || taskStatusLog.task.description,
                result: logMetadata.result,
                index: taskIndex + 1,
              });
            }
          }
        }
      }

      return Array.from(taskResults.values())
        .sort((a, b) => a.index - b.index)
        .map(
          ({ taskTitle, taskDescription, result, index }) =>
            `Task${taskTitle ? ' ' + index : ''}: ${taskDescription}\nResult: ${
              typeof result === 'object' ? JSON.stringify(result) : result
            }\n`
        )
        .join('\n');
    },

    provideFeedback: async (taskId: string, feedbackContent: string) => {
      const { tasks } = get();
      const taskIndex = tasks.findIndex((t) => t.id === taskId);

      if (taskIndex === -1) {
        logger.error('Task not found');
        return;
      }

      const task = tasks[taskIndex];
      const newFeedback = {
        content: feedbackContent,
        status: FEEDBACK_STATUS_enum.PENDING,
        timestamp: Date.now(),
      };

      const newWorkflowLog: WorkflowLog = {
        task,
        agent: task.agent,
        timestamp: Date.now(),
        logDescription: `Workflow running again due to feedback on task.`,
        workflowStatus: WORKFLOW_STATUS_enum.RUNNING,
        metadata: {
          feedback: newFeedback,
        },
        logType: 'WorkflowStatusUpdate',
      };

      const updatedTask = {
        ...task,
        feedbackHistory: [...(task.feedbackHistory || []), newFeedback],
        status: TASK_STATUS_enum.REVISE,
      };

      const newTaskLog = get().prepareNewLog({
        agent: updatedTask.agent,
        task: updatedTask,
        logDescription: `Task with feedback: ${getTaskTitleForLogs(
          updatedTask
        )}.`,
        metadata: {
          feedback: newFeedback,
        },
        logType: 'TaskStatusUpdate',
      });

      set((state) => ({
        ...state,
        teamWorkflowStatus: WORKFLOW_STATUS_enum.RUNNING,
        workflowLogs: [...state.workflowLogs, newWorkflowLog, newTaskLog],
        tasks: state.tasks.map((t) => (t.id === taskId ? updatedTask : t)),
      }));
    },

    validateTask: async (taskId: string): Promise<void | null> => {
      const task = get().tasks.find((t) => t.id === taskId);
      if (!task) {
        logger.error('Task not found');
        return null;
      }

      if (task.status !== TASK_STATUS_enum.AWAITING_VALIDATION) {
        logger.error('Task is not awaiting validation');
        return null;
      }

      const updatedTask = {
        ...task,
        status: TASK_STATUS_enum.VALIDATED,
      };

      const newWorkflowLog: WorkflowLog = {
        task: updatedTask,
        agent: updatedTask.agent,
        timestamp: Date.now(),
        logDescription: `Workflow running cause a task was validated.`,
        workflowStatus: WORKFLOW_STATUS_enum.RUNNING,
        metadata: {},
        logType: 'WorkflowStatusUpdate',
      };

      const newTaskLog = get().prepareNewLog({
        task: updatedTask,
        metadata: {},
        logDescription: `Task validated: ${getTaskTitleForLogs(updatedTask)}.`,
        logType: 'TaskStatusUpdate',
      });

      set((state) => ({
        ...state,
        tasks: state.tasks.map((t) => (t.id === taskId ? updatedTask : t)),
        workflowLogs: [...state.workflowLogs, newWorkflowLog, newTaskLog],
        teamWorkflowStatus: WORKFLOW_STATUS_enum.RUNNING,
      }));

      get().handleTaskCompleted({
        task: updatedTask,
        result: updatedTask.result,
      });
    },

    clearAll: () =>
      set({
        agents: [],
        tasks: [],
        inputs: {},
        workflowLogs: [],
        workflowContext: '',
        workflowResult: null,
        teamWorkflowStatus: WORKFLOW_STATUS_enum.INITIAL,
      }),

    getWorkflowStats: () => {
      const endTime = Date.now();
      const workflowLogs = get().workflowLogs;
      const lastWorkflowRunningLog = workflowLogs
        .slice()
        .reverse()
        .find(
          (log) =>
            log.logType === 'WorkflowStatusUpdate' &&
            log.workflowStatus === WORKFLOW_STATUS_enum.RUNNING
        );

      const startTime = lastWorkflowRunningLog
        ? lastWorkflowRunningLog.timestamp
        : Date.now();
      const duration = (endTime - startTime) / 1000;

      const modelUsageStats: Record<
        string,
        {
          inputTokens: number;
          outputTokens: number;
          callsCount: number;
        }
      > = {};

      const llmUsageStats = {
        inputTokens: 0,
        outputTokens: 0,
        callsCount: 0,
        callsErrorCount: 0,
        parsingErrors: 0,
      };
      let iterationCount = 0;

      workflowLogs.forEach((log: WorkflowLog) => {
        if (log.logType === 'AgentStatusUpdate' && log.timestamp >= startTime) {
          const agentStatusLog = log as AgentActionLog;
          if (
            (log as AgentStatusLog).agentStatus ===
              AGENT_STATUS_enum.THINKING_END &&
            (log as AgentStatusLog).agent.llmConfig.model
          ) {
            const modelCode = agentStatusLog.agent.llmConfig.model;
            if (!modelUsageStats[modelCode]) {
              modelUsageStats[modelCode] = {
                inputTokens: 0,
                outputTokens: 0,
                callsCount: 0,
              };
            }
            if (
              agentStatusLog.metadata?.output &&
              'llmUsageStats' in agentStatusLog.metadata.output
            ) {
              const stats = agentStatusLog.metadata.output
                .llmUsageStats as LLMUsageStats;
              modelUsageStats[modelCode].inputTokens += stats.inputTokens;
              modelUsageStats[modelCode].outputTokens += stats.outputTokens;
              modelUsageStats[modelCode].callsCount += 1;
              llmUsageStats.inputTokens += stats.inputTokens;
              llmUsageStats.outputTokens += stats.outputTokens;
              llmUsageStats.callsCount += 1;
            }
          } else if (
            agentStatusLog.agentStatus === AGENT_STATUS_enum.THINKING_ERROR
          ) {
            llmUsageStats.callsErrorCount += 1;
          } else if (
            agentStatusLog.agentStatus ===
            AGENT_STATUS_enum.ISSUES_PARSING_LLM_OUTPUT
          ) {
            llmUsageStats.parsingErrors += 1;
          } else if (
            agentStatusLog.agentStatus === AGENT_STATUS_enum.ITERATION_END
          ) {
            iterationCount += 1;
          }
        }
      });

      const costDetails = calculateTotalWorkflowCost(modelUsageStats);

      return {
        startTime,
        endTime,
        duration,
        llmUsageStats,
        iterationCount,
        costDetails,
        taskCount: get().tasks.length,
        agentCount: get().agents.length,
        teamName: get().name,
      };
    },

    getTaskResults: () => {
      const taskResults: Record<string, unknown> = {};
      const tasks = get().tasks || [];
      const workflowLogs = get().workflowLogs || [];
      const taskResultMap = new Map<string, unknown>();

      for (const log of workflowLogs) {
        if (
          log.logType === 'TaskStatusUpdate' &&
          (log as TaskStatusLog).taskStatus === TASK_STATUS_enum.DONE
        ) {
          const taskLog = log as TaskCompletionLog;
          taskResultMap.set(taskLog.task.id, taskLog.metadata.result);
        }
      }

      tasks.forEach((task, index) => {
        const result = taskResultMap.get(task.id);
        if (result !== undefined) {
          const key = `task${index + 1}`;
          taskResults[key] = result;
        }
      });

      return taskResults;
    },
  });

  const subcribeWithSelectorFn =
    subscribeWithSelector<CombinedStoresState>(stateCreatorFn);

  const devtoolsFn = devtools(subcribeWithSelectorFn, {
    name: 'teamStore',
  });

  const useTeamStore = create<CombinedStoresState>()(devtoolsFn);

  return useTeamStore;
};

export { createTeamStore };
