import PQueue from 'p-queue';
import { DepGraph } from 'dependency-graph';
import { TASK_STATUS_enum, WORKFLOW_STATUS_enum } from '../utils/enums';

/**
 * Creates a deterministic execution subscriber that manages task execution
 * using a queue and dependency graph.
 *
 * @param {Object} teamStore - The team store instance
 * @returns {Function} Cleanup function to unsubscribe
 */
export const subscribeDeterministicExecution = (teamStore) => {
  const taskQueue = new PQueue({ concurrency: 5, autoStart: true });

  // A graph with the pending tasks to execute
  // Every time a task is done, it is removed from the graph
  const executionDepGraph = new DepGraph();

  // A graph with the dependencies between tasks
  // This is used to get the context for a task
  const contextDepGraph = new DepGraph();

  const _isTaskAgentBusy = (currentTask, tasks) => {
    return tasks.some(
      (t) =>
        t.agent &&
        t.id !== currentTask.id &&
        t.agent.id === currentTask.agent.id &&
        t.status === TASK_STATUS_enum.DOING
    );
  };

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
  const _getContextForTask = (teamStoreState, task) => {
    const logs = teamStoreState.workflowLogs;
    const resultsFromParentTasks = [];

    // Get all dependencies for the current task
    const dependencies = contextDepGraph.dependantsOf(task.id);

    for (const dependencyId of dependencies) {
      const dependency = teamStoreState.tasks.find(
        (t) => t.id === dependencyId
      );
      const dependencyResultsLogs = logs.find(
        (l) =>
          l.logType === 'TaskStatusUpdate' &&
          l.taskStatus === TASK_STATUS_enum.DONE &&
          l.task.id === dependencyId
      );

      if (!dependencyResultsLogs) {
        console.warn(
          `No dependency results found for task ${dependencyId}`,
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
  };

  /**
   * Execute the task
   * @param {Object} task - The task to execute
   */
  const _executeTask = async (teamStoreState, task) => {
    const shouldClone = _isTaskAgentBusy(task, teamStoreState.tasks);

    const agent = shouldClone ? task.agent.clone() : task.agent;
    const context = _getContextForTask(teamStoreState, task);

    teamStoreState.updateTaskStatus(task.id, TASK_STATUS_enum.DOING);
    return await teamStoreState.workOnTask(agent, task, context);
  };

  /**
   * Add a task to the execution queue
   * @param {Object} task - The task to queue
   */
  const _queueTask = (teamStoreState, task, highPriority = false) => {
    taskQueue
      .add(
        () =>
          _executeTask(teamStoreState, task).catch((error) => {
            teamStoreState.handleTaskError({ task, error });
            teamStoreState.handleWorkflowError(task, error);
          }),
        { priority: highPriority ? 1 : 0 }
      )
      .catch((error) => {
        throw new Error('Error queuing task', error);
      });
  };

  /**
   * Initialize the dependency graph with tasks and their dependencies
   */
  const _initializeGraph = () => {
    _clearGraph(executionDepGraph);
    _clearGraph(contextDepGraph);

    const tasks = teamStore.getState().tasks;
    tasks.forEach((task) => {
      executionDepGraph.addNode(task.id);
      contextDepGraph.addNode(task.id);
    });

    tasks.forEach((task, index) => {
      const hasDependencies =
        Array.isArray(task.dependencies) && task.dependencies.length > 0;
      if (hasDependencies) {
        task.dependencies.forEach((depReferenceId) => {
          const dep = tasks.find((t) => t.referenceId === depReferenceId);
          if (dep) {
            executionDepGraph.addDependency(dep.id, task.id);
            contextDepGraph.addDependency(dep.id, task.id);
          }
        });
      }

      // for tasks that are not allowed to run in parallel:
      // add dependencies to all previous tasks
      if (!task.allowParallelExecution && index > 0) {
        for (let i = 0; i < index; i++) {
          const previousTask = tasks[i];
          executionDepGraph.addDependency(previousTask.id, task.id);

          // add context dependencies to all non-parallel previous tasks
          if (!hasDependencies && !previousTask.allowParallelExecution) {
            contextDepGraph.addDependency(previousTask.id, task.id);
          }
        }
      }
    });
  };

  // add tasks ready to execute to queue
  const _queueTasksReadyToExecute = (teamStoreState) => {
    executionDepGraph.entryNodes().forEach((taskId) => {
      const task = teamStoreState.tasks.find((t) => t.id === taskId);
      _queueTask(teamStoreState, task);
    });
  };

  const _clearGraph = (graph) => {
    while (graph.size() > 0) {
      for (const node of graph.entryNodes()) {
        graph.removeNode(node);
      }
    }
  };

  const _handleWorkflowStatusUpdate = ({ currentLog, previousLogs, state }) => {
    const status = currentLog.workflowStatus;
    const previousLog =
      Array.isArray(previousLogs) && previousLogs.length > 0
        ? previousLogs[previousLogs.length - 1]
        : null;
    const previousStatus =
      previousLog?.workflowStatus || WORKFLOW_STATUS_enum.INITIAL;

    switch (status) {
      case WORKFLOW_STATUS_enum.PAUSED:
        taskQueue.pause();
        break;

      case WORKFLOW_STATUS_enum.RESUMED:
        taskQueue.resume();
        break;

      case WORKFLOW_STATUS_enum.RUNNING:
        if (previousStatus === WORKFLOW_STATUS_enum.INITIAL) {
          _initializeGraph();
          _queueTasksReadyToExecute(state);
        }
        break;

      case WORKFLOW_STATUS_enum.STOPPED:
        taskQueue.clear();
        _clearGraph(executionDepGraph);
        _clearGraph(contextDepGraph);
        break;
    }
  };

  const _handleTaskStatusUpdate = ({ currentLog, state }) => {
    const task = currentLog.task;
    const taskStatus = currentLog.taskStatus;

    switch (taskStatus) {
      case TASK_STATUS_enum.DONE:
        executionDepGraph.removeNode(task.id);
        _queueTasksReadyToExecute(state);
        break;

      case TASK_STATUS_enum.REVISE:
        _queueTask(state, task, true);
        break;
    }
  };

  // Mapping of workflow log types to handlers
  // Each handler is called with the current log, the previous logs, the current logs and the team store state
  const _handleWorkflowLogByType = {
    WorkflowStatusUpdate: _handleWorkflowStatusUpdate,
    TaskStatusUpdate: _handleTaskStatusUpdate,
  };

  // Subscribe to workflow logs
  const workflowLogsUnsubscribe = teamStore.subscribe(
    (state) => state.workflowLogs,
    (logs, previousLogs) => {
      // Get new logs since last update
      const newLogs = logs.slice(previousLogs.length);

      // Process each new log
      newLogs.forEach((currentLog) => {
        const handler = _handleWorkflowLogByType[currentLog.logType];
        if (handler) {
          try {
            handler({
              currentLog,
              previousLogs,
              logs,
              state: teamStore.getState(),
            });
          } catch (error) {
            console.error('Error handling workflow log', error);
          }
        }
      });
    }
  );

  return () => {
    workflowLogsUnsubscribe();
    taskQueue.clear();
    _clearGraph(executionDepGraph);
    _clearGraph(contextDepGraph);
  };
};
