import { TASK_STATUS_enum, AGENT_STATUS_enum} from "../utils/enums";
import { getTaskTitleForLogs} from '../utils/tasks';
import { logger } from "../utils/logger";
import { PrettyError } from "../utils/errors";

export const useTaskStore = (set, get) => ({
    // state
    tasksInitialized: false,

    getTaskStats(task) {
        const endTime = Date.now();
        const lastDoingLog = get().workflowLogs.slice().reverse().find(log =>
            log.task.id === task.id && log.logType === "TaskStatusUpdate" && log.task.status === TASK_STATUS_enum.DOING
        );
        const startTime = lastDoingLog ? lastDoingLog.timestamp : endTime; // Use endTime if no DOING log is found
        const duration = (endTime - startTime) / 1000; // Calculate duration in seconds
    
        let llmUsageStats = {
            inputTokens: 0,
            outputTokens: 0,
            callsCount: 0,
            callsErrorCount: 0,
            parsingErrors: 0
        };
        let iterationCount = 0;
    
        get().workflowLogs.forEach(log => {
            if (log.task.id === task.id && log.timestamp >= startTime && log.logType === 'AgentStatusUpdate') {
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

    handleTaskCompleted: ({ agent, task, result }) => {
        const stats = get().getTaskStats(task, get);
        task.status = TASK_STATUS_enum.DONE;
        task.result = result;
        
        const taskLog = get().prepareNewLog({
            agent,
            task,
            logDescription: `Task completed: ${getTaskTitleForLogs(task)}, Duration: ${stats.duration} seconds`,
            metadata: {
                ...stats,
                result
            },
            logType: 'TaskStatusUpdate'
        });
        logger.debug(`Task completed with ID ${task.id}, Duration: ${stats.duration} seconds`);
        set(state => ({
            ...state,
            workflowLogs: [...state.workflowLogs, taskLog],
            tasks: state.tasks.map(t => t.id === task.id ? {...t, ...stats, status: TASK_STATUS_enum.DONE, result: result} : t),
            workflowContext: `${state.workflowContext} ${result}`
        }));
    
        // This logic is here cause if put it in a subscriber, it will create race conditions
        // that will create a a non deterministic behavior for the Application State
        const tasks = get().tasks;
        const allTasksDone = tasks.every(t => t.status === TASK_STATUS_enum.DONE);
        if(allTasksDone){
            get().finishWorkflowAction();
        }
    },

    handleTaskError: ({ task, error }) => {
        const stats = get().getTaskStats(task, get);
        task.status = TASK_STATUS_enum.BLOCKED;

        const taskLog = get().prepareNewLog({
            agent: task.agent,
            task,
            logDescription: `Task error: ${getTaskTitleForLogs(task)}, Error: ${error.message}`,
            metadata: {
                ...stats,
                error: error.message
            },
            logType: 'TaskStatusUpdate'
        });

        set(state => ({
            tasks: state.tasks.map(t => t.id === task.id ? {...t, ...stats, status: TASK_STATUS_enum.BLOCKED} : t),
            workflowLogs: [...state.workflowLogs, taskLog]
        }));

        const prettyError = new PrettyError({
            message: 'Task Error Encountered',
            recommendedAction: 'Try to debug the application to find the root cause of the error.',
            rootError: error,
            context: { task, error },
            location: 'taskStore.js -> handleTaskError()'
        });

        logger.error(prettyError.prettyMessage);
    },

    // Centralized error handling method for tasks
    handleTaskBlocked: ({ task, error }) => {
        const stats = get().getTaskStats(task, get);
        task.status = TASK_STATUS_enum.BLOCKED;

        const taskLog = get().prepareNewLog({
            agent: task.agent,
            task,
            logDescription: `Task blocked: ${getTaskTitleForLogs(task)}, Reason: ${error.message}`,
            metadata: {
                ...stats,
                error
            },
            logType: 'TaskStatusUpdate'
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
            tasks: state.tasks.map(t => t.id === task.id ? {...t, ...stats, status: TASK_STATUS_enum.BLOCKED} : t),
            workflowLogs: [...state.workflowLogs, taskLog]
        }));
        get().handleWorkflowBlocked({ task, error });
    }
});