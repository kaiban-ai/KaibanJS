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
import { Agent, Task } from '..';
import { BaseAgent, Env } from '../agents/baseAgent';
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
import { isEmpty, oset } from '../utils/objectUtils';
import {
  getTaskTitleForLogs,
  interpolateTaskDescriptionV2,
} from '../utils/tasks';
import { initializeTelemetry } from '../utils/telemetry';
import {
  AgentActionLog,
  AgentStatusLog,
  TaskCompletionLog,
  TaskResumedLog,
  TaskStartedLog,
  TaskStatusLog,
  WorkflowBlockedLog,
  WorkflowErrorLog,
  WorkflowFinishedLog,
  WorkflowInitialLog,
  WorkflowLog,
  WorkflowLogMetadata,
  WorkflowRunningLog,
  WorkflowStoppedLog,
} from '../types/logs';
import { useAgentStore } from './agentStore';
import { useTaskStore } from './taskStore';
import { TaskResult } from './taskStore.types';
import {
  CleanedAgent,
  CleanedBaseAgent,
  CleanedFeedback,
  CleanedMetadata,
  CleanedTask,
  CleanedTeamState,
  CleanedWorkflowLog,
  CombinedStoresState,
  NewLogParams,
  TeamStore,
  TeamStoreState,
} from './teamStore.types';
import { useWorkflowLoopStore } from './workflowLoopStore';

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

      const initialLog =
        get().prepareWorkflowStatusUpdateLog<WorkflowInitialLog>({
          metadata: {
            message: 'Workflow has been initialized with input settings.',
            inputs: isEmpty(inputs) ? null : inputs,
          },
          logDescription: `Workflow initiated for team *${get().name}*.`,
          logType: 'WorkflowStatusUpdate',
          workflowStatus: WORKFLOW_STATUS_enum.RUNNING,
        });

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

      const newLog = get().prepareWorkflowStatusUpdateLog<WorkflowFinishedLog>({
        metadata: {
          result: deliverableTask ? deliverableTask.result : lastTaskResult,
          ...stats,
        },
        logDescription: `Workflow finished with result: ${
          deliverableTask ? deliverableTask.result : lastTaskResult
        }`,
        logType: 'WorkflowStatusUpdate',
        workflowStatus: WORKFLOW_STATUS_enum.FINISHED,
      });

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

      const stats = get().getWorkflowStats();

      const newLog = get().prepareWorkflowStatusUpdateLog<WorkflowErrorLog>({
        metadata: {
          error: error.message,
          ...stats,
        },
        logDescription: `Workflow error encountered: ${error.message}`,
        logType: 'WorkflowStatusUpdate',
        workflowStatus: WORKFLOW_STATUS_enum.ERRORED,
      });

      set((state) => ({
        ...state,
        teamWorkflowStatus: WORKFLOW_STATUS_enum.ERRORED,
        workflowLogs: [...state.workflowLogs, newLog],
      }));
    },

    handleWorkflowBlocked: (task: Task, error: Error) => {
      logger.warn(`WORKFLOW BLOCKED:`, error.message);

      const stats = get().getWorkflowStats();

      const newLog = get().prepareWorkflowStatusUpdateLog<WorkflowBlockedLog>({
        task,
        agent: task.agent,
        metadata: {
          error: error.message,
          ...stats,
        },
        workflowStatus: WORKFLOW_STATUS_enum.BLOCKED,
        logDescription: `Workflow blocked: ${error.message}`,
        logType: 'WorkflowStatusUpdate',
      });

      set((state) => ({
        ...state,
        teamWorkflowStatus: WORKFLOW_STATUS_enum.BLOCKED,
        workflowLogs: [...state.workflowLogs, newLog],
      }));
    },

    handleWorkflowAborted: (task: Task, error: Error) => {
      logger.warn(`WORKFLOW ABORTED:`, error.message);

      const newLog = get().prepareWorkflowStatusUpdateLog<WorkflowStoppedLog>({
        task,
        agent: task.agent,
        metadata: {
          message: error.message,
          previousStatus: get().teamWorkflowStatus,
          tasksReset: get().tasks.length,
        },
        logDescription: `Workflow aborted: ${error.message}`,
        logType: 'WorkflowStatusUpdate',
        workflowStatus: WORKFLOW_STATUS_enum.STOPPED,
      });

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
          const newLog = get().prepareTaskStatusUpdateLog<TaskStartedLog>({
            task,
            agent,
            logDescription: `Task: ${getTaskTitleForLogs(task)} started.`,
            logType: 'TaskStatusUpdate',
            taskStatus: TASK_STATUS_enum.DOING,
            metadata: {},
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
        const newLog = get().prepareTaskStatusUpdateLog<TaskResumedLog>({
          task,
          agent,
          logDescription: `Task "${getTaskTitleForLogs(task)}" running again.`,
          logType: 'TaskStatusUpdate',
          taskStatus: TASK_STATUS_enum.DOING,
          metadata: {},
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
          result: TaskResult;
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

      const newWorkflowLog =
        get().prepareWorkflowStatusUpdateLog<WorkflowRunningLog>({
          task,
          agent: task.agent,
          metadata: {
            feedback: newFeedback,
          },
          logDescription: `Workflow running again due to feedback on task.`,
          logType: 'WorkflowStatusUpdate',
          workflowStatus: WORKFLOW_STATUS_enum.RUNNING,
        });

      const updatedTask = {
        ...task,
        feedbackHistory: [...(task.feedbackHistory || []), newFeedback],
        status: TASK_STATUS_enum.REVISE,
      };

      set((state) => ({
        ...state,
        teamWorkflowStatus: WORKFLOW_STATUS_enum.RUNNING,
        workflowLogs: [...state.workflowLogs, newWorkflowLog],
      }));

      get().handleTaskRevised({
        task: updatedTask,
        feedback: newFeedback,
      });
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

      const newWorkflowLog =
        get().prepareWorkflowStatusUpdateLog<WorkflowRunningLog>({
          task: updatedTask,
          agent: updatedTask.agent,
          metadata: {},
          logDescription: `Workflow running cause a task was validated.`,
          logType: 'WorkflowStatusUpdate',
          workflowStatus: WORKFLOW_STATUS_enum.RUNNING,
        });

      set((state) => ({
        ...state,
        workflowLogs: [...state.workflowLogs, newWorkflowLog],
        teamWorkflowStatus: WORKFLOW_STATUS_enum.RUNNING,
      }));

      get().handleTaskValidated({
        task: updatedTask,
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
        ? (lastWorkflowRunningLog as WorkflowRunningLog).timestamp
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

    getCleanedState(): CleanedTeamState {
      // Function to clean individual agent data
      const cleanAgent = (agent: Agent): CleanedAgent => {
        const { agentInstance, ...rest } = agent;
        const cleanedAgentInstance = agentInstance?.getCleanedAgent() || {};

        return {
          ...rest,
          id: '[REDACTED]', // Clean sensitive ID at the root level
          env: '[REDACTED]', // Clean sensitive Env in agent
          llmConfig: {
            ...agent.llmConfig,
            apiKey: '[REDACTED]',
          }, // Provide an empty object if llmConfig is undefined at the root level
          agentInstance: cleanedAgentInstance,
        };
      };

      const cleanBaseAgent = (agent: BaseAgent): CleanedBaseAgent => {
        return agent.getCleanedAgent() as CleanedBaseAgent;
      };

      // Function to clean individual task data
      const cleanTask = (task: Task): CleanedTask => {
        const { allowParallelExecution = false, referenceId, ...rest } = task;
        const cleanedTask: CleanedTask = {
          ...rest,
          id: '[REDACTED]', // Clean sensitive ID
          agent: task.agent ? cleanAgent(task.agent) : null, // Clean the nested agent if exists
          duration: '[REDACTED]',
          endTime: '[REDACTED]',
          startTime: '[REDACTED]',
          feedbackHistory: task.feedbackHistory
            ? task.feedbackHistory.map(
                (feedback): CleanedFeedback => ({
                  ...feedback,
                  timestamp: '[REDACTED]', // Redact the timestamp
                })
              )
            : [],
        };

        if (allowParallelExecution) {
          cleanedTask.allowParallelExecution = allowParallelExecution;
        }

        if (referenceId) {
          cleanedTask.referenceId = referenceId;
        }

        return cleanedTask;
      };

      // Function to clean log metadata
      const cleanMetadata = (metadata: WorkflowLogMetadata): CleanedMetadata =>
        ({
          ...metadata,
          duration: '[REDACTED]',
          endTime: '[REDACTED]',
          startTime: '[REDACTED]',
          feedback:
            'feedback' in metadata
              ? metadata.feedback
                ? {
                    ...(metadata.feedback as Record<string, unknown>),
                    timestamp: '[REDACTED]',
                  }
                : {}
              : {},
        } as CleanedMetadata);

      // Clone and clean agents
      const cleanedAgents = get().agents.map(cleanAgent);

      // Clone and clean tasks, including the nested agents
      const cleanedTasks = get().tasks.map(cleanTask);

      // Clone and clean workflowLogs, including the potential agents and tasks
      const cleanedWorkflowLogs = get().workflowLogs.map(
        (log): CleanedWorkflowLog => {
          const cleanedAgent =
            'agent' in log
              ? log.agent instanceof BaseAgent
                ? cleanBaseAgent(log.agent)
                : cleanAgent(log.agent)
              : null;
          const cleanedTask = 'task' in log ? cleanTask(log.task) : null;
          const cleanedLog = {
            ...log,
            agent: cleanedAgent,
            task: cleanedTask,
            timestamp: '[REDACTED]',
            metadata: cleanMetadata(log.metadata as Record<string, unknown>),
          };

          // TODO: Remove this
          if ('agent' in log && log.agent && !('agentInstance' in log.agent)) {
            oset(cleanedLog, 'agent.agentInstance', {});
          }

          return cleanedLog;
        }
      );

      // Return only the parts of the state necessary for the snapshot or further processing
      return {
        teamWorkflowStatus: get().teamWorkflowStatus,
        workflowResult: get().workflowResult,
        name: get().name,
        agents: cleanedAgents,
        tasks: cleanedTasks,
        workflowLogs: cleanedWorkflowLogs,
        inputs: get().inputs,
        workflowContext: get().workflowContext,
        logLevel: get().logLevel,
      };
    },

    getTaskResults: () => {
      const taskResults: Record<string, TaskResult> = {};
      const tasks = get().tasks || [];
      const workflowLogs = get().workflowLogs || [];
      const taskResultMap = new Map<string, TaskResult>();

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

    prepareWorkflowStatusUpdateLog: <T extends WorkflowLog>({
      agent,
      task,
      logDescription,
      workflowStatus,
      metadata,
      logType,
    }: NewLogParams<T>): T => {
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
          // agentName: agent.name || 'Unknown Agent',
          // taskTitle: task ? getTaskTitleForLogs(task) : 'Untitled Task',
          // taskStatus: taskStatus || task.status,
          // agentStatus: agentStatus || agent.status,
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

  const subscribeWithSelectorFn =
    subscribeWithSelector<CombinedStoresState>(stateCreatorFn);

  const devtoolsFn = devtools(subscribeWithSelectorFn, {
    name: 'teamStore',
  });

  const useTeamStore = create<CombinedStoresState>()(devtoolsFn);

  return useTeamStore;
};

export { createTeamStore };
