// Analysis of workflowController.js

import PQueue from 'p-queue';
import { TASK_STATUS_enum } from '../utils/enums';

export const setupWorkflowController = (useTeamStore) => {
    const taskQueue = new PQueue({ concurrency: 1 });

    // Managing tasks moving to 'DOING'
    useTeamStore.subscribe(
        state => state.tasks.filter(t => t.status === TASK_STATUS_enum.DOING),
        (doingTasks, previousDoingTasks) => {
            doingTasks.forEach(task => {
                if (!previousDoingTasks.find(t => t.id === task.id)) {
                    taskQueue.add(() => useTeamStore.getState().workOnTask(task.agent, task))
                        .catch(error => {
                            useTeamStore.getState().handleTaskError({ task, error });
                            useTeamStore.getState().handleWorkflowError(task, error);
                        });
                }
            });
        }
    );

    // Helper function to check if an agent is busy
    const isAgentBusy = (agent, tasks) => {
        return tasks.some(t => t.agent.id === agent.id && t.status === TASK_STATUS_enum.DOING);
    };

    // Managing tasks moving to 'REVISE'
    useTeamStore.subscribe(
        state => state.tasks.filter(t => t.status === TASK_STATUS_enum.REVISE),
        (reviseTasks, previousReviseTasks) => {
            const allTasks = useTeamStore.getState().tasks;
            
            reviseTasks.forEach(reviseTask => {
                if (!previousReviseTasks.find(t => t.id === reviseTask.id)) {
                    const taskIndex = allTasks.findIndex(t => t.id === reviseTask.id);
                    
                    if (!isAgentBusy(reviseTask.agent, allTasks)) {
                        useTeamStore.getState().updateTaskStatus(reviseTask.id, TASK_STATUS_enum.DOING);
                    }

                    for (let i = taskIndex + 1; i < allTasks.length; i++) {
                        useTeamStore.getState().updateTaskStatus(allTasks[i].id, TASK_STATUS_enum.TODO);
                    }                    
                }
            });
        }
    );
 
    // Managing tasks moving to 'DONE'
    useTeamStore.subscribe(
        state => state.tasks.filter(t => t.status === 'DONE'),
        (doneTasks, previousDoneTasks) => {
            if (doneTasks.length > previousDoneTasks.length) {
                const tasks = useTeamStore.getState().tasks;
                const nextTask = tasks.find(t => t.status === TASK_STATUS_enum.TODO);
                if (nextTask) {
                    useTeamStore.getState().updateTaskStatus(nextTask.id, TASK_STATUS_enum.DOING);
                }
            }
        }
    );
};

// Potential Improvements:

// 1. Add logging to track task status changes
useTeamStore.subscribe(
    state => state.tasks,
    (tasks, previousTasks) => {
        tasks.forEach(task => {
            const prevTask = previousTasks.find(t => t.id === task.id);
            if (prevTask && prevTask.status !== task.status) {
                console.log(`Task ${task.id} status changed from ${prevTask.status} to ${task.status}`);
            }
        });
    }
);

// 2. Implement a timeout mechanism for tasks
const TASK_TIMEOUT = 300000; // 5 minutes in milliseconds

const executeTaskWithTimeout = async (task) => {
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Task execution timed out')), TASK_TIMEOUT);
    });

    try {
        await Promise.race([
            useTeamStore.getState().workOnTask(task.agent, task),
            timeoutPromise
        ]);
    } catch (error) {
        console.error(`Task ${task.id} execution failed:`, error);
        useTeamStore.getState().handleTaskError({ task, error });
        useTeamStore.getState().handleWorkflowError(task, error);
    }
};

// Replace the existing taskQueue.add call with this:
taskQueue.add(() => executeTaskWithTimeout(task));

// 3. Add a mechanism to handle stuck workflows
let lastTaskUpdateTime = Date.now();

useTeamStore.subscribe(
    state => state.tasks,
    () => {
        lastTaskUpdateTime = Date.now();
    }
);

const checkWorkflowProgress = () => {
    const currentTime = Date.now();
    if (currentTime - lastTaskUpdateTime > TASK_TIMEOUT) {
        console.error('Workflow appears to be stuck. No task updates in the last 5 minutes.');
        // Implement recovery logic here, e.g., restarting the workflow or notifying an administrator
    }
};

setInterval(checkWorkflowProgress, 60000); // Check every minute

// 4. Improve error handling and reporting
const handleTaskError = (task, error) => {
    console.error(`Error in task ${task.id}:`, error);
    // Implement more sophisticated error handling, e.g., retrying the task or notifying an administrator
    useTeamStore.getState().handleTaskError({ task, error });
    useTeamStore.getState().handleWorkflowError(task, error);
};

// Use this improved error handling in the taskQueue.add call
taskQueue.add(() => executeTaskWithTimeout(task).catch(error => handleTaskError(task, error)));