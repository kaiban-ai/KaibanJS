import { create, StateCreator } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { useAgentStore } from './agentStore';
import { useTaskStore } from './taskStore';
import { TASK_STATUS_enum, AGENT_STATUS_enum, WORKFLOW_STATUS_enum, FEEDBACK_STATUS_enum } from '../utils/enums';
import { getTaskTitleForLogs, interpolateTaskDescription, validateTask } from '../utils/tasks';
import { logger, setLogLevel } from '../utils/logger';
import { calculateTotalWorkflowCost } from '../utils/llmCostCalculator';
import { subscribeWorkflowStatusUpdates } from '../subscribers/teamSubscriber';
import { subscribeTaskStatusUpdates } from '../subscribers/taskSubscriber';
import { setupWorkflowController } from './workflowController';

// Define FeedbackObject and FeedbackHistory types
type FeedbackObject = {
  id: string;
  timestamp: Date;
  content: string;
  userId: string;
  category?: string;
  status?: 'open' | 'in progress' | 'resolved' | 'pending';
  priority?: 'low' | 'medium' | 'high';
  assignedTo?: string;
};

type FeedbackHistory = FeedbackObject[];

interface TeamState {
    teamWorkflowStatus: typeof WORKFLOW_STATUS_enum[keyof typeof WORKFLOW_STATUS_enum];
    workflowResult: any;
    name: string;
    agents: any[];
    tasks: any[];
    workflowLogs: any[];
    inputs: Record<string, any>;
    workflowContext: string;
    env: Record<string, any>;
    logLevel: string | undefined; // Allow undefined logLevel

    setInputs: (inputs: Record<string, any>) => void;
    setName: (name: string) => void;
    setEnv: (env: Record<string, any>) => void;
    addAgents: (agents: any[]) => void;
    addTasks: (tasks: any[]) => void;
    updateTaskStatus: (taskId: string, status: typeof TASK_STATUS_enum[keyof typeof TASK_STATUS_enum]) => void;
    startWorkflow: (inputs?: Record<string, any>) => Promise<void>;
    resetWorkflowStateAction: () => void;
    finishWorkflowAction: () => void;
    setTeamWorkflowStatus: (status: typeof WORKFLOW_STATUS_enum[keyof typeof WORKFLOW_STATUS_enum]) => void;
    handleWorkflowError: (task: any, error: Error) => void;
    handleWorkflowBlocked: (params: { task: any; error: Error }) => void;
    workOnTask: (agent: any, task: any) => Promise<void>;
    deriveContextFromLogs: (logs: any[], currentTaskId: string) => string;
    provideFeedback: (taskId: string, feedbackContent: string) => Promise<void>;
    validateTask: (taskId: string) => Promise<void>;
    prepareNewLog: (params: {
        agent: any;
        task: any;
        logDescription: string;
        metadata: Record<string, any>;
        logType: string;
    }) => any;
    clearAll: () => void;
    getWorkflowStats: () => any;
    getCleanedState: () => any;
    handleTaskCompleted: (params: { agent: any; task: any; result: any }) => void;
}

const createTeamStore = (initialState: Partial<TeamState> = {}): StateCreator<TeamState> => {
    if (initialState.logLevel) {
        setLogLevel(initialState.logLevel);
    }
    const useTeamStore = create<TeamState>()(
        devtools(
            subscribeWithSelector((set, get) => ({
                ...useAgentStore(set as any, get),
                ...useTaskStore(set as any, get),

                teamWorkflowStatus: initialState.teamWorkflowStatus || WORKFLOW_STATUS_enum.INITIAL,
                workflowResult: initialState.workflowResult || null,
                name: initialState.name || '',
                agents: initialState.agents || [],
                tasks: initialState.tasks || [],
                workflowLogs: initialState.workflowLogs || [],
                inputs: initialState.inputs || {},
                workflowContext: initialState.workflowContext || '',
                env: initialState.env || {},
                logLevel: initialState.logLevel || 'defaultLogLevel',

                setInputs: (inputs) => set({ inputs }),
                setName: (name) => set({ name }),
                setEnv: (env) => set({ env }),

                addAgents: (agents) => {
                    const { env } = get();
                    agents.forEach((agent) => {
                        agent.initialize(useTeamStore, env);
                    });
                    set((state) => ({ agents: [...state.agents, ...agents] }));
                },

                addTasks: (tasks) => {
                    tasks.forEach((task) => task.setStore(useTeamStore));
                    set((state) => ({ tasks: [...state.tasks, ...tasks.map((task) => ({ ...task, agent: task.agent }))] }));
                },

                updateTaskStatus: (taskId, status) =>
                    set((state) => ({
                        tasks: state.tasks.map((task) => (task.id === taskId ? { ...task, status } : task)),
                    })),

                startWorkflow: async (inputs) => {
                    logger.info(`🚀 Team *${get().name}* is starting to work.`);
                    get().resetWorkflowStateAction();

                    if (inputs) {
                        get().setInputs(inputs);
                    }

                    const initialLog = {
                        task: null,
                        agent: null,
                        timestamp: Date.now(),
                        logDescription: `Workflow initiated for team *${get().name}*.`,
                        workflowStatus: WORKFLOW_STATUS_enum.RUNNING,
                        metadata: {
                            message: 'Workflow has been initialized with input settings.',
                            inputs,
                        },
                        logType: 'WorkflowStatusUpdate',
                    };

                    set((state) => ({
                        workflowLogs: [...state.workflowLogs, initialLog],
                        teamWorkflowStatus: WORKFLOW_STATUS_enum.RUNNING,
                    }));

                    const tasks = get().tasks;
                    if (tasks.length > 0 && tasks[0].status === TASK_STATUS_enum.TODO) {
                        get().updateTaskStatus(tasks[0].id, TASK_STATUS_enum.DOING);
                    }
                },

                resetWorkflowStateAction: () => {
                    set((state) => {
                        const resetTasks = state.tasks.map((task) => ({
                            ...task,
                            status: 'TODO',
                        }));

                        get().agents.forEach((agent) => {
                            agent.setStatus('INITIAL');
                        });

                        return {
                            tasks: resetTasks,
                            agents: [...state.agents],
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
                    const deliverableTask = tasks.slice().reverse().find((task) => task.isDeliverable);
                    const lastTaskResult = tasks[tasks.length - 1].result;

                    const newLog = {
                        task: null,
                        agent: null,
                        timestamp: Date.now(),
                        logDescription: `Workflow finished with result: ${
                            deliverableTask ? deliverableTask.result : lastTaskResult
                        }`,
                        workflowStatus: WORKFLOW_STATUS_enum.FINISHED,
                        metadata: {
                            result: deliverableTask ? deliverableTask.result : lastTaskResult,
                            ...stats,
                        },
                        logType: 'WorkflowStatusUpdate',
                    };

                    set((state) => ({
                        workflowResult: deliverableTask ? deliverableTask.result : lastTaskResult,
                        teamWorkflowStatus: WORKFLOW_STATUS_enum.FINISHED,
                        workflowLogs: [...state.workflowLogs, newLog],
                    }));
                },

                setTeamWorkflowStatus: (status) => set({ teamWorkflowStatus: status }),

                handleWorkflowError: (task, error) => {
                    logger.error(`Workflow Error:`, error.message);
                    const stats = get().getWorkflowStats();

                    const newLog = {
                        task,
                        agent: task.agent,
                        timestamp: Date.now(),
                        logDescription: `Workflow error encountered: ${error.message}`,
                        workflowStatus: WORKFLOW_STATUS_enum.ERRORED,
                        metadata: {
                            error,
                            ...stats,
                        },
                        logType: 'WorkflowStatusUpdate',
                    };

                    set((state) => ({
                        teamWorkflowStatus: WORKFLOW_STATUS_enum.ERRORED,
                        workflowLogs: [...state.workflowLogs, newLog],
                    }));
                },

                handleWorkflowBlocked: ({ task, error }) => {
                    logger.warn(`WORKFLOW BLOCKED:`, error.message);

                    const stats = get().getWorkflowStats();

                    const newLog = {
                        task,
                        agent: task.agent,
                        timestamp: Date.now(),
                        logDescription: `Workflow blocked: ${error.message}`,
                        workflowStatus: WORKFLOW_STATUS_enum.BLOCKED,
                        metadata: {
                            error: error.message,
                            ...stats,
                            teamName: get().name,
                            taskCount: get().tasks.length,
                            agentCount: get().agents.length,
                        },
                        logType: 'WorkflowStatusUpdate',
                    };

                    set((state) => ({
                        teamWorkflowStatus: WORKFLOW_STATUS_enum.BLOCKED,
                        workflowLogs: [...state.workflowLogs, newLog],
                    }));
                },

                workOnTask: async (agent, task) => {
                    if (task && agent) {
                        if (!validateTask(task)) {
                            logger.error(`Invalid task structure in workOnTask for task ID: ${task.id}`);
                            return;
                        }

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
                                (f: FeedbackObject) => f.status === 'pending'
                            );

                            const currentContext = get().deriveContextFromLogs(
                                get().workflowLogs,
                                task.id
                            );

                            if (pendingFeedbacks.length > 0) {
                                await agent.workOnFeedback(task, task.feedbackHistory, currentContext);
                            } else {
                                await agent.workOnTask(task, get().inputs, currentContext);
                            }
                        } catch (error) {
                            throw error;
                        }
                    }
                },

                deriveContextFromLogs: (logs, currentTaskId) => {
                    const taskResults = new Map();
                    const tasks = get().tasks;
                    const currentTaskIndex = tasks.findIndex((task) => task.id === currentTaskId);

                    if (currentTaskIndex === -1) {
                        console.warn(`Current task with ID ${currentTaskId} not found in the task list.`);
                        return '';
                    }

                    for (const log of logs) {
                        if (log.logType === 'TaskStatusUpdate' && log.taskStatus === TASK_STATUS_enum.DONE) {
                            const taskIndex = tasks.findIndex((task) => task.id === log.task.id);

                            if (taskIndex !== -1 && taskIndex < currentTaskIndex) {
                                taskResults.set(log.task.id, {
                                    taskDescription: log.task.description,
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

                provideFeedback: async (taskId, feedbackContent) => {
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
                        userId: 'userId', // Replace with actual userId
                        status: 'pending',
                        timestamp: new Date(),
                    };

                    const newWorkflowLog = {
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
                        logDescription: `Task with feedback: ${getTaskTitleForLogs(updatedTask)}.`,
                        metadata: {
                            feedback: newFeedback,
                        },
                        logType: 'TaskStatusUpdate',
                    });

                    set((state) => ({
                        teamWorkflowStatus: WORKFLOW_STATUS_enum.RUNNING,
                        workflowLogs: [...state.workflowLogs, newWorkflowLog, newTaskLog],
                        tasks: state.tasks.map((t) => (t.id === taskId ? updatedTask : t)),
                    }));
                },

                validateTask: async (taskId) => {
                    const task = get().tasks.find((t) => t.id === taskId);
                    if (!task) {
                        logger.error('Task not found');
                        return;
                    }

                    if (task.status !== TASK_STATUS_enum.AWAITING_VALIDATION) {
                        logger.error('Task is not awaiting validation');
                        return;
                    }

                    if (!validateTask(task)) {
                        logger.error(`Invalid task structure for task ID: ${taskId}`);
                        return;
                    }

                    const updatedTask = {
                        ...task,
                        status: TASK_STATUS_enum.VALIDATED,
                        feedbackHistory: task.feedbackHistory || [],
                    };

                    const newWorkflowLog = {
                        task: updatedTask,
                        agent: updatedTask.agent,
                        timestamp: Date.now(),
                        logDescription: `Workflow running cause a task was validated.`,
                        workflowStatus: WORKFLOW_STATUS_enum.RUNNING,
                        metadata: {},
                        logType: 'WorkflowStatusUpdate',
                    };

                    const newTaskLog = get().prepareNewLog({
                        agent: updatedTask.agent,
                        task: updatedTask,
                        metadata: {},
                        logDescription: `Task validated: ${getTaskTitleForLogs(updatedTask)}.`,
                        logType: 'TaskStatusUpdate',
                    });

                    set((state) => ({
                        tasks: state.tasks.map((t) => (t.id === taskId ? updatedTask : t)),
                        workflowLogs: [...state.workflowLogs, newWorkflowLog, newTaskLog],
                        teamWorkflowStatus: WORKFLOW_STATUS_enum.RUNNING,
                    }));

                    get().handleTaskCompleted({
                        agent: updatedTask.agent,
                        task: updatedTask,
                        result: updatedTask.result,
                    });
                },

                prepareNewLog: ({ agent, task, logDescription, metadata, logType }) => {
                    const timestamp = Date.now();

                    const newLog = {
                        timestamp,
                        task,
                        agent,
                        agentName: agent ? agent.name : 'Unknown Agent',
                        taskTitle: task ? getTaskTitleForLogs(task) : 'Untitled Task',
                        logDescription,
                        taskStatus: task ? task.status : 'Unknown',
                        agentStatus: agent ? agent.status : 'Unknown',
                        metadata,
                        logType,
                    };

                    return newLog;
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

                getWorkflowStats() {
                    const endTime = Date.now();
                    const workflowLogs = get().workflowLogs;
                    const lastWorkflowRunningLog = workflowLogs
                        .slice()
                        .reverse()
                        .find((log) => log.logType === 'WorkflowStatusUpdate' && log.workflowStatus === 'RUNNING');

                    const startTime = lastWorkflowRunningLog ? lastWorkflowRunningLog.timestamp : Date.now();
                    const duration = (endTime - startTime) / 1000;
                    const modelUsageStats: Record<string, { inputTokens: number; outputTokens: number; callsCount: number }> = {};

                    let llmUsageStats = {
                        inputTokens: 0,
                        outputTokens: 0,
                        callsCount: 0,
                        callsErrorCount: 0,
                        parsingErrors: 0,
                    };
                    let iterationCount = 0;

                    workflowLogs.forEach((log) => {
                        if (log.logType === 'AgentStatusUpdate' && log.timestamp >= startTime) {
                            if (log.agentStatus === AGENT_STATUS_enum.THINKING_END) {
                                const modelCode = log.agent.llmConfig.model;
                                if (!modelUsageStats[modelCode]) {
                                    modelUsageStats[modelCode] = { inputTokens: 0, outputTokens: 0, callsCount: 0 };
                                }
                                modelUsageStats[modelCode].inputTokens += log.metadata.output.llmUsageStats.inputTokens;
                                modelUsageStats[modelCode].outputTokens += log.metadata.output.llmUsageStats.outputTokens;
                                modelUsageStats[modelCode].callsCount += 1;
                                llmUsageStats.inputTokens += log.metadata.output.llmUsageStats.inputTokens;
                                llmUsageStats.outputTokens += log.metadata.output.llmUsageStats.outputTokens;
                                llmUsageStats.callsCount += 1;
                            } else if (log.agentStatus === AGENT_STATUS_enum.THINKING_ERROR) {
                                llmUsageStats.callsErrorCount += 1;
                            } else if (log.agentStatus === AGENT_STATUS_enum.ISSUES_PARSING_LLM_OUTPUT) {
                                llmUsageStats.parsingErrors += 1;
                            } else if (log.agentStatus === AGENT_STATUS_enum.ITERATION_END) {
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

                getCleanedState() {
                    const cleanAgent = (agent: any) => ({
                        ...agent,
                        id: '[REDACTED]',
                        env: '[REDACTED]',
                        llmConfig: agent.llmConfig
                            ? {
                                  ...agent.llmConfig,
                                  apiKey: '[REDACTED]',
                              }
                            : {},
                        agentInstance: agent.agentInstance
                            ? {
                                  ...agent.agentInstance,
                                  id: '[REDACTED]',
                                  env: '[REDACTED]',
                                  llmConfig: agent.agentInstance.llmConfig
                                      ? {
                                            ...agent.agentInstance.llmConfig,
                                            apiKey: '[REDACTED]',
                                        }
                                      : {},
                              }
                            : {},
                    });

                    const cleanTask = (task: any) => ({
                        ...task,
                        id: '[REDACTED]',
                        agent: task.agent ? cleanAgent(task.agent) : null,
                        duration: '[REDACTED]',
                        endTime: '[REDACTED]',
                        startTime: '[REDACTED]',
                        feedbackHistory: task.feedbackHistory
                            ? task.feedbackHistory.map((feedback: any) => ({
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

                handleTaskCompleted: ({ agent, task, result }) => {
                    logger.debug(`Task completed by agent: ${agent.name}, result: ${result}`);
                },
            }))
        )
    );

    setupWorkflowController(useTeamStore);
    subscribeTaskStatusUpdates(useTeamStore);
    subscribeWorkflowStatusUpdates(useTeamStore);

    return useTeamStore;
};

export { createTeamStore };
