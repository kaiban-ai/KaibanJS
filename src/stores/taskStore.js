import { TASK_STATUS_enum } from "../utils/enums";
import { getTaskTitleForLogs} from '../utils/tasks';

export const useTaskStore = (set, get) => ({
    // state
    tasksInitialized: false,
  
    // actions
    handleTaskCompleted: ({ agent, task, result }) => {
        const endTime = Date.now();
    
        // Find the most recent log where the task status was set to "DOING"
        const lastDoingLog = get().workflowLogs.slice().reverse().find(log => 
            log.task.id === task.id && log.taskStatus === TASK_STATUS_enum.DOING
        );
    
        const startTime = lastDoingLog ? lastDoingLog.timestamp : endTime;  // Use endTime as a fallback
        const duration = (endTime - startTime) / 1000;
    
        // Update the task status, result, duration and log this change
        task.status = TASK_STATUS_enum.DONE;
        task.result = result.output;
        const taskLog = get().prepareNewLog({
            agent,
            task,
            logDescription: `Task: ${getTaskTitleForLogs(task)} completed in ${duration} seconds`,
            metadata: { result },
            logType: 'TaskStatusUpdate',
            taskStatus: task.status,
        });
    
        set(state => ({
            tasks: state.tasks.map(t => t.id === task.id ? {...t, status: TASK_STATUS_enum.DONE, result: result.output, duration} : t),
            workflowLogs: [...state.workflowLogs, taskLog],
            workflowContext: result.output  // Update workflow context if necessary
        }));
    },

    // Centralized error handling method for tasks
    handleTaskError: ({task, error}) => {
        // Log the error with detailed context
        console.error(`[${new Date().toISOString()}] ERROR: Task Execution Failure - Task Title: ${getTaskTitleForLogs(task)} Task ID: ${task.id}, Error: ${error.message}`);

        // Prepare the error log
        const newLog = get().prepareNewLog({
            agent: task.agent,
            task,
            logDescription: `Task Execution Failure - Task ID: ${task.id} - ${error.message}`,
            taskStatus: 'BLOCKED',
            metadata: { error: error.message },
            logType: 'TaskStatusUpdate'
        });

        // Update the task status to 'BLOCKED' and add the new log to the workflowLogs
        set(state => ({
            tasks: state.tasks.map(t => 
                t.id === task.id ? { ...t, status: 'BLOCKED' } : t
            ),
            workflowLogs: [...state.workflowLogs, newLog]
        }));
    },
});