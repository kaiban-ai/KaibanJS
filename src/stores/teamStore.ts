import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import {
    TeamState,
    TeamStore,
    CreateTeamStore,
    UseBoundTeamStore,
    TeamStoreCreator,
    AgentType,
    TaskType,
    FeedbackObject,
    TaskResult,
    Log,
    ErrorType,
    LLMUsageStats,
    Output,
    TeamStoreApi
} from '../../types/types';
import { useAgentStore } from './agentStore';
import { useTaskStore } from './taskStore';
import { TASK_STATUS_enum, AGENT_STATUS_enum, WORKFLOW_STATUS_enum } from '../utils/enums';
import { getTaskTitleForLogs, interpolateTaskDescription, validateTask } from '../utils/tasks';  // Imported validateTask
import { logger, setLogLevel } from '../utils/logger';
import { calculateTotalWorkflowCost } from '../utils/llmCostCalculator';
import { subscribeWorkflowStatusUpdates } from '../subscribers/teamSubscriber';
import { subscribeTaskStatusUpdates } from '../subscribers/taskSubscriber';
import { setupWorkflowController } from './workflowController';

// Type guard for function checking
function isFunction(value: unknown): value is Function {
    return typeof value === 'function';
}

// Type guard for store validation
function isTeamStore(store: unknown): store is TeamStore {
    return (
        typeof store === 'object' &&
        store !== null &&
        'getState' in store &&
        'setState' in store &&
        'subscribe' in store
    );
}

// Helper function to create type-safe store proxy
function createStoreProxy(store: UseBoundTeamStore): TeamStore {
    const state = store.getState();
    const methods = new Set(Object.getOwnPropertyNames(Object.getPrototypeOf(state)));

    return new Proxy(state as TeamStore, {
        get(target: TeamStore, prop: string | symbol) {
            const key = prop.toString();

            // Handle special Zustand properties
            if (key === 'subscribe') return store.subscribe;
            if (key === 'getState') return store.getState;
            if (key === 'setState') return store.setState;
            if (key === 'destroy') return store.destroy;

            // Bind methods to current state
            if (methods.has(key)) {
                const method = state[key as keyof typeof state];
                return typeof method === 'function' ? method.bind(state) : method;
            }

            // Get current state properties
            return store.getState()[key as keyof TeamStore];
        }
    });
}

export const createTeamStore: CreateTeamStore = (initialState: Partial<TeamState> = {}) => {
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

            subscribe: api.subscribe,
            getState: api.getState,
            setState: api.setState,
            destroy: api.destroy,

            setInputs: (inputs: Record<string, any>): void => set({ inputs }),
            setName: (name: string): void => set({ name }),
            setEnv: (env: Record<string, any>): void => set({ env }),
            setTeamWorkflowStatus: (status: keyof typeof WORKFLOW_STATUS_enum): void => 
                set({ teamWorkflowStatus: status }),

            addAgents: (agents: AgentType[]): void => {
                const { env } = get();
                agents.forEach((agent) => {
                    agent.initialize(store, env);
                });
                set((state) => ({ agents: [...state.agents, ...agents] }));
            },

            addTasks: (tasks: TaskType[]): void => {
                tasks.forEach((task) => task.setStore(store));
                set((state) => ({
                    tasks: [...state.tasks, ...tasks.map((task) => ({ 
                        ...task, 
                        agent: task.agent 
                    }))]
                }));
            },

            updateTaskStatus: (taskId: string, status: keyof typeof TASK_STATUS_enum): void =>
                set((state) => ({
                    tasks: state.tasks.map((task) => 
                        task.id === taskId ? { ...task, status } : task
                    ),
                })),

            deriveContextFromLogs: (logs: Log[], currentTaskId: string): string => {
                const taskResults = new Map();
                const tasks = get().tasks;
                const currentTaskIndex = tasks.findIndex((task) => task.id === currentTaskId);

                if (currentTaskIndex === -1) {
                    logger.warn(`Task ${currentTaskId} not found in task list`);
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
                    .map(({ taskDescription, result }) => 
                        `Task: ${taskDescription}\nResult: ${result}\n`)
                    .join('\n');
            },

            startWorkflow: async (inputs?: Record<string, any>): Promise<void> => {
                logger.info(`🚀 Team *${get().name}* starting workflow`);
                get().resetWorkflowStateAction();

                if (inputs) {
                    get().setInputs(inputs);
                }

                const initialLog: Log = {
                    task: null,
                    agent: null,
                    timestamp: Date.now(),
                    logDescription: `Workflow initiated for team *${get().name}*`,
                    workflowStatus: 'RUNNING',
                    metadata: {
                        message: 'Workflow initialized with input settings',
                        inputs,
                    },
                    logType: 'WorkflowStatusUpdate',
                    agentName: '',
                    taskTitle: '',
                    taskStatus: 'TODO',
                    agentStatus: 'INITIAL',
                };

                set((state) => ({
                    workflowLogs: [...state.workflowLogs, initialLog],
                    teamWorkflowStatus: 'RUNNING',
                }));

                const tasks = get().tasks;
                if (tasks.length > 0 && tasks[0].status === 'TODO') {
                    get().updateTaskStatus(tasks[0].id, 'DOING');
                }
            },

            resetWorkflowStateAction: (): void => {
                set((state) => {
                    const resetTasks = state.tasks.map((task) => ({
                        ...task,
                        status: 'TODO' as keyof typeof TASK_STATUS_enum,
                    }));

                    state.agents.forEach((agent) => {
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
                logger.debug('Workflow state reset complete');
            },

            workOnTask: async (agent: AgentType, task: TaskType): Promise<void> => {
                if (!task || !agent) return;

                if (!validateTask(task)) {
                    logger.error(`Invalid task structure for task ID: ${task.id}`);
                    return;
                }

                logger.debug(`Starting task: ${getTaskTitleForLogs(task)}`);
                task.status = 'DOING';

                set((state) => {
                    const newLog: Log = {
                        task,
                        agent,
                        timestamp: Date.now(),
                        logDescription: `Task: ${getTaskTitleForLogs(task)} started`,
                        metadata: {},
                        logType: 'TaskStatusUpdate',
                        workflowStatus: state.teamWorkflowStatus,
                        agentName: agent.name,
                        taskTitle: task.title,
                        taskStatus: task.status,
                        agentStatus: agent.status,
                    };
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
            },

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
                        ...stats
                    },
                    logType: 'WorkflowStatusUpdate',
                    agentName: task.agent.name,
                    taskTitle: task.title,
                    taskStatus: task.status,
                    agentStatus: task.agent.status,
                };

                set((state) => ({
                    teamWorkflowStatus: 'ERRORED',
                    workflowLogs: [...state.workflowLogs, newLog],
                }));
            },

            provideFeedback: async (taskId: string, feedbackContent: string): Promise<void> => {
                const { tasks } = get();
                const taskIndex = tasks.findIndex((t) => t.id === taskId);

                if (taskIndex === -1) {
                    logger.error('Task not found for feedback');
                    return;
                }

                const task = tasks[taskIndex];
                if (!validateTask(task)) {
                    logger.error(`Invalid task structure for task ID: ${taskId}`);
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
                    logDescription: 'Workflow running again due to feedback',
                    workflowStatus: 'RUNNING',
                    metadata: { feedback: newFeedback },
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

                const newTaskLog: Log = {
                    task: updatedTask,
                    agent: updatedTask.agent,
                    timestamp: Date.now(),
                    logDescription: `Task with feedback: ${getTaskTitleForLogs(updatedTask)}`,
                    metadata: { feedback: newFeedback },
                    logType: 'TaskStatusUpdate',
                    workflowStatus: 'RUNNING',
                    agentName: updatedTask.agent.name,
                    taskTitle: updatedTask.title,
                    taskStatus: updatedTask.status,
                    agentStatus: updatedTask.agent.status,
                };

                set((state) => ({
                    teamWorkflowStatus: 'RUNNING',
                    workflowLogs: [...state.workflowLogs, newWorkflowLog, newTaskLog],
                    tasks: state.tasks.map((t) => (t.id === taskId ? updatedTask : t)),
                }));
            },

            validateTask: async (taskId: string): Promise<void> => {
                const task = get().tasks.find((t) => t.id === taskId);
                if (!task) {
                    logger.error('Task not found for validation');
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

                const newWorkflowLog: Log = {
                    task: updatedTask,
                    agent: updatedTask.agent,
                    timestamp: Date.now(),
                    logDescription: 'Workflow running after task validation',
                    metadata: {},
                    logType: 'WorkflowStatusUpdate',
                    workflowStatus: 'RUNNING',
                    agentName: updatedTask.agent.name,
                    taskTitle: updatedTask.title,
                    taskStatus: updatedTask.status,
                    agentStatus: updatedTask.agent.status,
                };

                const newTaskLog: Log = {
                    task: updatedTask,
                    agent: updatedTask.agent,
                    timestamp: Date.now(),
                    logDescription: `Task validated: ${getTaskTitleForLogs(updatedTask)}`,
                    metadata: {},
                    logType: 'TaskStatusUpdate',
                    workflowStatus: 'RUNNING',
                    agentName: updatedTask.agent.name,
                    taskTitle: updatedTask.title,
                    taskStatus: updatedTask.status,
                    agentStatus: updatedTask.agent.status,
                };

                set((state) => ({
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
                                        parsingErrors: 0,
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
                const state = get();
                return {
                    teamWorkflowStatus: state.teamWorkflowStatus,
                    workflowResult: state.workflowResult,
                    name: state.name,
                    agents: state.agents.map(agent => ({
                        ...agent,
                        id: '[REDACTED]',
                        env: '[REDACTED]',
                        llmConfig: agent.llmConfig
                            ? {
                                ...agent.llmConfig,
                                apiKey: '[REDACTED]',
                            }
                            : {},
                    })),
                    tasks: state.tasks.map(task => ({
                        ...task,
                        id: '[REDACTED]',
                        agent: task.agent ? {
                            ...task.agent,
                            id: '[REDACTED]',
                            env: '[REDACTED]',
                            llmConfig: {
                                ...task.agent.llmConfig,
                                apiKey: '[REDACTED]',
                            },
                        } : null,
                        duration: '[REDACTED]',
                        endTime: '[REDACTED]',
                        startTime: '[REDACTED]',
                        feedbackHistory: task.feedbackHistory
                            ? task.feedbackHistory.map((feedback: FeedbackObject) => ({
                                ...feedback,
                                timestamp: '[REDACTED]',
                            }))
                            : [],
                    })),
                    workflowLogs: state.workflowLogs,
                    inputs: state.inputs,
                    workflowContext: state.workflowContext,
                    logLevel: state.logLevel,
                };
            },
        };

        return store;
    };

    const boundStore = create<TeamStore>()(
        devtools(subscribeWithSelector(storeCreator))
    ) as UseBoundTeamStore;

    const proxiedStore = createStoreProxy(boundStore);

    if (isTeamStore(proxiedStore)) {
        setupWorkflowController(proxiedStore);
        subscribeTaskStatusUpdates(boundStore);
        subscribeWorkflowStatusUpdates(boundStore);
    }

    return boundStore;
};

export const teamStore = createTeamStore();
