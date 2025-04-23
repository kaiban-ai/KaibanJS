/**
 * Task Status Subscriber.
 *
 * Listens to changes in task status within the library's state management system, providing logs and reactive behaviors to these changes.
 * This helps in monitoring task progression and debugging issues in real-time.
 *
 * Usage:
 * Deploy this subscriber to actively monitor and respond to changes in task status, enhancing the observability and responsiveness of your application.
 */

import { TASK_STATUS_enum } from '../utils/enums';
import { getTaskTitleForLogs } from '../utils/tasks';
import {
  logPrettyTaskCompletion,
  logPrettyTaskStatus,
} from '../utils/prettyLogs';
import { TeamStore } from '../stores';
import { TaskCompletionLog, TaskStatusLog, WorkflowLog } from '../types/logs';

/**
 * Subscribes to task status updates in the store and logs them appropriately.
 * @param useStore - The store instance to subscribe to
 */
const subscribeTaskStatusUpdates = (useStore: TeamStore): void => {
  useStore.subscribe(
    (state) => state.workflowLogs,
    // @ts-expect-error: Zustand subscribe overload is not properly typed
    (newLogs: WorkflowLog[], previousLogs: WorkflowLog[]) => {
      if (newLogs.length > previousLogs.length) {
        // Check if a new log has been added
        const newLog = newLogs[newLogs.length - 1]; // Get the latest log

        if (newLog.logType === 'TaskStatusUpdate') {
          const taskLog = newLog as TaskStatusLog;
          const totalTasks = useStore.getState().tasks.length;
          const taskIndex = useStore
            .getState()
            .tasks.findIndex((t) => t.id === taskLog.task?.id);
          const currentTaskNumber = taskIndex + 1; // Adding 1 because index is 0-based

          const agent = taskLog.agent;

          switch (taskLog.task?.status) {
            case TASK_STATUS_enum.DONE: {
              const taskCompletionLog = taskLog as TaskCompletionLog;
              logPrettyTaskCompletion({
                task: taskLog.task,
                llmUsageStats: taskCompletionLog.metadata?.llmUsageStats,
                iterationCount: taskCompletionLog.metadata?.iterationCount,
                duration: taskCompletionLog.metadata?.duration,
                agentName: agent?.name,
                agentModel: agent?.llmConfig.model,
                taskTitle: getTaskTitleForLogs(taskLog.task),
                currentTaskNumber,
                costDetails: taskCompletionLog.metadata?.costDetails,
                totalTasks,
              });
              break;
            }
            case TASK_STATUS_enum.DOING:
            case TASK_STATUS_enum.BLOCKED:
            case TASK_STATUS_enum.PAUSED:
            case TASK_STATUS_enum.REVISE:
            case TASK_STATUS_enum.RESUMED:
            case TASK_STATUS_enum.AWAITING_VALIDATION:
            case TASK_STATUS_enum.VALIDATED:
            case TASK_STATUS_enum.TODO:
              logPrettyTaskStatus({
                task: taskLog.task,
                currentTaskNumber,
                totalTasks,
                taskTitle: getTaskTitleForLogs(taskLog.task),
                taskStatus: taskLog.task.status,
                agentName: agent?.name,
              });
              break;
            default:
              console.warn(
                `Encountered an unexpected task status: ${taskLog.task?.status}`
              );
              break;
          }
        }
      }
    }
  );
};

export { subscribeTaskStatusUpdates };
