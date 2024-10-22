/**
 * Path: C:/Users/pwalc/Documents/GroqEmailAssistant/KaibanJS/src/stores/taskStore.ts
 * Task Store Implementation.
 *
 * This module implements the task management store functionality, handling task-related state
 * changes, status updates, and associated operations within the KaibanJS library.
 */

import { TASK_STATUS_enum, AGENT_STATUS_enum, FEEDBACK_STATUS_enum, WORKFLOW_STATUS_enum } from "../utils/enums";
import { getTaskTitleForLogs, validateTask } from '../utils/tasks';
import { logger } from "../utils/logger";
import { PrettyError } from "../utils/errors";
import { calculateTaskCost } from "../utils/llmCostCalculator";
import type {
    TaskStoreState,
    TaskType,
    AgentType,
    ErrorType,
    FeedbackObject,
    Log,
    PrepareNewLogParams,
    TaskResult
} from '../../types/types';

export const useTaskStore = (
    set: (fn: (state: TaskStoreState) => Partial<TaskStoreState>) => void,
    get: () => TaskStoreState
): TaskStoreState => ({
    // Initialize base state properties
    tasksInitialized: false,
    workflowLogs: [],
    tasks: [],
    agents: [],
    name: '',

    getTaskStats(task: TaskType) {
        const endTime = Date.now();
        const lastDoingLog = get().workflowLogs.slice().reverse().find(log =>
            log.task && log.task.id === task.id && log.logType === "TaskStatusUpdate" && 
            log.taskStatus === TASK_STATUS_enum.DOING
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
            if (log.task && log.task.id === task.id && log.timestamp >= startTime && 
                log.logType === 'AgentStatusUpdate') {
                if (log.agentStatus === AGENT_STATUS_enum.THINKING_END) {
                    llmUsageStats.inputTokens += log.metadata.output.llmUsageStats.inputTokens;
                    llmUsageStats.outputTokens += log.metadata.output.llmUsageStats.outputTokens;
                    llmUsageStats.callsCount += 1;
                }
                if (log.agentStatus === AGENT_STATUS_enum.THINKING_ERROR) {
                    llmUsageStats.callsErrorCount += 1;
                }
                if (log.agentStatus === AGENT_STATUS_enum.ISSUES_PARSING_LLM_OUTPUT) {
                    llmUsageStats.parsingErrors += 1;
                }
                if (log.agentStatus === AGENT_STATUS_enum.ITERATION_END) {
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

    handleTaskCompleted: ({ agent, task, result }: { 
        agent: AgentType; 
        task: TaskType; 
        result: TaskResult;
    }): void => {
        if (!validateTask(task)) {
            logger.error(`Invalid task structure in handleTaskCompleted`);
            return;
        }

        const stats = get().getTaskStats(task);
        task.result = result;

        if (!Array.isArray(task.feedbackHistory)) {
            logger.warn(`Expected feedbackHistory to be an array, but got ${typeof task.feedbackHistory}`);
            task.feedbackHistory = [];
        }

        const updatedFeedbackHistory = task.feedbackHistory.map((feedback: FeedbackObject) =>
            feedback.status === FEEDBACK_STATUS_enum.PENDING ?
            { ...feedback, status: FEEDBACK_STATUS_enum.PROCESSED } :
            feedback
        );

        if (task.externalValidationRequired && task.status !== TASK_STATUS_enum.VALIDATED) {
            task.status = TASK_STATUS_enum.AWAITING_VALIDATION;
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
                    status: TASK_STATUS_enum.AWAITING_VALIDATION,
                    result: result,
                    feedbackHistory: updatedFeedbackHistory
                } : t),
                workflowLogs: [...state.workflowLogs, taskLog]
            }));

            get().handleWorkflowBlocked({ 
                task, 
                error: new Error('Task awaiting validation') 
            });
        } else {
            task.status = TASK_STATUS_enum.DONE;
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
                workflowLogs: [...state.workflowLogs, taskLog],
                tasks: state.tasks.map(t => t.id === task.id ? {
                    ...t,
                    ...stats,
                    status: TASK_STATUS_enum.DONE,
                    result: result,
                    feedbackHistory: updatedFeedbackHistory
                } : t)
            }));

            const tasks = get().tasks;
            const allTasksDone = tasks.every(t => t.status === TASK_STATUS_enum.DONE);
            if (allTasksDone) {
                get().finishWorkflowAction();
            }
        }
    },

    provideFeedback: async (taskId: string, feedbackContent: string): Promise<void> => {
        const { tasks } = get();
        const taskIndex = tasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) {
            logger.error("Task not found");
            return;
        }
        const task = tasks[taskIndex];

        if (!validateTask(task)) {
            logger.error(`Invalid task structure for task ID: ${taskId} in provideFeedback`);
            return;
        }

        if (!Array.isArray(task.feedbackHistory)) {
            logger.warn(`Expected feedbackHistory to be an array, but got ${typeof task.feedbackHistory}`);
            task.feedbackHistory = [];
        }

        const newFeedback: FeedbackObject = {
            id: `feedback-${Date.now()}`,
            content: feedbackContent,
            status: FEEDBACK_STATUS_enum.PENDING,
            timestamp: new Date(),
            userId: 'system'
        };

        const updatedTask: TaskType = {
            ...task,
            feedbackHistory: [...task.feedbackHistory, newFeedback],
            status: TASK_STATUS_enum.REVISE
        };

        set(state => ({
            tasks: state.tasks.map(t => t.id === task.id ? updatedTask : t)
        }));

        logger.debug(`Feedback added to task ${task.id}`);
    },

    handleTaskError: ({ task, error }: { 
        task: TaskType; 
        error: ErrorType 
    }): void => {
        if (!validateTask(task)) {
            logger.error(`Invalid task structure in handleTaskError`);
            return;
        }

        const stats = get().getTaskStats(task);
        task.status = TASK_STATUS_enum.BLOCKED;
        const modelCode = task.agent.llmConfig.model;
        const costDetails = calculateTaskCost(modelCode, stats.llmUsageStats);
        
        const updatedFeedbackHistory = task.feedbackHistory.map((f: FeedbackObject) =>
            f.status === FEEDBACK_STATUS_enum.PENDING ?
            { ...f, status: FEEDBACK_STATUS_enum.PROCESSED } :
            f
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
                status: TASK_STATUS_enum.BLOCKED,
                error: error.message,
                feedbackHistory: updatedFeedbackHistory
            } : t),
            workflowLogs: [...state.workflowLogs, taskLog]
        }));

        const prettyError = new PrettyError({
            message: 'Task Error Encountered',
            recommendedAction: 'Try to debug the application to find the root cause of the error.',
            rootError: error,
            context: { task, error }
        });

        logger.error(prettyError.prettyMessage);
    },

    handleTaskBlocked: ({ task, error }: { 
        task: TaskType; 
        error: ErrorType 
    }): void => {
        if (!validateTask(task)) {
            logger.error(`Invalid task structure in handleTaskBlocked`);
            return;
        }

        const stats = get().getTaskStats(task);
        task.status = TASK_STATUS_enum.BLOCKED;
        const modelCode = task.agent.llmConfig.model;
        const costDetails = calculateTaskCost(modelCode, stats.llmUsageStats);

        const updatedFeedbackHistory = task.feedbackHistory.map((f: FeedbackObject) =>
            f.status === FEEDBACK_STATUS_enum.PENDING ?
            { ...f, status: FEEDBACK_STATUS_enum.PROCESSED } :
            f
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

        const prettyError = new PrettyError({
            name: 'TASK BLOCKED',
            message: 'Task blocked due to a possible error during execution.',
            recommendedAction: 'Enable logLevel: "debug" during team initialization to obtain more detailed logs and facilitate troubleshooting.',
            rootError: error,
            context: { task, error }
        });

        logger.warn(prettyError.prettyMessage);
        logger.debug(prettyError.context);
        
        set(state => ({
            tasks: state.tasks.map(t => t.id === task.id ? {
                ...t,
                ...stats,
                status: TASK_STATUS_enum.BLOCKED,
                feedbackHistory: updatedFeedbackHistory
            } : t),
            workflowLogs: [...state.workflowLogs, taskLog]
        }));
        
        get().handleWorkflowBlocked({ task, error });
    },

    // Required implementations from TaskStoreState interface
    prepareNewLog: (params: PrepareNewLogParams): Log => {
        return get().prepareNewLog(params);
    },

    handleWorkflowBlocked: ({ task, error }: { 
        task: TaskType; 
        error: ErrorType 
    }): void => {
        get().handleWorkflowBlocked({ task, error });
    },

    finishWorkflowAction: (): void => {
        get().finishWorkflowAction();
    },

    getWorkflowStats: (): Record<string, any> => {
        return get().getWorkflowStats();
    },
});
