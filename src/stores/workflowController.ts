/**
 * Path: src/stores/workflowController.ts
 * 
 * Workflow Controller Setup.
 *
 * Configures and controls the task execution workflow within a team context, using a queue system to manage the sequential
 * execution of tasks based on their statuses. It ensures tasks are processed in the correct order and handles status updates.
 *
 * Usage:
 * Integrate this controller to manage the flow of tasks within your application, ensuring tasks are executed in an orderly and efficient manner.
 */

import PQueue from 'p-queue';
import { TASK_STATUS_enum } from '../utils/enums';
import { TaskType, TeamStoreApi } from './storeTypes';

export const setupWorkflowController = (teamStore: TeamStoreApi): void => {
    const taskQueue = new PQueue({ concurrency: 1 });

    // Managing tasks moving to 'DOING'
    teamStore.subscribe((state) => {
        const doingTasks = state.tasks.filter((t: TaskType) => t.status === TASK_STATUS_enum.DOING);
        doingTasks.forEach(task => {
            if (!task.agent) return; // Skip if the task has no assigned agent
            taskQueue.add(() => teamStore.getState().workOnTask(task.agent, task))
                .catch(error => {
                    teamStore.getState().handleTaskError({ task, error });
                    teamStore.getState().handleWorkflowError(task, error);
                });
        });
    });

    // Implement a timeout mechanism for tasks
    const TASK_TIMEOUT = 300000; // 5 minutes in milliseconds

    let lastTaskUpdateTime = Date.now();

    teamStore.subscribe((state) => {
        lastTaskUpdateTime = Date.now();
    });

    const checkWorkflowProgress = (): void => {
        const currentTime = Date.now();
        if (currentTime - lastTaskUpdateTime > TASK_TIMEOUT) {
            console.error('Workflow appears to be stuck. No task updates in the last 5 minutes.');
            // Implement recovery logic here, e.g., restarting the workflow or notifying an administrator
        }
    };

    setInterval(checkWorkflowProgress, 60000); // Check every minute
};