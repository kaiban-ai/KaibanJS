/**
 * C:\Users\pwalc\Documents\GroqEmailAssistant\KaibanJS\src\subscribers\taskSubscriber.ts
 * 
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
import { logPrettyTaskCompletion, logPrettyTaskStatus } from "../utils/prettyLogs";
import { TeamState, Log, TaskType, AgentType } from '../stores/storeTypes';
import { StoreApi, UseBoundStore } from 'zustand';

export const subscribeTaskStatusUpdates = (useStore: UseBoundStore<StoreApi<TeamState>>): void => {
    useStore.subscribe((state: TeamState) => {
        const newLogs = state.workflowLogs;
        const previousLogs = state.workflowLogs.slice(0, -1); // All logs except the last one

        if (newLogs.length > previousLogs.length) { // Check if a new log has been added
            const newLog = newLogs[newLogs.length - 1]; // Get the latest log

            if (newLog.logType === 'TaskStatusUpdate' && newLog.task) {
                const totalTasks = state.tasks.length;
                const taskIndex = state.tasks.findIndex((t: TaskType) => t.id === newLog.task?.id);
                const currentTaskNumber = taskIndex + 1;  // Adding 1 because index is 0-based

                switch (newLog.task.status) {
                    case 'DONE':
                        logPrettyTaskCompletion({
                            llmUsageStats: newLog.metadata.llmUsageStats,
                            iterationCount: newLog.metadata.iterationCount,
                            duration: newLog.metadata.duration,
                            agentName: newLog.agent?.name || '',
                            agentModel: newLog.agent?.llmConfig.model || '',
                            taskTitle: getTaskTitleForLogs(newLog.task),
                            currentTaskNumber,
                            costDetails: newLog.metadata.costDetails,
                            totalTasks
                        });
                        break;
                    case 'DOING':
                    case 'BLOCKED':
                    case 'REVISE':
                    case 'AWAITING_VALIDATION':
                    case 'VALIDATED':
                    case 'TODO':
                        logPrettyTaskStatus({
                            currentTaskNumber,
                            totalTasks,
                            taskTitle: getTaskTitleForLogs(newLog.task),
                            taskStatus: newLog.task.status,
                            agentName: newLog.agent?.name || ''
                        });
                        break;
                    default:
                        console.warn(`Encountered an unexpected task status: ${newLog.task.status}`);
                        break;
                }
            }
        }
    });
};