import { TASK_STATUS_enum } from '../../utils/enums';
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
  constructor(teamStoreState) {
    super();

    const tasks = teamStoreState.tasks;
    if (tasks.length <= 1) return;

    // Get all non-parallel tasks in their original order
    const nonParallelTasks = tasks.filter(
      (task) => !task.allowParallelExecution
    );

    // Apply sequential dependencies to non-parallel tasks
    for (let i = 1; i < nonParallelTasks.length; i++) {
      const currentTask = nonParallelTasks[i];
      const previousTask = nonParallelTasks[i - 1];

      // Create or update dependencies array
      if (!currentTask.dependencies) {
        currentTask.dependencies = [];
      }

      // Add dependency to previous task if not already present
      if (!currentTask.dependencies.includes(previousTask.id)) {
        currentTask.dependencies.push(previousTask.id);
      }
    }

    // For parallel tasks that have dependencies, ensure they depend on all previous non-parallel tasks
    tasks.forEach((task) => {
      if (
        task.allowParallelExecution &&
        task.dependencies &&
        task.dependencies.length > 0
      ) {
        const taskIndex = tasks.indexOf(task);
        const previousNonParallelTasks = nonParallelTasks.filter(
          (t) => tasks.indexOf(t) < taskIndex
        );

        previousNonParallelTasks.forEach((prevTask) => {
          if (!task.dependencies.includes(prevTask.id)) {
            task.dependencies.push(prevTask.id);
          }
        });
      }
    });
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
    return allTasks.filter((t) => task.dependencies.includes(t.id));
  }

  /**
   * Gets all tasks that depend on the given task (tasks that have this task as a prerequisite)
   * @param {Object} task - The task to find dependent tasks for
   * @param {Array} allTasks - Array of all tasks in the workflow
   * @returns {Array} Array of task objects that depend on the given task
   */
  _getTasksDependingOn(task, allTasks) {
    return allTasks.filter(
      (t) => t.dependencies && t.dependencies.includes(task.id)
    );
  }

  /**
   * Gets all tasks that are ready to be executed based on their dependencies
   * and allowParallelExecution flag
   * @param {Array} allTasks - Array of all tasks in the workflow
   * @returns {Array} Array of task objects that are ready to be executed
   */
  _getReadyTasks(allTasks) {
    return allTasks.filter((task) => {
      // Task must be in TODO status
      if (task.status !== TASK_STATUS_enum.TODO) return false;

      // All dependencies must be DONE
      const deps = this._getTaskDependencies(task, allTasks);
      const depsCompleted =
        deps.length === 0 ||
        deps.every((dep) => dep.status === TASK_STATUS_enum.DONE);

      // If dependencies are completed and task allows parallel execution, it's ready
      if (depsCompleted && task.allowParallelExecution) {
        return true;
      }

      // If dependencies are completed and no other task is currently executing, it's ready
      if (depsCompleted) {
        return !allTasks.some((t) => t.status === TASK_STATUS_enum.DOING);
      }

      return false;
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
    const parentTasks = [];
    const dependencies = this._getTaskDependencies(task, allTasks);
    dependencies.forEach((dep) => {
      parentTasks.push(dep);
      parentTasks.push(...this._getParentTasks(dep, allTasks));
    });
    return parentTasks;
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
    const taskResultsByTaskId = new Map();
    const tasks = teamStoreState.tasks;

    // Get all dependencies for the current task
    const dependencies = this._getParentTasks(task, tasks);

    // Iterate through logs to get the most recent result for each dependency
    for (const l of logs) {
      if (
        l.logType === 'TaskStatusUpdate' &&
        l.taskStatus === TASK_STATUS_enum.DONE
      ) {
        // Only include results from dependency tasks
        const isDependency = dependencies.some((dep) => dep.id === l.task.id);
        if (isDependency) {
          taskResultsByTaskId.set(l.task.id, {
            taskDescription: l.task.description,
            result: l.metadata.result,
            taskId: l.task.id,
            taskName: l.task.name,
            timestamp: l.timestamp,
          });
        }
      }
    }

    // Create context string from dependency results
    const taskResults = Array.from(taskResultsByTaskId.values())
      .sort((a, b) => {
        // Then by taskId if timestamps are equal
        if (a.taskId !== b.taskId) {
          return a.taskId.localeCompare(b.taskId);
        }
        // Finally by taskName if taskIds are equal
        return a.taskName.localeCompare(b.taskName);
      })
      .map(
        ({ taskDescription, result }) =>
          `Task: ${taskDescription}\nResult: ${
            typeof result === 'object' ? JSON.stringify(result) : result
          }\n`
      )
      .join('\n');

    return taskResults;
  }

  async startExecution(teamStoreState) {
    const tasks = teamStoreState.tasks;
    if (tasks.length === 0) return;

    // Get the first task
    const firstTask = tasks[0];

    // Update task status and execute it
    teamStoreState.updateStatusOfMultipleTasks(
      [firstTask.id],
      TASK_STATUS_enum.DOING
    );
  }

  async _putInDoingPossibleTasksToExecute(teamStoreState) {
    const allTasks = teamStoreState.tasks;

    // Find all tasks that are ready to be executed
    const readyTasks = this._getReadyTasks(allTasks);
    if (readyTasks.length === 0) return;

    // Calculate available execution slots
    const availableSlots =
      teamStoreState.maxConcurrency - teamStoreState.executingTasks.size;
    if (availableSlots <= 0) return;

    // Separate parallel and non-parallel tasks
    const parallelTasks = [];
    const nonParallelTasks = [];
    readyTasks.forEach((task) => {
      if (task.allowParallelExecution) {
        parallelTasks.push(task);
      } else {
        nonParallelTasks.push(task);
      }
    });

    // Determine which tasks to execute
    const tasksToExecute = [];
    let slotsLeft = availableSlots;

    // First add the first available task (parallel or not)
    if (readyTasks.length > 0) {
      tasksToExecute.push(readyTasks[0]);
      slotsLeft--;

      // Remove the selected task from its respective array
      if (readyTasks[0].allowParallelExecution) {
        parallelTasks.shift();
      } else {
        nonParallelTasks.shift();
      }
    }

    // If the first task wasn't non-parallel and we have slots left,
    // fill remaining slots with parallel tasks
    if (
      slotsLeft > 0 &&
      (readyTasks[0]?.allowParallelExecution ||
        teamStoreState.executingTasks.size === 0)
    ) {
      while (slotsLeft > 0 && parallelTasks.length > 0) {
        tasksToExecute.push(parallelTasks.shift());
        slotsLeft--;
      }
    }

    if (tasksToExecute.length === 0) return;

    // Single state update for task status
    teamStoreState.updateStatusOfMultipleTasks(
      tasksToExecute.map((t) => t.id),
      TASK_STATUS_enum.DOING
    );
  }

  async executeFromChangedTasks(
    teamStoreState,
    changedTaskIdsWithPreviousStatus
  ) {
    if (!Array.isArray(changedTaskIdsWithPreviousStatus)) {
      return;
    }

    const allTasks = teamStoreState.tasks;

    // Handle changed tasks first
    for (const changedTaskIdWithPreviousStatus of changedTaskIdsWithPreviousStatus) {
      const changedTask = allTasks.find(
        (t) => t.id === changedTaskIdWithPreviousStatus.taskId
      );
      switch (changedTask.status) {
        case TASK_STATUS_enum.DOING:
          // Execute the task
          this._executeTask(teamStoreState, changedTask).catch((error) => {
            teamStoreState.handleTaskError({ changedTask, error });
            teamStoreState.handleWorkflowError(changedTask, error);
          });
          break;
        case TASK_STATUS_enum.REVISE:
          {
            // Block all dependent tasks
            const dependentTasks = this._getTasksDependingOn(
              changedTask,
              allTasks
            );
            // update the status of the dependent tasks
            teamStoreState.updateStatusOfMultipleTasks(
              dependentTasks.map((task) => task.id),
              TASK_STATUS_enum.BLOCKED
            );
          }
          break;
      }
    }

    return this._putInDoingPossibleTasksToExecute(teamStoreState);
  }
}

export default DeterministicExecutionStrategy;
