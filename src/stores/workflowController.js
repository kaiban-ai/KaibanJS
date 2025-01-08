/**
 * Workflow Controller Setup.
 *
 * Configures and controls the task execution workflow within a team context, using a queue system to manage the sequential
 * execution of tasks based on their statuses. It ensures tasks are processed in the correct order and handles status updates.
 *
 * Usage:
 * Integrate this controller to manage the flow of tasks within your application, ensuring tasks are executed in an orderly and efficient manner.
 */

import PQueue from 'p-queue';
import { TASK_STATUS_enum, WORKFLOW_STATUS_enum } from '../utils/enums';
import { logger } from '../utils/logger';
export const setupWorkflowController = (useTeamStore) => {
  const taskQueue = new PQueue({ concurrency: 1 });
  useTeamStore.setState({
    workflowController: {
      abortController: new AbortController(),
    },
  });

  // Managing tasks moving to 'DOING'
  useTeamStore.subscribe(
    (state) => state.tasks.filter((t) => t.status === TASK_STATUS_enum.DOING),
    (doingTasks, previousDoingTasks) => {
      doingTasks.forEach((task) => {
        if (!previousDoingTasks.find((t) => t.id === task.id)) {
          taskQueue
            .add(() => useTeamStore.getState().workOnTask(task.agent, task))
            .catch((error) => {
              useTeamStore.getState().handleTaskError({ task, error });
              useTeamStore.getState().handleWorkflowError(task, error);
            });
        }
      });
    }
  );

  // Helper function to check if an agent is busy
  const isAgentBusy = (agent, tasks) => {
    return tasks.some(
      (t) => t.agent.id === agent.id && t.status === TASK_STATUS_enum.DOING
    );
  };

  // Managing tasks moving to 'REVISE'
  useTeamStore.subscribe(
    (state) => state.tasks.filter((t) => t.status === TASK_STATUS_enum.REVISE),
    (reviseTasks, previousReviseTasks) => {
      const allTasks = useTeamStore.getState().tasks;

      reviseTasks.forEach((reviseTask) => {
        if (!previousReviseTasks.find((t) => t.id === reviseTask.id)) {
          // Find the index of the current revise task
          const taskIndex = allTasks.findIndex((t) => t.id === reviseTask.id);

          // Check if the associated agent is not busy
          if (!isAgentBusy(reviseTask.agent, allTasks)) {
            // Put the task in DOING status
            useTeamStore
              .getState()
              .updateTaskStatus(reviseTask.id, TASK_STATUS_enum.DOING);
          }

          // Move all subsequent tasks to TODO
          for (let i = taskIndex + 1; i < allTasks.length; i++) {
            useTeamStore
              .getState()
              .updateTaskStatus(allTasks[i].id, TASK_STATUS_enum.TODO);
          }
        }
      });
    }
  );

  // Managing tasks moving to 'DONE'
  useTeamStore.subscribe(
    (state) => state.tasks.filter((t) => t.status === 'DONE'),
    (doneTasks, previousDoneTasks) => {
      if (doneTasks.length > previousDoneTasks.length) {
        const tasks = useTeamStore.getState().tasks;
        const nextTask = tasks.find((t) => t.status === TASK_STATUS_enum.TODO);
        if (nextTask) {
          useTeamStore
            .getState()
            .updateTaskStatus(nextTask.id, TASK_STATUS_enum.DOING);
        }
      }
    }
  );

  // Managing workflow status changes
  useTeamStore.subscribe(
    (state) => state.teamWorkflowStatus,
    async (status) => {
      if (status === WORKFLOW_STATUS_enum.PAUSED) {
        taskQueue.pause();
      } else if (status === WORKFLOW_STATUS_enum.RESUMED) {
        taskQueue.start();
        useTeamStore.setState({
          teamWorkflowStatus: WORKFLOW_STATUS_enum.RUNNING,
        });
      } else if (status === WORKFLOW_STATUS_enum.STOPPING) {
        try {
          const abortController =
            useTeamStore.getState().workflowController.abortController;

          // Create a promise that resolves when all ongoing tasks are aborted
          const abortPromise = new Promise((resolve) => {
            // Use 'aborted' event instead of 'abort'
            if (abortController.signal.aborted) {
              resolve();
            } else {
              abortController.signal.addEventListener(
                'abort',
                () => {
                  resolve();
                },
                { once: true }
              );
            }
          });

          // Trigger the abort
          abortController.abort();

          // Wait for abort to complete with a timeout
          await Promise.race([
            abortPromise,
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Abort timeout')), 5000)
            ),
          ]);

          // Clear the task queue
          taskQueue.clear();

          // Update all DOING tasks to TODO
          const tasks = useTeamStore.getState().tasks;
          tasks.forEach((task) => {
            if (task.status === TASK_STATUS_enum.DOING) {
              useTeamStore
                .getState()
                .updateTaskStatus(task.id, TASK_STATUS_enum.TODO);
            }
          });

          // Set final stopped status and create new abortController
          useTeamStore.setState({
            teamWorkflowStatus: WORKFLOW_STATUS_enum.STOPPED,
            workflowController: {
              abortController: new AbortController(),
            },
          });
        } catch (error) {
          logger.error('Error while stopping workflow:', error);
          useTeamStore.setState({
            teamWorkflowStatus: WORKFLOW_STATUS_enum.STOPPED,
            workflowController: {
              abortController: new AbortController(),
            },
          });
        }
      }
    }
  );
};
