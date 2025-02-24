import PQueue from 'p-queue';
import { DepGraph } from 'dependency-graph';
import { TASK_STATUS_enum, WORKFLOW_STATUS_enum } from '../utils/enums';
import { cloneAgent } from '../utils/agents';
/**
 * Creates a deterministic execution subscriber that manages task execution
 * using a queue and dependency graph.
 *
 * @param {Object} teamStore - The team store instance
 * @returns {Function} Cleanup function to unsubscribe
 */
export const subscribeDeterministicExecution = (teamStore) => {
  const taskQueue = new PQueue({ concurrency: 5, autoStart: true });
  const executionDepGraph = new DepGraph();
  const contextDepGraph = new DepGraph();
  let abortController = new AbortController();

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

    const agent = shouldClone ? cloneAgent(task.agent) : task.agent;
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
        console.error('Error queuing task', error);
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
          executionDepGraph.addDependency(tasks[i].id, task.id);
          if (!hasDependencies) {
            contextDepGraph.addDependency(tasks[i].id, task.id);
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
      graph.removeNode(graph.entryNodes()[0]);
    }
  };

  // Subscribe to workflow status changes
  teamStore.subscribe(
    (state) => state.teamWorkflowStatus,
    (status, previousStatus) => {
      switch (status) {
        case WORKFLOW_STATUS_enum.PAUSED:
          taskQueue.pause();
          abortController.abort();
          abortController = new AbortController();
          break;

        case WORKFLOW_STATUS_enum.RUNNING:
          if (previousStatus === WORKFLOW_STATUS_enum.INITIAL) {
            try {
              _initializeGraph();
              _queueTasksReadyToExecute(teamStore.getState());
            } catch (error) {
              console.error('Error initializing graph', error);
            }
          }
          break;

        case WORKFLOW_STATUS_enum.STOPPED:
          taskQueue.clear();
          _clearGraph(executionDepGraph);
          _clearGraph(contextDepGraph);
          abortController.abort();
          break;
      }
    }
  );

  // Subscribe to task status changes
  teamStore.subscribe(
    (state) => state.tasks,
    (tasks, previousTasks) => {
      tasks.forEach((task, index) => {
        if (task.status !== previousTasks[index]?.status) {
          switch (task.status) {
            case TASK_STATUS_enum.DONE:
              // if the task is done, remove it from the graph and queue the next tasks
              // remove task from graph
              executionDepGraph.removeNode(task.id);
              _queueTasksReadyToExecute(teamStore.getState());
              break;

            case TASK_STATUS_enum.REVISE:
              // task is ready to be executed again
              // execute the task with highest priority
              _queueTask(teamStore.getState(), task, true);
              break;
          }
        }
      });
    }
  );
};
