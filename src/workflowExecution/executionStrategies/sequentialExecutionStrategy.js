import { TASK_STATUS_enum } from '../../utils/enums';
import WorkflowExecutionStrategy from './workflowExecutionStrategy';
import PQueue from 'p-queue';

class SequentialExecutionStrategy extends WorkflowExecutionStrategy {
  constructor() {
    super();
    this.taskQueue = new PQueue({ concurrency: 1 });
  }

  async startExecution(teamStoreState) {
    // execute the first task
    const tasks = teamStoreState.tasks;
    const firstTask = tasks.find((t) => t.status === TASK_STATUS_enum.TODO);
    if (firstTask) {
      this._updateTaskStatus(
        teamStoreState,
        firstTask.id,
        TASK_STATUS_enum.DOING
      );
    }
  }

  /**
   * Get the context for a task from the previous tasks results stored in workflow logs.
   *
   * @param {Object} teamStoreState - The team store state
   * @param {Object} task - The task to get context for
   * @returns {Object} The context for the task
   */
  getContextForTask(teamStoreState, task) {
    const currentTaskId = task.id;
    const logs = teamStoreState.workflowLogs;
    const taskResults = new Map();
    const tasks = teamStoreState.tasks; // Get the tasks array from the store
    const currentTaskIndex = tasks.findIndex(
      (task) => task.id === currentTaskId
    );

    if (currentTaskIndex === -1) {
      console.warn(
        `Current task with ID ${currentTaskId} not found in the task list.`
      );
      return ''; // Return empty context if current task is not found
    }

    // Iterate through logs to get the most recent result for each task
    for (const log of logs) {
      if (
        log.logType === 'TaskStatusUpdate' &&
        log.taskStatus === TASK_STATUS_enum.DONE
      ) {
        const taskIndex = tasks.findIndex((task) => task.id === log.task.id);

        // Only include tasks that come before the current task in the workflow
        if (taskIndex !== -1 && taskIndex < currentTaskIndex) {
          taskResults.set(log.task.id, {
            taskDescription: log.task.description,
            result: log.metadata.result,
            index: taskIndex, // Store the index for sorting later
          });
        }
      }
    }

    // Sort the results based on their original task order and create the context string
    return Array.from(taskResults.values())
      .sort((a, b) => a.index - b.index)
      .map(
        ({ taskDescription, result }) =>
          `Task: ${taskDescription}\nResult: ${
            typeof result === 'object' ? JSON.stringify(result) : result
          }\n`
      )
      .join('\n');
  }

  async executeFromChangedTasks(teamStoreState, changedTaskIds) {
    if (!Array.isArray(changedTaskIds)) {
      return;
    }

    const allTasks = teamStoreState.tasks;

    // Implement the logic for the sequential execution strategy
    // This method should handle the tasks in the order they are received
    // and ensure that tasks are executed sequentially
    for (const changedTaskId of changedTaskIds) {
      const changedTask = allTasks.find((t) => t.id === changedTaskId);
      switch (changedTask.status) {
        case TASK_STATUS_enum.DOING:
          this.taskQueue
            .add(() => this._executeTask(teamStoreState, changedTask))
            .catch((error) => {
              teamStoreState.handleTaskError({ changedTask, error });
              teamStoreState.handleWorkflowError(changedTask, error);
            });

          // this.taskQueue.push(changedTask).catch((error) => {
          //   teamStoreState.handleTaskError({ changedTask, error });
          //   teamStoreState.handleWorkflowError(changedTask, error);
          // });
          break;
        case TASK_STATUS_enum.REVISE:
          {
            // Find the index of the current revise task
            const taskIndex = allTasks.findIndex(
              (t) => t.id === changedTask.id
            );

            // Move all subsequent tasks to TODO
            for (let i = taskIndex + 1; i < allTasks.length; i++) {
              this._updateTaskStatus(
                teamStoreState,
                allTasks[i].id,
                TASK_STATUS_enum.TODO
              );
            }

            this._updateTaskStatus(
              teamStoreState,
              changedTask.id,
              TASK_STATUS_enum.DOING
            );
          }
          break;
        case TASK_STATUS_enum.DONE:
          {
            const tasks = teamStoreState.tasks;
            const nextTask = tasks.find(
              (t) => t.status === TASK_STATUS_enum.TODO
            );

            if (nextTask) {
              this._updateTaskStatus(
                teamStoreState,
                nextTask.id,
                TASK_STATUS_enum.DOING
              );
            }
          }
          break;
      }
    }
  }
}

export default SequentialExecutionStrategy;
