import { TASK_STATUS_enum } from '../utils/enums';
import { getTaskTitleForLogs } from '../utils/tasks';
import { logPrettyTaskCompletion, logPrettyTaskStatus } from "../utils/prettyLogs";

const subscribeTaskStatusUpdates = (useStore) => {
    useStore.subscribe(state => state.workflowLogs, (newLogs, previousLogs) => {
        if (newLogs.length > previousLogs.length) { // Check if a new log has been added
            const newLog = newLogs[newLogs.length - 1]; // Get the latest log

            if (newLog.logType === 'TaskStatusUpdate') {
                const totalTasks = useStore.getState().tasks.length;
                const taskIndex = useStore.getState().tasks.findIndex(t => t.id === newLog.task.id);
                const currentTaskNumber = taskIndex + 1;  // Adding 1 because index is 0-based

                switch (newLog.task.status) {
                    case TASK_STATUS_enum.DONE:
                        logPrettyTaskCompletion({
                            task: newLog.task,
                            llmUsageStats: newLog.metadata.llmUsageStats,
                            iterationCount: newLog.metadata.iterationCount,
                            duration: newLog.metadata.duration,
                            agentName: newLog.agent.name,
                            taskTitle: getTaskTitleForLogs(newLog.task),
                            currentTaskNumber,
                            totalTasks
                        });
                        break;
                    case TASK_STATUS_enum.DOING:
                    case TASK_STATUS_enum.BLOCKED:
                    case TASK_STATUS_enum.REVISE:
                    case TASK_STATUS_enum.TODO:
                        logPrettyTaskStatus({
                            currentTaskNumber,
                            totalTasks,
                            taskTitle: getTaskTitleForLogs(newLog.task),
                            taskStatus: newLog.task.status,
                            agentName: newLog.agent.name
                        });
                        break;
                    default:
                        console.warn(`Encountered an unexpected task status: ${newLog.task.status}`);
                        break;
                }
            }
        }
    });
}

export { subscribeTaskStatusUpdates };