import { TASK_STATUS_enum, WORKFLOW_STATUS_enum } from '../../utils/enums';
import WorkflowExecutionStrategy from './workflowExecutionStrategy';

/**
 * Class for deterministic workflow execution strategy
 *
 * This strategy handles both sequential and dependency-based workflows.
 * For sequential workflows (no dependencies), tasks are executed in order.
 * For dependency-based workflows, tasks are executed based on their dependencies
 * and allowParallelExecution flag.
 */
class DeterministicExecutionStrategy extends WorkflowExecutionStrategy {
  constructor(teamStore) {
    super(teamStore);
    // subscribe to task status changes
    teamStore.subscribe(
      (state) => state.tasks,
      (tasks, previousTasks) => {
        // get list of tasks that have changed status
        const changedTasks = tasks.filter((task, index) => {
          return task.status !== previousTasks[index]?.status;
        });

        // handle changed tasks
        for (const changedTask of changedTasks) {
          this._handleTaskStatusChange(teamStore.getState(), changedTask);
        }
      }
    );
  }

  /**
   * Gets all tasks that the given task depends on (its prerequisites)
   * @param {Object} task - The task to find dependencies for
   * @param {Array} allTasks - Array of all tasks in the workflow
   * @returns {Array} Array of task objects that are dependencies of the given task
   */
  _getTaskDependencies(task, allTasks) {
    if (!task.dependencies || task.dependencies.length === 0) {
      return [];
    }
    return allTasks.filter((t) => task.dependencies.includes(t.referenceId));
  }

  /**
   * Gets all tasks that depend on the given task (tasks that have this task as a prerequisite)
   * @param {Object} task - The task to find dependent tasks for
   * @param {Array} allTasks - Array of all tasks in the workflow
   * @returns {Array} Array of task objects that depend on the given task
   */
  _getTasksDependingOn(task, allTasks) {
    return allTasks.filter(
      (t) => t.dependencies && t.dependencies.includes(task.referenceId)
    );
  }

  /**
   * Get tasks that are ready to be executed based on their dependencies
   * @param {Array} tasks - Array of all tasks
   * @returns {Array} Array of tasks that are ready to be executed
   */
  _getReadyTasks(tasks) {
    return tasks.filter((task) => {
      const statusesToMarkAsReady = [TASK_STATUS_enum.REVISE];

      if (statusesToMarkAsReady.includes(task.status)) {
        return true;
      }

      // Skip tasks that are already DOING or DONE
      if (task.status !== TASK_STATUS_enum.TODO) {
        return false;
      }

      // Check if all dependencies are completed
      const areDependenciesDone =
        !task.dependencies ||
        task.dependencies.length === 0 ||
        task.dependencies.every((depId) => {
          const depTask = tasks.find((t) => t.referenceId === depId);
          return depTask && depTask.status === TASK_STATUS_enum.DONE;
        });

      if (!areDependenciesDone) {
        return false;
      }

      // If it's a parallel task and dependencies are met, it's ready
      if (task.allowParallelExecution) {
        return true;
      }

      // For non-parallel tasks, check if all previous tasks are done
      const taskIndex = tasks.findIndex((t) => t.id === task.id);
      if (taskIndex === 0) {
        // If it's the first task, it's ready if dependencies are met
        return true;
      }

      // Check if all previous non-parallel tasks are done
      const previousTasks = tasks.slice(0, taskIndex);
      return previousTasks.every((t) =>
        !t.allowParallelExecution ? t.status === TASK_STATUS_enum.DONE : true
      );
    });
  }

  /**
   * Get all tasks that are dependencies of the given task.
   * This is a recursive process.
   * @param {Object} task - The task to find dependencies for
   * @param {Array} allTasks - Array of all tasks in the workflow
   * @returns {Array} Array of task objects that are dependencies of the given task
   */
  _getParentTasks(task, allTasks) {
    const parentTasks = new Set();
    const dependencies = this._getTaskDependencies(task, allTasks);
    dependencies.forEach((dep) => {
      const depParentTasks = this._getParentTasks(dep, allTasks);
      depParentTasks.forEach((t) => {
        parentTasks.add(t);
      });
      parentTasks.add(dep);
    });

    if (dependencies.length === 0 && !task.allowParallelExecution) {
      // get list of previous non-parallel tasks
      const taskIndex = allTasks.findIndex((t) => t.id === task.id);
      const previousTasks = allTasks.slice(0, taskIndex);
      previousTasks.forEach((t) => {
        if (!t.allowParallelExecution) {
          parentTasks.add(t);
        }
      });
    }

    return Array.from(parentTasks);
  }

  /**
   * Get the context for a task from the previous tasks results.
   * Process:
   * 1. Find all tasks that the current task depends on. This is a recursive process.
   * 2. Get the results of the dependencies
   * 3. Return the results as a string
   *
   * @param {Object} teamStoreState - The team store state
   * @param {Object} task - The task to get context for
   * @returns {Object} The context for the task
   */
  getContextForTask(teamStoreState, task) {
    const logs = teamStoreState.workflowLogs;
    const resultsFromParentTasks = [];
    const tasks = teamStoreState.tasks;

    // Get all dependencies for the current task
    const dependencies = this._getParentTasks(task, tasks);

    for (const dependency of dependencies) {
      const dependencyResultsLogs = logs.find(
        (l) =>
          l.logType === 'TaskStatusUpdate' &&
          l.taskStatus === TASK_STATUS_enum.DONE &&
          l.task.id === dependency.id
      );

      if (!dependencyResultsLogs) {
        console.warn(
          `No dependency results found for task ${dependency.id}`,
          dependencies
        );
        continue;
      }

      resultsFromParentTasks.push({
        taskId: dependency.id,
        taskName: dependency.name,
        result: dependencyResultsLogs.metadata.result,
        taskDescription: dependency.description,
        timestamp: dependencyResultsLogs.timestamp,
      });
    }

    // Create context string from dependency results
    const taskResults = resultsFromParentTasks
      .map(
        ({ taskDescription, result }) =>
          `Task: ${taskDescription}\nResult: ${
            typeof result === 'object' ? JSON.stringify(result) : result
          }\n`
      )
      .join('\n');

    return taskResults;
  }

  /**
   * Start the execution of the workflow
   * Process:
   * 1. Get the first task
   * 2. Update the status of the first task to DOING
   * @param {Object} teamStoreState - The team store state
   */
  async startExecution(teamStoreState) {
    const tasks = teamStoreState.tasks;
    if (tasks.length === 0) return;

    // Get the first task
    const firstTask = tasks[0];

    // Update task status and execute it
    teamStoreState.updateTaskStatus(firstTask.id, TASK_STATUS_enum.DOING);
  }

  async _putInDoingPossibleTasksToExecute(teamStoreState) {
    const allTasks = teamStoreState.tasks;

    // Find all tasks that are ready to be executed
    const possibleTasksToExecute = this._getReadyTasks(allTasks);

    if (possibleTasksToExecute.length === 0) return;

    // Calculate number of tasks currently executing
    const executingTasksCount = allTasks.filter(
      (t) => t.status === TASK_STATUS_enum.DOING
    ).length;

    // Calculate available execution slots
    const availableSlots = teamStoreState.maxConcurrency - executingTasksCount;
    if (availableSlots <= 0) return;

    // Separate parallel and non-parallel tasks
    const parallelTasks = [];
    const nonParallelTasks = [];
    possibleTasksToExecute.forEach((task) => {
      if (task.allowParallelExecution) {
        parallelTasks.push(task);
      } else {
        nonParallelTasks.push(task);
      }
    });

    // Determine which tasks to execute
    const tasksToExecute = [];
    let slotsLeft = availableSlots;

    // First add non-parallel tasks (they have priority)
    if (nonParallelTasks.length > 0) {
      tasksToExecute.push(nonParallelTasks[0]);
      slotsLeft--;
    }

    // Then add parallel tasks if we have slots left and no non-parallel tasks are executing
    if (
      slotsLeft > 0 &&
      !allTasks.some(
        (t) => !t.allowParallelExecution && t.status === TASK_STATUS_enum.DOING
      )
    ) {
      while (slotsLeft > 0 && parallelTasks.length > 0) {
        tasksToExecute.push(parallelTasks.shift());
        slotsLeft--;
      }
    }

    if (tasksToExecute.length === 0) return;

    // Update the status of the tasks to be executed to DOING
    for (const task of tasksToExecute) {
      teamStoreState.updateTaskStatus(task.id, TASK_STATUS_enum.DOING);
    }
  }

  /**
   * Handle the status change of a task
   * Process:
   * 1. If the task is DOING, execute it
   * 2. If the task is REVISE, block all dependent tasks and set them to TODO
   * 3. Check if there are other tasks that can be executed
   * @param {Object} teamStoreState - The team store state
   * @param {Object} task - The task that has changed status
   */
  _handleTaskStatusChange(teamStoreState, task) {
    switch (task.status) {
      case TASK_STATUS_enum.DOING:
        // Execute the task
        this._executeTask(teamStoreState, task).catch((error) => {
          teamStoreState.handleTaskError({ task, error });
          teamStoreState.handleWorkflowError(task, error);
        });
        break;
      case TASK_STATUS_enum.REVISE:
        {
          // Block all dependent tasks
          const dependentTasks = this._getTasksDependingOn(
            task,
            teamStoreState.tasks
          );

          // the dependent tasks and the changed task should be set to TODO
          // this is to ensure those tasks are re-evaluated
          // The changed task will get more priority in the next round of execution
          for (const dependentTask of dependentTasks) {
            teamStoreState.updateTaskStatus(
              dependentTask.id,
              TASK_STATUS_enum.TODO
            );
          }
        }
        break;
    }

    const statesToAvoidExecution = [
      WORKFLOW_STATUS_enum.STOPPED,
      WORKFLOW_STATUS_enum.PAUSED,
      WORKFLOW_STATUS_enum.INITIAL,
    ];

    if (statesToAvoidExecution.includes(teamStoreState.teamWorkflowStatus)) {
      return;
    }

    // if (teamStoreState.teamWorkflowStatus !== WORKFLOW_STATUS_enum.RUNNING) {
    //   return;
    // }

    return this._putInDoingPossibleTasksToExecute(teamStoreState);
  }
}

export default DeterministicExecutionStrategy;
