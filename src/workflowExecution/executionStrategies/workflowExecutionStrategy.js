import { cloneAgent } from '../../utils/agents';
import { TASK_STATUS_enum } from '../../utils/enums';
/**
 * Abstract base class defining the workflow execution strategy interface
 */
class WorkflowExecutionStrategy {
  constructor() {
    if (this.constructor === WorkflowExecutionStrategy) {
      throw new Error(
        'Cannot instantiate abstract WorkflowExecutionStrategy directly'
      );
    }
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
   * Returns the concurrency for the task queue
   * @returns {number} The concurrency for the task queue
   */
  getConcurrencyForTaskQueue() {
    return 1;
  }

  /**
   * Execute the task
   * @param {Object} task - The task to execute
   */
  async _executeTask(teamStoreState, task) {
    const shouldClone = this._isTaskAgentBusy(task, teamStoreState.tasks);

    const agent = shouldClone ? cloneAgent(task.agent) : task.agent;

    const context = this.getContextForTask(teamStoreState, task);

    teamStoreState.updateExecutingTasks({ toAdd: [task.id] });
    teamStoreState.updatePendingTasks({ toRemove: [task.id] });
    return await teamStoreState.workOnTask(agent, task, context);
  }

  /*
   * Start the workflow execution. Each strategy knows which tasks to execute.
   */
  async startExecution(_teamStoreState) {
    throw new Error(
      'startExecution() must be implemented by concrete strategies'
    );
  }

  /**
   * Get the context for a task from the previous tasks results.
   *
   * @param {Object} teamStoreState - The team store state
   * @param {Object} task - The task to get context for
   * @returns {Object} The context for the task
   */
  getContextForTask(_teamStoreState, _task) {
    throw new Error(
      'getContextForTask() must be implemented by concrete strategies'
    );
  }

  /**
   * Execute the strategy for the given changed tasks
   * @param {Object} teamStoreState - The team store state
   * @param {Array} changedTaskIds - Array of task IDs that have changed status
   */
  async executeFromChangedTasks(_teamStoreState, _changedTaskIds) {
    throw new Error(
      'executeFromChangedTasks() must be implemented by concrete strategies'
    );
  }

  /**
   * Stops the workflow execution.
   * This method should be implemented by concrete strategies to handle stopping workflow execution.
   *
   * @param {Object} teamStoreState - The team store state
   */
  async stopExecution(_teamStoreState) {
    throw new Error(
      'stopExecution() must be implemented by concrete strategies'
    );
  }

  /**
   * Resumes the workflow execution from its current state.
   * This method should be implemented by concrete strategies to handle resuming workflow execution.
   *
   * @param {Object} teamStoreState - The team store state
   */
  async resumeExecution(_teamStoreState) {
    throw new Error(
      'resumeExecution() must be implemented by concrete strategies'
    );
  }
}

export default WorkflowExecutionStrategy;
