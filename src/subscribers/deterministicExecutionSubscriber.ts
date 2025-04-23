import { DepGraph } from 'dependency-graph';
import PQueue from 'p-queue';
import { Task } from '..';
import { CombinedStoresState, TeamStore } from '../stores';
import { TASK_STATUS_enum, WORKFLOW_STATUS_enum } from '../utils/enums';
import {
  TaskCompletionLog,
  TaskStatusLog,
  WorkflowLog,
  WorkflowStatusLog,
} from '../types/logs';

export type DependencyResult = {
  taskId: string;
  taskTitle: string;
  taskDescription: string;
  result: string | Record<string, unknown>;
  timestamp: number;
};

type DependencyGraph = DepGraph<string>;

/**
 * Creates a deterministic execution subscriber that manages task execution
 * using a queue and dependency graph.
 *
 * @param teamStore - The team store instance
 * @returns Cleanup function to unsubscribe
 */
export const subscribeDeterministicExecution = (teamStore: TeamStore): void => {
  const taskQueue = new PQueue({ concurrency: 5, autoStart: true });

  // A graph with the pending tasks to execute
  // Every time a task is done, it is removed from the graph
  const executionDepGraph: DependencyGraph = new DepGraph();

  // A graph with the dependencies between tasks
  // This is used to get the context for a task
  const contextDepGraph: DependencyGraph = new DepGraph();

  const _isTaskAgentBusy = (currentTask: Task, tasks: Task[]): boolean => {
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
   */
  const _getContextForTask = (
    teamStoreState: CombinedStoresState,
    task: Task
  ): string => {
    const logs = teamStoreState.workflowLogs;
    const resultsFromParentTasks: DependencyResult[] = [];

    // Get all dependencies for the current task
    const dependencies = contextDepGraph.dependantsOf(task.id);

    for (const dependencyId of dependencies) {
      const dependency: Task | undefined = teamStoreState.tasks.find(
        (t) => t.id === dependencyId
      );
      const dependencyResultsLogs = logs.find(
        (l) =>
          l.logType === 'TaskStatusUpdate' &&
          (l as TaskStatusLog).taskStatus === TASK_STATUS_enum.DONE &&
          (l as TaskStatusLog).task.id === dependencyId
      ) as TaskCompletionLog | undefined;

      if (!dependencyResultsLogs || !dependency) {
        console.warn(
          `No dependency results found for task ${dependencyId}`,
          dependencies
        );
        continue;
      }

      resultsFromParentTasks.push({
        taskId: dependency.id,
        taskTitle: dependency.title,
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
   */
  const _executeTask = async (
    teamStoreState: CombinedStoresState,
    task: Task
  ): Promise<void> => {
    const context = _getContextForTask(teamStoreState, task);

    teamStoreState.updateTaskStatus(task.id, TASK_STATUS_enum.DOING);
    return await teamStoreState.workOnTask(task.agent, task, context);
  };

  const _resumeTask = async (
    teamStoreState: CombinedStoresState,
    task: Task
  ): Promise<void> => {
    teamStoreState.updateTaskStatus(task.id, TASK_STATUS_enum.DOING);
    return await teamStoreState.workOnTaskResume(task.agent, task);
  };

  /**
   * Add a task to the execution queue
   */
  const _queueTask = ({
    teamStoreState,
    task,
    highPriority = false,
    resume = false,
  }: {
    teamStoreState: CombinedStoresState;
    task: Task;
    highPriority?: boolean;
    resume?: boolean;
  }): void => {
    taskQueue
      .add(
        () =>
          (resume
            ? _resumeTask(teamStoreState, task)
            : _executeTask(teamStoreState, task)
          ).catch((error) => {
            teamStoreState.handleTaskError({
              agent: task.agent.agentInstance,
              task,
              error,
            });
            teamStoreState.handleWorkflowError(error);
          }),
        { priority: highPriority ? 1 : 0 }
      )
      .catch((error: unknown) => {
        console.error('Error queuing task: ' + error);
        // throw new Error('Error queuing task: ' + error.message);
      });
  };

  /**
   * Initialize the dependency graph with tasks and their dependencies
   */
  const _initializeGraph = (): void => {
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
  const _queueTasksReadyToExecute = (
    teamStoreState: CombinedStoresState
  ): void => {
    const entryNodes = executionDepGraph.entryNodes();
    const allowedStatusesToRun = [
      TASK_STATUS_enum.TODO,
      TASK_STATUS_enum.REVISE,
    ];
    entryNodes.forEach((taskId) => {
      const task = teamStoreState.tasks.find((t) => t.id === taskId);
      if (!task) return;

      const isTaskAgentBusy = _isTaskAgentBusy(task, teamStoreState.tasks);

      if (
        allowedStatusesToRun.includes(task.status as TASK_STATUS_enum) &&
        !isTaskAgentBusy
      ) {
        _queueTask({ teamStoreState, task });
      }
    });
  };

  const _clearGraph = (graph: DependencyGraph): void => {
    while (graph.size() > 0) {
      for (const node of graph.entryNodes()) {
        graph.removeNode(node);
      }
    }
  };

  const _handleWorkflowStatusUpdate = ({
    currentLog,
    previousLogs,
    state,
  }: {
    currentLog: WorkflowStatusLog;
    previousLogs: WorkflowLog[];
    state: CombinedStoresState;
  }): void => {
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
        taskQueue.start();
        break;

      case WORKFLOW_STATUS_enum.RUNNING:
        if (previousStatus === WORKFLOW_STATUS_enum.INITIAL) {
          try {
            _initializeGraph();
            _queueTasksReadyToExecute(state);
          } catch (error) {
            console.error('Error initializing graph', error);
          }
        }
        break;

      case WORKFLOW_STATUS_enum.STOPPED:
        taskQueue.clear();
        _clearGraph(executionDepGraph);
        _clearGraph(contextDepGraph);
        break;
    }
  };

  const _handleTaskStatusUpdate = ({
    currentLog,
    state,
  }: {
    currentLog: TaskStatusLog;
    state: CombinedStoresState;
  }): void => {
    const task = currentLog.task;
    const taskStatus = currentLog.taskStatus;

    switch (taskStatus) {
      case TASK_STATUS_enum.DONE:
        executionDepGraph.removeNode(task.id);
        _queueTasksReadyToExecute(state);
        break;

      case TASK_STATUS_enum.REVISE:
        _queueTask({ teamStoreState: state, task, highPriority: true });
        break;

      case TASK_STATUS_enum.RESUMED:
        _queueTask({ teamStoreState: state, task, resume: true });
        break;
    }
  };

  // Subscribe to workflow status updates
  teamStore.subscribe(
    (state) => state.workflowLogs,
    // @ts-expect-error: Zustand subscribe overload is not properly typed
    (newLogs: WorkflowLog[], previousLogs: WorkflowLog[]) => {
      if (newLogs.length > previousLogs.length) {
        const currentLog = newLogs[newLogs.length - 1];
        const state = teamStore.getState();

        if (currentLog.logType === 'WorkflowStatusUpdate') {
          _handleWorkflowStatusUpdate({
            currentLog: currentLog as WorkflowStatusLog,
            previousLogs,
            state,
          });
        } else if (currentLog.logType === 'TaskStatusUpdate') {
          _handleTaskStatusUpdate({
            currentLog: currentLog as TaskStatusLog,
            state,
          });
        }
      }
    }
  );
};
