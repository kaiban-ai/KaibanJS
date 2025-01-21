import { TASK_STATUS_enum } from '../../utils/enums';
import WorkflowExecutionStrategy from './workflowExecutionStrategy';

/**
 * Class for hierarchical workflow execution strategy
 *
 * This strategy is used when tasks have dependencies on each other, and the workflow needs to be executed in a hierarchical manner.
 * It ensures that tasks are executed in the correct order, taking into account dependencies and ensuring that tasks are not started
 * until all of their prerequisites are complete.
 */
class HierarchyExecutionStrategy extends WorkflowExecutionStrategy {
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
  _getAllTasksDependingOn(task, allTasks) {
    return allTasks.filter(
      (t) => t.dependencies && t.dependencies.includes(task.id)
    );
  }

  /**
   * Gets all tasks that are ready to be executed
   * @param {Array} allTasks - Array of all tasks in the workflow
   * @returns {Array} Array of task objects that are ready to be executed
   */
  _getReadyTasks(allTasks) {
    return allTasks.filter((task) => {
      // Task must be in TODO status
      if (task.status !== TASK_STATUS_enum.TODO) return false;

      // All dependencies must be DONE
      const deps = this._getTaskDependencies(task, allTasks);
      return (
        deps.length === 0 ||
        deps.every((dep) => dep.status === TASK_STATUS_enum.DONE)
      );
    });
  }

  async _findAndExecuteAllPossibleTasks(teamStoreState) {
    const allTasks = teamStoreState.tasks;

    // Find and execute all possible tasks
    const executableTasks = allTasks.filter((task) => {
      if (task.status !== TASK_STATUS_enum.TODO) return false;

      // Check if task has no dependencies or all dependencies are done
      const deps = this._getTaskDependencies(task, allTasks);
      return (
        deps.length === 0 ||
        deps.every((dep) => dep.status === TASK_STATUS_enum.DONE)
      );
    });

    if (executableTasks.length > 0) {
      this._updateStatusOfMultipleTasks(
        teamStoreState,
        executableTasks.map((t) => t.id),
        TASK_STATUS_enum.DOING
      );
    }
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
    return this._findAndExecuteAllPossibleTasks(teamStoreState);
  }

  async executeFromChangedTasks(teamStoreState, changedTaskIds) {
    if (!Array.isArray(changedTaskIds)) {
      return;
    }

    const allTasks = teamStoreState.tasks;

    // Handle changed tasks first
    for (const changedTaskId of changedTaskIds) {
      const changedTask = allTasks.find((t) => t.id === changedTaskId);
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
            const dependentTasks = this.getAllTasksDependingOn(
              changedTask,
              allTasks
            );
            dependentTasks.forEach((task) => {
              teamStoreState.updateTaskStatus(
                task.id,
                TASK_STATUS_enum.BLOCKED
              );
            });
          }

          break;
      }
    }

    return this._findAndExecuteAllPossibleTasks(teamStoreState);
  }
}

export default HierarchyExecutionStrategy;
