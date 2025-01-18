import SequentialExecutionStrategy from './executionStrategies/sequentialExecutionStrategy';
import HierarchyExecutionStrategy from './executionStrategies/hierarchyExecutionStrategy';

/**
 * Class for managing tasks and their execution
 *
 * Configures and controls the task execution workflow within a team context, using a queue system to manage the sequential
 * execution of tasks based on their statuses. It ensures tasks are processed in the correct order and handles status updates.
 *
 * Usage:
 * Integrate this controller to manage the flow of tasks within your application, ensuring tasks are executed in an orderly and efficient manner.
 */
class TaskManager {
  constructor(teamStore) {
    if (!teamStore) {
      throw new Error('useTeamStore is required');
    }

    this.teamStore = teamStore;

    // Validate task dependencies based on workflow type
    const tasks = this.teamStore.getState().tasks;
    const workflowType = this.teamStore.getState().flowType || 'sequential';

    if (workflowType === 'sequential') {
      // For sequential workflows, ensure all tasks except first have dependencies
      const tasksWithDeps = tasks.filter(
        (task) => task.dependencies && task.dependencies.length > 0
      );

      if (tasksWithDeps.length > 1) {
        throw new Error(
          'Invalid task configuration: Sequential workflow requires all tasks except the first to have dependencies'
        );
      }

      // Default to sequential execution if not specified
      this.strategy = new SequentialExecutionStrategy(teamStore);
    } else if (
      workflowType === 'hierarchy' ||
      tasks.some((task) => task.dependencies?.length > 0)
    ) {
      // For hierarchical workflows or when dependencies exist
      this.strategy = new HierarchyExecutionStrategy(teamStore);
    } else {
      // Default to sequential execution if not specified
      this.strategy = new SequentialExecutionStrategy(teamStore);
    }
  }

  /**
   * Subscribe to task status changes and execute the strategy
   */
  _subscribeToTaskStatusChanges() {
    this.teamStore.subscribe(
      (state) => state.tasks,
      (tasks, previousTasks) => {
        const changedTasks = tasks.filter(
          (task) =>
            task.status !== previousTasks.find((t) => t.id === task.id)?.status
        );

        if (changedTasks.length > 0) {
          this.strategy.executeFromChangedTasks(changedTasks, tasks);
        }
      }
    );
  }

  start() {
    this._subscribeToTaskStatusChanges();
    this.strategy.startExecution();
  }
}

export default TaskManager;
