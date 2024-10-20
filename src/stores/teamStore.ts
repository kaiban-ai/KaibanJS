import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import {
  TeamState,
  TeamStoreMiddlewares,
  TeamStore,
  CreateTeamStore,
  AgentType,
  TaskType,
  FeedbackObject,
  TaskResult,
  Log,
  ErrorType,
  TeamStoreApi,
  TeamStoreCreator,
  UseBoundTeamStore,
  LLMUsageStats,
  Output
} from './storeTypes';
import { useAgentStore } from './agentStore';
import { useTaskStore } from './taskStore';
import { TASK_STATUS_enum, AGENT_STATUS_enum, WORKFLOW_STATUS_enum, FEEDBACK_STATUS_enum } from '../utils/enums';
import { getTaskTitleForLogs, interpolateTaskDescription, validateTask } from '../utils/tasks';
import { logger, setLogLevel } from '../utils/logger';
import { calculateTotalWorkflowCost } from '../utils/llmCostCalculator';
import { subscribeWorkflowStatusUpdates } from '../subscribers/teamSubscriber';
import { subscribeTaskStatusUpdates } from '../subscribers/taskSubscriber';
import { setupWorkflowController } from './workflowController';
import { PrettyError } from '../utils/errors';

const createTeamStore: CreateTeamStore = (initialState: Partial<TeamState> = {}) => {
  if (initialState.logLevel) {
    setLogLevel(initialState.logLevel);
  }

  const storeCreator: TeamStoreCreator = (set, get, api) => {
    const store: TeamStore = {
      ...useAgentStore(set, get),
      ...useTaskStore(set, get),

      teamWorkflowStatus: initialState.teamWorkflowStatus || 'INITIAL',
      workflowResult: initialState.workflowResult || null,
      name: initialState.name || '',
      agents: initialState.agents || [],
      tasks: initialState.tasks || [],
      workflowLogs: initialState.workflowLogs || [],
      inputs: initialState.inputs || {},
      workflowContext: initialState.workflowContext || '',
      env: initialState.env || {},
      logLevel: initialState.logLevel || 'info',

      setInputs: (inputs: Record<string, any>): void => set({ inputs }),

      setName: (name: string): void => set({ name }),

      setEnv: (env: Record<string, any>): void => set({ env }),

      addAgents: (agents: AgentType[]): void => {
        const { env } = get();
        agents.forEach((agent) => {
          agent.initialize(get(), env);
        });
        set((state: TeamState) => ({ agents: [...state.agents, ...agents] }));
      },

      addTasks: (tasks: TaskType[]): void => {
        tasks.forEach((task) => task.setStore(get()));
        set((state: TeamState) => ({ tasks: [...state.tasks, ...tasks.map((task) => ({ ...task, agent: task.agent }))] }));
      },

      updateTaskStatus: (taskId: string, status: keyof typeof TASK_STATUS_enum): void =>
        set((state: TeamState) => ({
          tasks: state.tasks.map((task) => (task.id === taskId ? { ...task, status } : task)),
        })),

      startWorkflow: async (inputs?: Record<string, any>): Promise<void> => {
        logger.info(`🚀 Team *${get().name}* is starting to work.`);
        get().resetWorkflowStateAction();

        if (inputs) {
          get().setInputs(inputs);
        }

        const initialLog: Log = {
          task: null,
          agent: null,
          timestamp: Date.now(),
          logDescription: `Workflow initiated for team *${get().name}*.`,
          workflowStatus: 'RUNNING',
          metadata: {
            message: 'Workflow has been initialized with input settings.',
            inputs,
          },
          logType: 'WorkflowStatusUpdate',
          agentName: '',
          taskTitle: '',
          taskStatus: 'TODO',
          agentStatus: 'INITIAL',
        };

        set((state: TeamState) => ({
          workflowLogs: [...state.workflowLogs, initialLog],
          teamWorkflowStatus: 'RUNNING',
        }));

        const tasks = get().tasks;
        if (tasks.length > 0 && tasks[0].status === 'TODO') {
          get().updateTaskStatus(tasks[0].id, 'DOING');
        }
      },

      resetWorkflowStateAction: (): void => {
        set((state: TeamState) => {
          const resetTasks = state.tasks.map((task) => ({
            ...task,
            status: 'TODO' as keyof typeof TASK_STATUS_enum,
          }));

          get().agents.forEach((agent) => {
            agent.setStatus('INITIAL' as keyof typeof AGENT_STATUS_enum);
          });

          return {
            tasks: resetTasks,
            agents: [...state.agents],
            workflowLogs: [],
            workflowContext: '',
            workflowResult: null,
            teamWorkflowStatus: 'INITIAL' as keyof typeof WORKFLOW_STATUS_enum,
          };
        });
        logger.debug('Workflow state has been reset.');
      },

      finishWorkflowAction: (): void => {
        const stats = get().getWorkflowStats();
        const tasks = get().tasks;
        const deliverableTask = tasks.slice().reverse().find((task) => task.isDeliverable);
        const lastTaskResult = tasks[tasks.length - 1].result;

        const newLog: Log = {
          task: null,
          agent: null,
          timestamp: Date.now(),
          logDescription: `Workflow finished with result: ${
            deliverableTask ? deliverableTask.result : lastTaskResult
          }`,
          workflowStatus: 'FINISHED',
          metadata: {
            result: deliverableTask ? deliverableTask.result : lastTaskResult,
            ...stats,
          },
          logType: 'WorkflowStatusUpdate',
          agentName: '',
          taskTitle: '',
          taskStatus: 'DONE',
          agentStatus: 'TASK_COMPLETED',
        };

        set((state: TeamState) => ({
          workflowResult: deliverableTask ? deliverableTask.result : lastTaskResult,
          teamWorkflowStatus: 'FINISHED',
          workflowLogs: [...state.workflowLogs, newLog],
        }));
      },

      setTeamWorkflowStatus: (status: keyof typeof WORKFLOW_STATUS_enum): void => set({ teamWorkflowStatus: status }),

      handleWorkflowError: (task: TaskType, error: ErrorType): void => {
        logger.error(`Workflow Error:`, error.message);
        const stats = get().getWorkflowStats();

        const newLog: Log = {
          task,
          agent: task.agent,
          timestamp: Date.now(),
          logDescription: `Workflow error encountered: ${error.message}`,
          workflowStatus: 'ERRORED',
          metadata: {
            error,
            ...stats,
          },
          logType: 'WorkflowStatusUpdate',
          agentName: task.agent.name,
          taskTitle: task.title,
          taskStatus: task.status,
          agentStatus: task.agent.status,
        };

        set((state: TeamState) => ({
          teamWorkflowStatus: 'ERRORED',
          workflowLogs: [...state.workflowLogs, newLog],
        }));
      },

      handleWorkflowBlocked: ({ task, error }: { task: TaskType; error: ErrorType }): void => {
        logger.warn(`WORKFLOW BLOCKED:`, error.message);

        const stats = get().getWorkflowStats();

        const newLog: Log = {
          task,
          agent: task.agent,
          timestamp: Date.now(),
          logDescription: `Workflow blocked: ${error.message}`,
          workflowStatus: 'BLOCKED',
          metadata: {
            error: error.message,
            ...stats,
            teamName: get().name,
            taskCount: get().tasks.length,
            agentCount: get().agents.length,
          },
          logType: 'WorkflowStatusUpdate',
          agentName: task.agent.name,
          taskTitle: task.title,
          taskStatus: task.status,
          agentStatus: task.agent.status,
        };

        set((state: TeamState) => ({
          teamWorkflowStatus: 'BLOCKED',
          workflowLogs: [...state.workflowLogs, newLog],
        }));
      },

      workOnTask: async (agent: AgentType, task: TaskType): Promise<void> => {
        if (task && agent) {
          if (!validateTask(task)) {
            logger.error(`Invalid task structure in workOnTask for task ID: ${task.id}`);
            return;
          }

          logger.debug(`Task: ${getTaskTitleForLogs(task)} starting...`);
          task.status = 'DOING';

          set((state: TeamState) => {
            const newLog = get().prepareNewLog({
              agent,
              task,
              logDescription: `Task: ${getTaskTitleForLogs(task)} started.`,
              metadata: {},
              logType: 'TaskStatusUpdate',
              agentStatus: agent.status,
            });
            return { workflowLogs: [...state.workflowLogs, newLog] };
          });

          try {
            task.inputs = get().inputs;
            const interpolatedTaskDescription = interpolateTaskDescription(
              task.description,
              get().inputs
            );
            task.interpolatedTaskDescription = interpolatedTaskDescription;

            const pendingFeedbacks = task.feedbackHistory.filter(
              (f: FeedbackObject) => f.status === 'PENDING'
            );

            const currentContext = get().deriveContextFromLogs(
              get().workflowLogs,
              task.id
            );

            if (pendingFeedbacks.length > 0) {
              await agent.workOnFeedback(task, task.feedbackHistory, currentContext);
            } else {
              await agent.workOnTask(task);
            }
          } catch (error) {
            throw error;
          }
        }
      },

      deriveContextFromLogs: (logs: Log[], currentTaskId: string): string => {
        const taskResults = new Map();
        const tasks = get().tasks;
        const currentTaskIndex = tasks.findIndex((task) => task.id === currentTaskId);

        if (currentTaskIndex === -1) {
          console.warn(`Current task with ID ${currentTaskId} not found in the task list.`);
          return '';
        }

        for (const log of logs) {
          if (log.logType === 'TaskStatusUpdate' && log.taskStatus === 'DONE') {
            const taskIndex = tasks.findIndex((task) => task.id === log.task?.id);

            if (taskIndex !== -1 && taskIndex < currentTaskIndex) {
              taskResults.set(log.task?.id, {
                taskDescription: log.task?.description,
                result: log.metadata.result,
                index: taskIndex,
              });
            }
          }
        }

        return Array.from(taskResults.values())
          .sort((a, b) => a.index - b.index)
          .map(({ taskDescription, result }) => `Task: ${taskDescription}\nResult: ${result}\n`)
          .join('\n');
      },

      provideFeedback: async (taskId: string, feedbackContent: string): Promise<void> => {
        const { tasks } = get();

        const taskIndex = tasks.findIndex((t) => t.id === taskId);
        if (taskIndex === -1) {
          logger.error('Task not found');
          return;
        }
        const task = tasks[taskIndex];

        if (!validateTask(task)) {
          logger.error(`Invalid task structure for task ID: ${taskId} in provideFeedback`);
          return;
        }

        const newFeedback: FeedbackObject = {
          id: `${Date.now()}-${taskId}`,
          content: feedbackContent,
          userId: 'userId',
          status: 'PENDING',
          timestamp: new Date(),
        };

        const newWorkflowLog: Log = {
          task,
          agent: task.agent,
          timestamp: Date.now(),
          logDescription: `Workflow running again due to feedback on task.`,
          workflowStatus: 'RUNNING',
          metadata: {
            feedback: newFeedback,
          },
          logType: 'WorkflowStatusUpdate',
          agentName: task.agent.name,
          taskTitle: task.title,
          taskStatus: task.status,
          agentStatus: task.agent.status,
        };

        const updatedTask: TaskType = {
          ...task,
          feedbackHistory: [...(task.feedbackHistory || []), newFeedback],
          status: 'REVISE',
        };

        const newTaskLog = get().prepareNewLog({
          agent: updatedTask.agent,
          task: updatedTask,
          logDescription: `Task with feedback: ${getTaskTitleForLogs(updatedTask)}.`,
          metadata: {
            feedback: newFeedback,
          },
          logType: 'TaskStatusUpdate',
          agentStatus: updatedTask.agent.status,
        });

        set((state: TeamState) => ({
          teamWorkflowStatus: 'RUNNING',
          workflowLogs: [...state.workflowLogs, newWorkflowLog, newTaskLog],
          tasks: state.tasks.map((t) => (t.id === taskId ? updatedTask : t)),
        }));
      },

      validateTask: async (taskId: string): Promise<void> => {
        const task = get().tasks.find((t) => t.id === taskId);
        if (!task) {
          logger.error('Task not found');
          return;
        }

        if (task.status !== 'AWAITING_VALIDATION') {
          logger.error('Task is not awaiting validation');
          return;
        }

        if (!validateTask(task)) {
          logger.error(`Invalid task structure for task ID: ${taskId}`);
          return;
        }

        const updatedTask: TaskType = {
          ...task,
          status: 'VALIDATED',
          feedbackHistory: task.feedbackHistory || [],
        };

        const newWorkflowLog = get().prepareNewLog({
          task: updatedTask,
          agent: updatedTask.agent,
          logDescription: `Workflow running cause a task was validated.`,
          metadata: {},
          logType: 'WorkflowStatusUpdate',
          agentStatus: updatedTask.agent.status
        });

        const newTaskLog = get().prepareNewLog({
          agent: updatedTask.agent,
          task: updatedTask,
          metadata: {},
          logDescription: `Task validated: ${getTaskTitleForLogs(updatedTask)}.`,
          logType: 'TaskStatusUpdate',
          agentStatus: updatedTask.agent.status
        });

        set((state: TeamState) => ({
            tasks: state.tasks.map((t) => (t.id === taskId ? updatedTask : t)),
            workflowLogs: [...state.workflowLogs, newWorkflowLog, newTaskLog],
            teamWorkflowStatus: 'RUNNING',
          }));
  
          get().handleTaskCompleted({
            agent: updatedTask.agent,
            task: updatedTask,
            result: updatedTask.result as TaskResult,
          });
        },
  
        clearAll: (): void =>
          set({
            agents: [],
            tasks: [],
            inputs: {},
            workflowLogs: [],
            workflowContext: '',
            workflowResult: null,
            teamWorkflowStatus: 'INITIAL',
          }),
  
        getWorkflowStats: (): Record<string, any> => {
          const endTime = Date.now();
          const workflowLogs = get().workflowLogs;
          const lastWorkflowRunningLog = workflowLogs
            .slice()
            .reverse()
            .find((log) => log.logType === 'WorkflowStatusUpdate' && log.workflowStatus === 'RUNNING');
        
          const startTime = lastWorkflowRunningLog ? lastWorkflowRunningLog.timestamp : Date.now();
          const duration = (endTime - startTime) / 1000;
          const modelUsageStats: Record<string, LLMUsageStats> = {};
        
          let llmUsageStats: LLMUsageStats = {
            inputTokens: 0,
            outputTokens: 0,
            callsCount: 0,
            callsErrorCount: 0,
            parsingErrors: 0,
          };
          let iterationCount = 0;
        
          workflowLogs.forEach((log) => {
            if (log.logType === 'AgentStatusUpdate' && log.timestamp >= startTime) {
              if (log.agentStatus === 'THINKING_END') {
                const modelCode = log.agent?.llmConfig.model;
                if (modelCode) {
                  if (!modelUsageStats[modelCode]) {
                    modelUsageStats[modelCode] = {
                      inputTokens: 0,
                      outputTokens: 0,
                      callsCount: 0,
                      callsErrorCount: 0,
                      parsingErrors: 0
                    };
                  }
                  modelUsageStats[modelCode].inputTokens += log.metadata.output.llmUsageStats.inputTokens;
                  modelUsageStats[modelCode].outputTokens += log.metadata.output.llmUsageStats.outputTokens;
                  modelUsageStats[modelCode].callsCount += 1;
                  llmUsageStats.inputTokens += log.metadata.output.llmUsageStats.inputTokens;
                  llmUsageStats.outputTokens += log.metadata.output.llmUsageStats.outputTokens;
                  llmUsageStats.callsCount += 1;
                }
              } else if (log.agentStatus === 'THINKING_ERROR') {
                llmUsageStats.callsErrorCount += 1;
                const modelCode = log.agent?.llmConfig.model;
                if (modelCode && modelUsageStats[modelCode]) {
                  modelUsageStats[modelCode].callsErrorCount += 1;
                }
              } else if (log.agentStatus === 'ISSUES_PARSING_LLM_OUTPUT') {
                llmUsageStats.parsingErrors += 1;
                const modelCode = log.agent?.llmConfig.model;
                if (modelCode && modelUsageStats[modelCode]) {
                  modelUsageStats[modelCode].parsingErrors += 1;
                }
              } else if (log.agentStatus === 'ITERATION_END') {
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
  
        getCleanedState: (): any => {
          const cleanAgent = (agent: AgentType) => ({
            ...agent,
            id: '[REDACTED]',
            env: '[REDACTED]',
            llmConfig: agent.llmConfig
              ? {
                  ...agent.llmConfig,
                  apiKey: '[REDACTED]',
                }
              : {},
          });
  
          const cleanTask = (task: TaskType) => ({
            ...task,
            id: '[REDACTED]',
            agent: task.agent ? cleanAgent(task.agent) : null,
            duration: '[REDACTED]',
            endTime: '[REDACTED]',
            startTime: '[REDACTED]',
            feedbackHistory: task.feedbackHistory
              ? task.feedbackHistory.map((feedback: FeedbackObject) => ({
                  ...feedback,
                  timestamp: '[REDACTED]',
                }))
              : [],
          });
  
          const cleanMetadata = (metadata: any) => ({
            ...metadata,
            duration: metadata.duration ? '[REDACTED]' : metadata.duration,
            endTime: metadata.endTime ? '[REDACTED]' : metadata.endTime,
            startTime: metadata.startTime ? '[REDACTED]' : metadata.startTime,
            feedback: metadata.feedback
              ? {
                  ...metadata.feedback,
                  timestamp: '[REDACTED]',
                }
              : {},
          });
  
          const cleanedAgents = get().agents.map((agent) => cleanAgent(agent));
          const cleanedTasks = get().tasks.map((task) => cleanTask(task));
          const cleanedWorkflowLogs = get().workflowLogs.map((log) => ({
            ...log,
            agent: log.agent ? cleanAgent(log.agent) : null,
            task: log.task ? cleanTask(log.task) : null,
            timestamp: '[REDACTED]',
            metadata: log.metadata ? cleanMetadata(log.metadata) : {},
          }));
  
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
  
        handleTaskCompleted: ({ agent, task, result }: { agent: AgentType; task: TaskType; result: TaskResult }): void => {
          logger.debug(`Task completed by agent: ${agent.name}, result: ${result}`);
        },
      };
  
      return store;
    };
  
    return create<TeamStore>()(
      devtools(
        subscribeWithSelector(storeCreator)
      )
    ) as UseBoundTeamStore;
  };
  
  const teamStore = createTeamStore();
  
  setupWorkflowController(teamStore);
  subscribeTaskStatusUpdates(teamStore);
  subscribeWorkflowStatusUpdates(teamStore);
  
  export { createTeamStore, teamStore };