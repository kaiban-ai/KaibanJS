import { cloneAgent } from '../../utils/agents';
import { TASK_STATUS_enum } from '../../utils/enums';
/**
 * Abstract base class defining the workflow execution strategy interface
 */
class WorkflowExecutionStrategy {
  constructor(useTeamStore) {
    if (this.constructor === WorkflowExecutionStrategy) {
      throw new Error(
        'Cannot instantiate abstract WorkflowExecutionStrategy directly'
      );
    }
    this.useTeamStore = useTeamStore;
  }

  _isTaskAgentBusy(currentTask, tasks) {
    return tasks.some(
      (t) =>
        t.agent &&
        t.id !== currentTask.id &&
        t.agent.id === currentTask.agent.id &&
        t.status === TASK_STATUS_enum.DOING
    );
  }

  /**
   * Execute the task
   * @param {Object} task - The task to execute
   */
  async _executeTask(task) {
    const shouldClone = this._isTaskAgentBusy(
      task,
      this.useTeamStore.getState().tasks
    );

    const agent = shouldClone ? cloneAgent(task.agent) : task.agent;

    const context = this.getContextForTask(task);

    return this.useTeamStore.getState().workOnTask(agent, task, context);
  }

  /**
   * Updates the status of a task in the store
   * @param {string} taskId - The ID of the task to update
   * @param {string} status - The new status to set
   */
  _updateTaskStatus(taskId, status) {
    this.useTeamStore.getState().updateTaskStatus(taskId, status);
  }

  _updateStatusOfMultipleTasks(tasks, status) {
    this.useTeamStore.getState().updateStatusOfMultipleTasks(tasks, status);
  }

  /*
   * Start the workflow execution. Each strategy knows which tasks to execute.
   */
  async startExecution() {
    throw new Error(
      'startExecution() must be implemented by concrete strategies'
    );
  }

  /**
   * Get the context for a task from the previous tasks results.
   *
   * @param {Object} task - The task to get context for
   * @returns {Object} The context for the task
   */
  getContextForTask(_task) {
    throw new Error(
      'getContextForTask() must be implemented by concrete strategies'
    );
  }

  /**
   * Execute the strategy for the given changed tasks
   * @param {Array} changedTasks - Array of tasks that have changed status
   * @param {Array} allTasks - Array of all tasks in the workflow
   */
  async executeFromChangedTasks(_changedTasks, _allTasks) {
    throw new Error(
      'executeFromChangedTasks() must be implemented by concrete strategies'
    );
  }
}

export default WorkflowExecutionStrategy;
