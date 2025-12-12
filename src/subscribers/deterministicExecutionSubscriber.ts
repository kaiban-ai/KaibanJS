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
import { logger } from '../utils/logger';

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
   * Get structured outputs from dependency tasks that have outputSchema defined.
   * Returns a map of taskId -> structured result
   */
  const _getStructuredOutputsFromDependencies = (
    teamStoreState: CombinedStoresState,
    task: Task
  ): Record<string, unknown> => {
    const logs = teamStoreState.workflowLogs;
    const structuredOutputs: Record<string, unknown> = {};

    // Get all dependencies for the current task
    const dependencies = contextDepGraph.dependantsOf(task.id);

    for (const dependencyId of dependencies) {
      const dependency: Task | undefined = teamStoreState.tasks.find(
        (t) => t.id === dependencyId
      );

      if (!dependency || !dependency.outputSchema) {
        continue; // Skip if no outputSchema defined
      }

      // Find last log for the dependency
      const dependencyResultsLogs = [...logs]
        .reverse()
        .find(
          (l) =>
            l.logType === 'TaskStatusUpdate' &&
            (l as TaskStatusLog).taskStatus === TASK_STATUS_enum.DONE &&
            (l as TaskStatusLog).task.id === dependencyId
        ) as TaskCompletionLog | undefined;

      if (!dependencyResultsLogs) {
        continue;
      }

      const result = dependencyResultsLogs.metadata.result;
      // If result is already an object and matches the schema, use it directly
      if (typeof result === 'object' && result !== null) {
        // Validate against schema if possible
        try {
          const validated = dependency.outputSchema.parse(result);
          structuredOutputs[dependencyId] = validated;
          logger.debug(
            `Extracted structured output from task ${dependencyId} for task ${task.id}`
          );
        } catch (error) {
          console.log(`Validation failed`);
          // If validation fails, still pass the result but log a warning
          logger.warn(
            `Output from task ${dependencyId} does not match its outputSchema, passing as-is`,
            error
          );
          structuredOutputs[dependencyId] = result;
        }
      } else if (typeof result === 'string') {
        // Try to parse string result as JSON
        try {
          const parsed = JSON.parse(result);
          const validated = dependency.outputSchema.parse(parsed);
          structuredOutputs[dependencyId] = validated;
          logger.debug(
            `Parsed and extracted structured output from task ${dependencyId} for task ${task.id}`
          );
        } catch (error) {
          logger.warn(
            `Could not parse or validate string result from task ${dependencyId}`,
            error
          );
        }
      }
    }

    return structuredOutputs;
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
      //Find last log for the dependency, latest is needed because it could be feedback in same task.
      const dependencyResultsLogs = [...logs]
        .reverse()
        .find(
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

    // Get structured outputs from dependencies
    const structuredOutputs = _getStructuredOutputsFromDependencies(
      teamStoreState,
      task
    );

    // Merge team inputs with structured outputs
    // Priority: structured outputs > team inputs (for keys that exist in both)
    const hasStructuredOutputs = Object.keys(structuredOutputs).length > 0;
    let mergedInputs: Record<string, unknown> | undefined = undefined;

    if (hasStructuredOutputs) {
      mergedInputs = {
        ...teamStoreState.inputs,
        ...structuredOutputs,
      };

      // Special handling for WorkflowDrivenAgent with single dependency:
      // If there's only one dependency and the agent is WorkflowDrivenAgent,
      // try to pass the output directly at root level if the workflow's inputSchema matches
      const dependencyKeys = Object.keys(structuredOutputs);
      if (
        dependencyKeys.length === 1 &&
        task.agent.type === 'WorkflowDrivenAgent'
      ) {
        const dependencyOutput = structuredOutputs[dependencyKeys[0]];
        const workflow = (task.agent.agentInstance as any).workflow;

        if (workflow && workflow.inputSchema) {
          try {
            // Try to validate the dependency output against workflow's inputSchema
            workflow.inputSchema.parse(dependencyOutput);
            // If validation succeeds, merge the output directly at root level
            mergedInputs = {
              ...teamStoreState.inputs,
              ...structuredOutputs,
              ...(dependencyOutput as Record<string, unknown>),
            };
            logger.debug(
              `Passing structured output directly to workflow for task ${task.id}`
            );
          } catch (_error) {
            // If validation fails, keep the original structure (under taskId)
            logger.debug(
              `Workflow inputSchema doesn't match dependency output, keeping taskId structure for task ${task.id}`
            );
          }
        }
      }
    }

    teamStoreState.updateTaskStatus(task.id, TASK_STATUS_enum.DOING);

    if (mergedInputs) {
      return await teamStoreState.workOnTask(
        task.agent,
        task,
        context,
        mergedInputs
      );
    } else {
      return await teamStoreState.workOnTask(task.agent, task, context);
    }
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

      case TASK_STATUS_enum.REVISE: {
        const dependencies = contextDepGraph.dependenciesOf(task.id);
        for (const dependency of dependencies) {
          const dependencyTask = state.tasks.find((t) => t.id === dependency);
          if (dependencyTask) {
            state.updateTaskStatus(dependencyTask.id, TASK_STATUS_enum.TODO);
          }
        }
        _initializeGraph();

        state.tasks.forEach((t) => {
          if (!dependencies.includes(t.id)) {
            executionDepGraph.removeNode(t.id);
          }
        });
        _queueTask({ teamStoreState: state, task, highPriority: true });
        break;
      }

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
