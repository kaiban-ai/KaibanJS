import { TASK_STATUS_enum, AGENT_STATUS_enum, FEEDBACK_STATUS_enum, WORKFLOW_STATUS_enum } from "../utils/enums";
import { getTaskTitleForLogs, interpolateTaskDescription, validateTask } from '../utils/tasks';
import { logger } from "../utils/logger";
import { calculateTaskCost, calculateTotalWorkflowCost } from "../utils/llmCostCalculator";
import {
    Agent,
    Task,
    ErrorType,
    FeedbackObject,
    TaskStoreState,
    TaskStats,
    TaskResult,
    Log,
    PrepareNewLogParams,
    PrettyErrorType
} from './storeTypes';

export const useTaskStore = (set: (fn: (state: TaskStoreState) => Partial<TaskStoreState>) => void, get: () => TaskStoreState): TaskStoreState => ({
    tasksInitialized: false,
    workflowLogs: [],
    tasks: [],

    getTaskStats(task: Task): TaskStats {
        const endTime = Date.now();
        const lastDoingLog = get().workflowLogs.slice().reverse().find(log =>
            log.task && log.task.id === task.id && log.logType === "TaskStatusUpdate" && log.taskStatus === 'DOING'
        );
        const startTime = lastDoingLog ? lastDoingLog.timestamp : endTime;
        const duration = (endTime - startTime) / 1000;
    
        let llmUsageStats = {
            inputTokens: 0,
            outputTokens: 0,
            callsCount: 0,
            callsErrorCount: 0,
            parsingErrors: 0
        };
        let iterationCount = 0;
    
        get().workflowLogs.forEach(log => {
            if (log.task && log.task.id === task.id && log.timestamp >= startTime && log.logType === 'AgentStatusUpdate') {
                if (log.agentStatus === 'THINKING_END') {
                    llmUsageStats.inputTokens += log.metadata.output.llmUsageStats.inputTokens;
                    llmUsageStats.outputTokens += log.metadata.output.llmUsageStats.outputTokens;
                    llmUsageStats.callsCount += 1;
                }
                if (log.agentStatus === 'THINKING_ERROR') {
                    llmUsageStats.callsErrorCount += 1;
                }
                if (log.agentStatus === 'ISSUES_PARSING_LLM_OUTPUT') {
                    llmUsageStats.parsingErrors += 1;
                }
                if (log.agentStatus === 'ITERATION_END') {
                    iterationCount += 1;
                }
            }
        });
    
        return {
            startTime,
            endTime,
            duration,
            llmUsageStats,
            iterationCount
        };
    },

    handleTaskCompleted: ({ agent, task, result }: { agent: Agent; task: Task; result: TaskResult }) => {
        if (!validateTask(task)) {
            logger.error(`Invalid task structure in handleTaskCompleted`);
            return;
        }
    
        const stats = get().getTaskStats(task);
        task.result = result;
    
        const updatedFeedbackHistory = (task.feedbackHistory || []).map(feedback =>
            feedback.status === 'PENDING' ? 
            { ...feedback, status: 'PROCESSED' as keyof typeof FEEDBACK_STATUS_enum } : 
            feedback
        );
    
        if (task.externalValidationRequired && task.status !== 'VALIDATED') {
            task.status = 'AWAITING_VALIDATION' as keyof typeof TASK_STATUS_enum;
            const modelCode = agent.llmConfig.model;
            const costDetails = calculateTaskCost(modelCode, stats.llmUsageStats);            
            const taskLog = get().prepareNewLog({
                agent,
                task,
                logDescription: `Task awaiting validation: ${getTaskTitleForLogs(task)}. Awaiting validation.`,
                metadata: {
                    ...stats,
                    costDetails,
                    result
                },
                logType: 'TaskStatusUpdate',
                agentStatus: agent.status
            });
            set(state => ({
                tasks: state.tasks.map(t => t.id === task.id ? {
                    ...t,
                    ...stats,
                    status: 'AWAITING_VALIDATION' as keyof typeof TASK_STATUS_enum,
                    result,
                    feedbackHistory: updatedFeedbackHistory
                } as Task : t),
                workflowLogs: [...state.workflowLogs, taskLog]
            }));
    
            get().handleWorkflowBlocked({ task, error: new Error('Task awaiting validation') });
        } else {
            task.status = 'DONE' as keyof typeof TASK_STATUS_enum;
            const modelCode = agent.llmConfig.model;
            const costDetails = calculateTaskCost(modelCode, stats.llmUsageStats);
            const taskLog = get().prepareNewLog({
                agent,
                task,
                logDescription: `Task completed: ${getTaskTitleForLogs(task)}.`,
                metadata: {
                    ...stats,
                    costDetails,
                    result
                },
                logType: 'TaskStatusUpdate',
                agentStatus: agent.status
            });
            logger.debug(`Task completed with ID ${task.id}, Duration: ${stats.duration} seconds`);
            set(state => ({
                ...state,
                workflowLogs: [...state.workflowLogs, taskLog],
                tasks: state.tasks.map(t => t.id === task.id ? {
                    ...t,
                    ...stats,
                    status: 'DONE' as keyof typeof TASK_STATUS_enum,
                    result,
                    feedbackHistory: updatedFeedbackHistory
                } as Task : t)
            }));
        
            const tasks = get().tasks;
            const allTasksDone = tasks.every(t => t.status === 'DONE');
            if (allTasksDone) {
                get().finishWorkflowAction();
            }
        }
    },

    provideFeedback: async (taskId: string, feedbackContent: string) => {
        const { tasks } = get();
        const taskIndex = tasks.findIndex((t: Task) => t.id === taskId);
        if (taskIndex === -1) {
            logger.error("Task not found");
            return;
        }
        const task = tasks[taskIndex];

        if (!validateTask(task)) {
            logger.error(`Invalid task structure for task ID: ${taskId} in provideFeedback`);
            return;
        }

        const newFeedback: FeedbackObject = {
            id: `feedback-${Date.now()}`,
            content: feedbackContent,
            status: 'PENDING' as keyof typeof FEEDBACK_STATUS_enum,
            timestamp: new Date(),
            userId: 'system'
        };

        const updatedTask: Task = {
            ...task,
            feedbackHistory: [...task.feedbackHistory, newFeedback],
            status: 'REVISE' as keyof typeof TASK_STATUS_enum,
        };

        set((state) => ({
            tasks: state.tasks.map((t: Task) => t.id === task.id ? updatedTask : t)
        }));

        logger.debug(`Feedback added to task ${task.id}`);
    },

    handleTaskError: ({ task, error }: { task: Task; error: ErrorType }) => {
        if (!validateTask(task)) {
            logger.error(`Invalid task structure in handleTaskError`);
            return;
        }

        const stats = get().getTaskStats(task);
        task.status = 'BLOCKED' as keyof typeof TASK_STATUS_enum;
        const modelCode = task.agent.llmConfig.model;
        const costDetails = calculateTaskCost(modelCode, stats.llmUsageStats);              
        const updatedFeedbackHistory = task.feedbackHistory.map((f: FeedbackObject) => 
            f.status === 'PENDING'
                ? { ...f, status: 'PROCESSED' as keyof typeof FEEDBACK_STATUS_enum } 
                : f
        );
        const taskLog = get().prepareNewLog({
            agent: task.agent,
            task,
            logDescription: `Task error: ${getTaskTitleForLogs(task)}, Error: ${error.message}`,
            metadata: {
                ...stats,
                costDetails,
                error: error.message
            },
            logType: 'TaskStatusUpdate',
            agentStatus: task.agent.status
        });

        set(state => ({
            tasks: state.tasks.map(t => t.id === task.id ? {
                ...t,
                ...stats,
                status: 'BLOCKED' as keyof typeof TASK_STATUS_enum,
                error: error.message,
                feedbackHistory: updatedFeedbackHistory
            } as Task : t),
            workflowLogs: [...state.workflowLogs, taskLog]
        }));

        const prettyError: PrettyErrorType = {
            name: 'Task Error Encountered',
            message: 'Task encountered an error during processing.',
            recommendedAction: 'Check logs and debug the application.',
            rootError: error,
            context: { task, error }
        };

        logger.error(prettyError.message);
    },
    handleTaskBlocked: ({ task, error }: { task: Task; error: ErrorType }) => {
        if (!validateTask(task)) {
            logger.error(`Invalid task structure in handleTaskBlocked`);
            return;
        }

        const stats = get().getTaskStats(task);
        task.status = 'BLOCKED' as keyof typeof TASK_STATUS_enum;
        const modelCode = task.agent.llmConfig.model;
        const costDetails = calculateTaskCost(modelCode, stats.llmUsageStats);            

        const updatedFeedbackHistory = task.feedbackHistory.map((f: FeedbackObject) => 
            f.status === 'PENDING'
                ? { ...f, status: 'PROCESSED' as keyof typeof FEEDBACK_STATUS_enum } 
                : f
        );

        const taskLog = get().prepareNewLog({
            agent: task.agent,
            task,
            logDescription: `Task blocked: ${getTaskTitleForLogs(task)}, Reason: ${error.message}`,
            metadata: {
                ...stats,
                costDetails,
                error
            },
            logType: 'TaskStatusUpdate',
            agentStatus: task.agent.status
        });

        const prettyError: PrettyErrorType = {
            name: 'TASK BLOCKED',
            message: 'Task blocked due to a possible error during execution.',
            recommendedAction: 'Enable detailed logging to facilitate troubleshooting.',
            rootError: error,
            context: { task, error }
        };

        logger.warn(prettyError.message);
        set(state => ({
            tasks: state.tasks.map(t => t.id === task.id ? {
                ...t,
                ...stats,
                status: 'BLOCKED' as keyof typeof TASK_STATUS_enum,
                feedbackHistory: updatedFeedbackHistory
            } as Task : t),
            workflowLogs: [...state.workflowLogs, taskLog]
        }));
        get().handleWorkflowBlocked({ task, error });
    },

    prepareNewLog: (params: PrepareNewLogParams): Log => {
        const { agent, task, logDescription, metadata, logType, agentStatus } = params;
        const timestamp = Date.now();

        return {
            timestamp,
            task,
            agent,
            agentName: agent ? agent.name : 'Unknown Agent',
            taskTitle: task ? getTaskTitleForLogs(task) : 'Untitled Task',
            logDescription,
            taskStatus: task ? task.status : 'TODO' as keyof typeof TASK_STATUS_enum,
            agentStatus: agentStatus as keyof typeof AGENT_STATUS_enum,
            metadata,
            logType,
        };
    },

    handleWorkflowBlocked: ({ task, error }: { task: Task; error: ErrorType }) => {
        logger.warn(`WORKFLOW BLOCKED: ${error.message}`);

        const stats = get().getTaskStats(task);

        const newLog = get().prepareNewLog({
            agent: task.agent,
            task,
            logDescription: `Workflow blocked: ${error.message}`,
            metadata: {
                error: error.message,
                ...stats,
                taskCount: get().tasks.length,
                agentCount: get().tasks.filter(t => t.agent).length,
            },
            logType: 'WorkflowStatusUpdate',
            agentStatus: task.agent.status
        });

        set((state) => ({
            ...state,
            workflowLogs: [...state.workflowLogs, newLog],
        }));
    },

    finishWorkflowAction: () => {
        const stats = get().getWorkflowStats();
        const tasks = get().tasks;
        const deliverableTask = tasks.slice().reverse().find((task) => task.isDeliverable);
        const lastTaskResult = tasks[tasks.length - 1].result;

        const newLog = get().prepareNewLog({
            task: deliverableTask || tasks[tasks.length - 1],
            agent: deliverableTask?.agent || tasks[tasks.length - 1].agent,
            logDescription: `Workflow finished with result: ${deliverableTask ? deliverableTask.result : lastTaskResult}`,
            metadata: {
                result: deliverableTask ? deliverableTask.result : lastTaskResult,
                ...stats,
            },
            logType: 'WorkflowStatusUpdate',
            agentStatus: (deliverableTask?.agent?.status || tasks[tasks.length - 1].agent.status) as keyof typeof AGENT_STATUS_enum
        });

        set((state) => ({
            ...state,
            workflowLogs: [...state.workflowLogs, newLog],
        }));
    },
    getWorkflowStats: () => {
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
                if (log.agentStatus === 'THINKING_END') {
                    const modelCode = log.agent?.llmConfig.model;
                    if (modelCode) {
                        if (!modelUsageStats[modelCode]) {
                            modelUsageStats[modelCode] = { inputTokens: 0, outputTokens: 0, callsCount: 0 };
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
                } else if (log.agentStatus === 'ISSUES_PARSING_LLM_OUTPUT') {
                    llmUsageStats.parsingErrors += 1;
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
            agentCount: get().tasks.filter(t => t.agent).length,
        };
    },

    validateTask: async (taskId: string) => {
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

        const updatedTask: Task = {
            ...task,
            status: 'VALIDATED' as keyof typeof TASK_STATUS_enum,
            feedbackHistory: task.feedbackHistory || [],
        };

        const newWorkflowLog = get().prepareNewLog({
            task: updatedTask,
            agent: updatedTask.agent,
            logDescription: `Workflow running because a task was validated.`,
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

        set((state) => ({
            tasks: state.tasks.map((t) => (t.id === taskId ? updatedTask : t)),
            workflowLogs: [...state.workflowLogs, newWorkflowLog, newTaskLog],
        }));

        get().handleTaskCompleted({
            agent: updatedTask.agent,
            task: updatedTask,
            result: updatedTask.result || null,
        });
    },

    workOnTask: async (agent: Agent, task: Task) => {
        if (task && agent) {
            if (!validateTask(task)) {
                logger.error(`Invalid task structure in workOnTask for task ID: ${task.id}`);
                return;
            }

            logger.debug(`Task: ${getTaskTitleForLogs(task)} starting...`);
            task.status = 'DOING' as keyof typeof TASK_STATUS_enum;

            set((state) => {
                const newLog = get().prepareNewLog({
                    agent,
                    task,
                    logDescription: `Task: ${getTaskTitleForLogs(task)} started.`,
                    metadata: {},
                    logType: 'TaskStatusUpdate',
                    agentStatus: agent.status
                });
                return { workflowLogs: [...state.workflowLogs, newLog] };
            });

            try {
                const interpolatedTaskDescription = interpolateTaskDescription(
                    task.description,
                    task.inputs || {}
                );
                task.interpolatedTaskDescription = interpolatedTaskDescription;

                const pendingFeedbacks = task.feedbackHistory.filter(
                    (f: FeedbackObject) => f.status === 'PENDING'
                );

                if (pendingFeedbacks.length > 0) {
                    await agent.workOnFeedback(task, pendingFeedbacks, task.interpolatedTaskDescription);
                } else {
                    await agent.workOnTask(task);
                }
            } catch (error) {
                throw error;
            }
        }
    },

    clearAll: () =>
        set({
            tasks: [],
            workflowLogs: [],
        }),
});            