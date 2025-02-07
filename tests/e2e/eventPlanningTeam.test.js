require('dotenv').config({ path: './.env.local' });
const fs = require('fs');
const path = require('path');

// Setup mock
const { mock, restoreAll } = require('../utils/moscaFetch')();
// const { record, getRecords, saveRecords } = require('../utils/moscaFetch')();

const openAITeam = require('./examples/teams/event_planning/openai');
const openAITeamRecordedRequests = require('./examples/teams/event_planning/openai.requests.json');

// Determine if mocks should be applied based on the environment
const withMockedApis =
  process.env.TEST_ENV === 'mocked-llm-apis' ? true : false;

//   record({
//     url: '*',
//     method: '*',
//     body: '*'  // Record any POST request to this URL
// });

/**
 * Check if there are no task updates between PAUSED and DOING for a given task
 * except for the parallel tasks
 * @param {*} state
 * @param {*} task
 * @param {*} parallelTasks
 * @returns
 */
const checkNoTaskUpdatesBetween = (state, task, parallelTasks) => {
  const startIndex = state.workflowLogs.findIndex(
    (log) =>
      log.logType === 'TaskStatusUpdate' &&
      log.task.description === task.description &&
      log.taskStatus === 'PAUSED'
  );
  const endIndex = state.workflowLogs.findIndex(
    (log) =>
      log.logType === 'TaskStatusUpdate' &&
      log.task.description === task.description &&
      log.taskStatus === 'DOING' &&
      state.workflowLogs.indexOf(log) > startIndex
  );
  const logsInBetween = state.workflowLogs.slice(startIndex + 1, endIndex);
  const taskStatusUpdatesInBetween = logsInBetween.filter(
    (log) =>
      log.logType === 'TaskStatusUpdate' &&
      !parallelTasks.includes(log.task.description)
  );
  expect(taskStatusUpdatesInBetween.length).toBe(0);

  return { pausedIndex: startIndex, nextDoingIndex: endIndex };
};

/**
 * Check if the thinking metadata is consistent between PAUSED and DOING for a given task
 * @param {*} state
 * @param {*} task
 * @param {*} pausedIndex
 * @param {*} nextDoingIndex
 * @returns
 */
const checkThinkingMetadataConsistency = (
  state,
  task,
  pausedIndex,
  nextDoingIndex
) => {
  const lastThinkingBeforePause = state.workflowLogs
    .slice(0, pausedIndex)
    .filter(
      (log) =>
        log.logType === 'AgentStatusUpdate' &&
        log.agentStatus === 'THINKING' &&
        log.task.description === task.description
    )
    .pop();

  const firstThinkingAfterResume = state.workflowLogs
    .slice(nextDoingIndex)
    .filter(
      (log) =>
        log.logType === 'AgentStatusUpdate' &&
        log.agentStatus === 'THINKING' &&
        log.task.description === task.description
    )
    .shift();

  expect(lastThinkingBeforePause.metadata).toEqual(
    firstThinkingAfterResume.metadata
  );
};

describe('Event Planning Team Workflows', () => {
  describe('Using Standard OpenAI Agents', () => {
    beforeEach(() => {
      // Mocking all POST requests with a callback
      if (withMockedApis) {
        mock(openAITeamRecordedRequests);
      }
    });

    afterEach(() => {
      if (withMockedApis) {
        restoreAll();
      }
    });

    it('completes the entire workflow successfully with proper task sequencing', async () => {
      const { team, tasks } = openAITeam;
      await team.start();
      let storeFinalState = team.useStore().getState().getCleanedState();

      const snapshotName = `eventPlanningTeam.test.json`;
      const snapshotDir = path.join(process.cwd(), `tests/e2e/__snapshots__`);
      const snapshotPath = path.join(snapshotDir, snapshotName);

      const storeFinalStateStr = JSON.stringify(storeFinalState, null, 2);

      let snapshotContent = storeFinalStateStr;
      if (!fs.existsSync(snapshotPath)) {
        console.log('Creating snapshot file');
        // ensure the directory exists
        fs.mkdirSync(snapshotDir, { recursive: true });

        // Save state to JSON file
        fs.writeFileSync(snapshotPath, storeFinalStateStr);
      } else {
        snapshotContent = fs.readFileSync(snapshotPath, 'utf8');
      }

      // Parse the snapshot content into an object for comparison
      let snapshotContentObj = JSON.parse(snapshotContent);

      // Create mapping of task names to IDs from the tasks array
      const taskNameToId = tasks.reduce(
        (acc, task) => ({
          ...acc,
          [task.description]: task.id,
        }),
        {}
      );

      // Helper function to replace task IDs in a state object
      const replaceTaskIds = (state) => {
        // Replace task IDs in tasks array
        state.tasks = state.tasks.map((task) => ({
          ...task,
          id: taskNameToId[task.description] || task.id,
          dependencies: task.dependencies?.map((depId) => {
            // Find task with this ID and get its description
            const depTask = tasks.find((t) => t.id === depId);
            return depTask ? taskNameToId[depTask.description] : depId;
          }),
        }));

        // Replace task IDs in workflow logs
        state.workflowLogs = state.workflowLogs.map((log) => ({
          ...log,
          task: log.task
            ? {
                ...log.task,
                id: taskNameToId[log.task.description] || log.task.id,
                dependencies: log.task.dependencies?.map((depId) => {
                  const depTask = tasks.find((t) => t.id === depId);
                  return depTask ? taskNameToId[depTask.description] : depId;
                }),
              }
            : log.task,
        }));

        return state;
      };

      // Replace IDs in both current state and snapshot
      storeFinalState = replaceTaskIds(storeFinalState);
      snapshotContentObj = replaceTaskIds(snapshotContentObj);

      // Verify key properties match between current state and snapshot
      expect(storeFinalState.teamWorkflowStatus).toEqual(
        snapshotContentObj.teamWorkflowStatus
      );
      expect(storeFinalState.workflowResult).toEqual(
        snapshotContentObj.workflowResult
      );
      expect(storeFinalState.name).toEqual(snapshotContentObj.name);
      expect(storeFinalState.inputs).toEqual(snapshotContentObj.inputs);
      expect(storeFinalState.workflowContext).toEqual(
        snapshotContentObj.workflowContext
      );
      expect(storeFinalState.logLevel).toEqual(snapshotContentObj.logLevel);

      // Verify workflow logs have same length
      expect(storeFinalState.workflowLogs.length).toEqual(
        snapshotContentObj.workflowLogs.length
      );

      // Verify all logs exist in both states regardless of order
      const logsExistInBoth = storeFinalState.workflowLogs.every((currentLog) =>
        snapshotContentObj.workflowLogs.some(
          (snapshotLog) =>
            JSON.stringify(currentLog) === JSON.stringify(snapshotLog)
        )
      );
      expect(logsExistInBoth).toBe(true);

      // Helper function to get parent tasks recursively
      const getParentTasks = (task, allTasks) => {
        const parentTasks = new Set();
        if (!task.dependencies) return parentTasks;

        task.dependencies.forEach((depId) => {
          const parentTask = allTasks.find((t) => t.id === depId);
          if (parentTask) {
            parentTasks.add(parentTask);
            for (const parent of getParentTasks(parentTask, allTasks)) {
              parentTasks.add(parent);
            }
          }
        });
        return Array.from(parentTasks);
      };

      // Verify task dependencies are completed
      storeFinalState.tasks.forEach((task) => {
        const parentTasks = getParentTasks(task, storeFinalState.tasks);

        // Find index where current task is marked as DONE
        const currentTaskDoneIndex = storeFinalState.workflowLogs.findIndex(
          (log) =>
            log.logType === 'TaskStatusUpdate' &&
            log.taskStatus === 'DONE' &&
            log.task.id === task.id
        );

        expect(currentTaskDoneIndex).not.toBe(-1);

        // console.log(task.id, currentTaskDoneIndex, parentTasks.map(p => p.id));

        parentTasks.forEach((parentTask) => {
          const parentTaskDoneIndex = storeFinalState.workflowLogs.findIndex(
            (log) =>
              log.logType === 'TaskStatusUpdate' &&
              log.taskStatus === 'DONE' &&
              log.task.id === parentTask.id
          );

          expect(parentTaskDoneIndex).toBeLessThan(currentTaskDoneIndex);
        });
      });

      // expect(storeFinalState).toMatchSnapshot();

      // const recordedData = getRecords();
      // console.log(recordedData);
      // saveRecords();
    });

    it('executes tasks in correct sequential order with proper state transitions', async () => {
      const { team, tasks } = openAITeam;
      await team.start();
      const store = team.useStore();
      const finalState = store.getState();
      const cleanedState = finalState.getCleanedState();

      // Verify workflow completed successfully
      expect(cleanedState.teamWorkflowStatus).toBe('FINISHED');

      // Get task status updates from workflow logs
      const taskStatusLogs = cleanedState.workflowLogs.filter(
        (log) => log.logType === 'TaskStatusUpdate'
      );

      // Group status updates by task
      const taskStatusHistory = tasks.reduce((acc, task) => {
        acc[task.id] = taskStatusLogs
          .filter((log) => log.task.id === task.id)
          .map((log) => log.taskStatus);
        return acc;
      }, {});

      // Verify each task followed the correct status sequence
      tasks.forEach((task) => {
        const statusHistory = taskStatusHistory[task.id];
        expect(statusHistory).toEqual(['DOING', 'DONE']);
      });

      // Verify tasks were executed in correct order
      const taskCompletionOrder = taskStatusLogs
        .filter((log) => log.taskStatus === 'DONE')
        .map((log) => log.task.id);

      // Verify all task dependencies were respected
      const dependencyPairs = tasks.reduce((pairs, task) => {
        if (task.dependencies) {
          task.dependencies.forEach((depId) => {
            pairs.push({
              taskId: task.id,
              dependencyId: depId,
            });
          });
        }
        return pairs;
      }, []);

      // Verify each dependency pair
      dependencyPairs.forEach(({ taskId, dependencyId }) => {
        const taskIndex = taskCompletionOrder.indexOf(taskId);
        const depIndex = taskCompletionOrder.indexOf(dependencyId);
        expect(depIndex).toBeLessThan(taskIndex);
      });

      // Verify executingTasks and pendingTasks are not in cleaned state
      expect(cleanedState).not.toHaveProperty('executingTasks');
      expect(cleanedState).not.toHaveProperty('pendingTasks');

      // Verify final state of actual store
      expect(finalState.executingTasks.size).toBe(0);
      expect(finalState.pendingTasks.size).toBe(0);
    });
  });

  describe('Pause and Resume', () => {
    beforeEach(() => {
      if (withMockedApis) {
        mock(openAITeamRecordedRequests, { delay: 100 });
      }
    });

    afterEach(() => {
      if (withMockedApis) {
        restoreAll();
      }
    });

    it('should pause and resume first task correctly', async () => {
      const { team } = openAITeam;
      const workflowPromise = team.start();
      const store = team.useStore();

      const firstTask = store.getState().tasks[0]; // selectEventDateTask

      // Wait for the event manager agent to start working
      await new Promise((resolve) => {
        const unsubscribe = store.subscribe(
          (state) => state.workflowLogs,
          (logs) => {
            const hasAgentStarted = logs.some(
              (log) =>
                log.logType === 'AgentStatusUpdate' &&
                log.agent.name === firstTask.agent.name &&
                log.task.description === firstTask.description &&
                log.agentStatus === 'THINKING'
            );

            if (hasAgentStarted) {
              unsubscribe();
              resolve();
            }
          }
        );
      });

      // Pause workflow
      await team.pause();
      let state = store.getState();

      // Verify pause state
      expect(state.teamWorkflowStatus).toBe('PAUSED');
      expect(state.tasks[0].status).toBe('PAUSED');
      expect(state.taskQueue.isPaused).toBe(true);

      await new Promise((resolve) => setTimeout(resolve, 400));

      // Resume workflow
      await team.resume();
      state = store.getState();

      // Verify resume state
      expect(state.teamWorkflowStatus).toBe('RUNNING');
      expect(state.tasks[0].status).toBe('DOING');
      expect(state.taskQueue.isPaused).toBe(false);

      // Complete workflow
      await workflowPromise;
      state = store.getState();

      // Verify workflow logs for pause status
      const pauseLogs = state.workflowLogs.filter(
        (log) =>
          log.logType === 'TaskStatusUpdate' && log.taskStatus === 'PAUSED'
      );

      expect(pauseLogs.length).toBe(1);
      expect(pauseLogs[0].task.description).toBe(firstTask.description);
      expect(pauseLogs[0].agent.name).toBe(firstTask.agent.name);

      // Check evolution of the paused task through logs
      const taskStatusLogs = state.workflowLogs.filter(
        (log) =>
          log.logType === 'TaskStatusUpdate' &&
          log.task.description === firstTask.description
      );

      const statusSequence = taskStatusLogs.map((log) => log.taskStatus);
      expect(statusSequence).toEqual(['DOING', 'PAUSED', 'DOING', 'DONE']);

      // Check no other task updates between PAUSED and DOING
      const { pausedIndex, nextDoingIndex } = checkNoTaskUpdatesBetween(
        state,
        firstTask,
        []
      );

      // Verify thinking metadata consistency
      checkThinkingMetadataConsistency(
        state,
        firstTask,
        pausedIndex,
        nextDoingIndex
      );
    });

    it('should pause and resume one task in parallel with another task correctly', async () => {
      const { team } = openAITeam;
      const workflowPromise = team.start();
      const store = team.useStore();
      let state = store.getState();

      const intermediateTaskIndex = 2;
      const inParallelTaskIndex = 1;
      const intermediateTask = state.tasks[intermediateTaskIndex]; // finalizeGuestListTask
      const inParallelTask = state.tasks[inParallelTaskIndex]; // bookVenueTask

      // Wait for the marketing agent to start working
      await new Promise((resolve) => {
        const unsubscribe = store.subscribe(
          (state) => state.workflowLogs,
          (logs) => {
            const hasAgentStarted = logs.some(
              (log) =>
                log.logType === 'AgentStatusUpdate' &&
                log.agent.name === intermediateTask.agent.name &&
                log.task.description === intermediateTask.description &&
                log.agentStatus === 'THINKING'
            );

            if (hasAgentStarted) {
              unsubscribe();
              resolve();
            }
          }
        );
      });

      // Pause and verify
      await team.pause();
      state = store.getState();

      expect(state.teamWorkflowStatus).toBe('PAUSED');
      expect(state.tasks[intermediateTaskIndex].status).toBe('PAUSED');
      expect(state.tasks[inParallelTaskIndex].status).toBe('PAUSED');
      expect(state.taskQueue.isPaused).toBe(true);

      await new Promise((resolve) => setTimeout(resolve, 400));

      // Resume and verify
      await team.resume();
      state = store.getState();

      expect(state.teamWorkflowStatus).toBe('RUNNING');
      expect(state.tasks[intermediateTaskIndex].status).toBe('DOING');
      expect(state.tasks[inParallelTaskIndex].status).toBe('DOING');
      expect(state.taskQueue.isPaused).toBe(false);

      // Complete workflow and verify logs
      await workflowPromise;
      state = store.getState();

      // Check evolution of the intermediate task through logs
      const taskStatusLogs = state.workflowLogs.filter(
        (log) =>
          log.logType === 'TaskStatusUpdate' &&
          log.task.description === intermediateTask.description
      );

      const statusSequence = taskStatusLogs.map((log) => log.taskStatus);
      expect(statusSequence).toEqual(['DOING', 'PAUSED', 'DOING', 'DONE']);

      // Check evolution of the in parallel task through logs
      const inParallelTaskStatusLogs = state.workflowLogs.filter(
        (log) =>
          log.logType === 'TaskStatusUpdate' &&
          log.task.description === inParallelTask.description
      );

      const inParallelTaskStatusSequence = inParallelTaskStatusLogs.map(
        (log) => log.taskStatus
      );
      expect(inParallelTaskStatusSequence).toEqual([
        'DOING',
        'PAUSED',
        'DOING',
        'DONE',
      ]);

      // Check no other task updates between PAUSED and DOING of intermediate task
      const { pausedIndex, nextDoingIndex } = checkNoTaskUpdatesBetween(
        state,
        intermediateTask,
        [inParallelTask.description]
      );

      // Check no other task updates between PAUSED and DOING of in parallel task
      const {
        pausedIndex: inParallelPausedIndex,
        nextDoingIndex: inParallelNextDoingIndex,
      } = checkNoTaskUpdatesBetween(state, inParallelTask, [
        intermediateTask.description,
      ]);

      // Verify thinking metadata consistency
      checkThinkingMetadataConsistency(
        state,
        intermediateTask,
        pausedIndex,
        nextDoingIndex
      );
      checkThinkingMetadataConsistency(
        state,
        inParallelTask,
        inParallelPausedIndex,
        inParallelNextDoingIndex
      );
    });

    it('should pause and resume last task correctly', async () => {
      const { team } = openAITeam;
      const workflowPromise = team.start();
      const store = team.useStore();
      let state = store.getState();

      const lastTaskIndex = state.tasks.length - 1;
      const lastTask = state.tasks[lastTaskIndex]; // finalizeInspectionAndApprovalTask

      // Wait for the last task to start working
      await new Promise((resolve) => {
        const unsubscribe = store.subscribe(
          (state) => state.workflowLogs,
          (logs) => {
            const hasAgentStarted = logs.some(
              (log) =>
                log.logType === 'AgentStatusUpdate' &&
                log.agent.name === lastTask.agent.name &&
                log.task.description === lastTask.description &&
                log.agentStatus === 'THINKING'
            );

            if (hasAgentStarted) {
              unsubscribe();
              resolve();
            }
          }
        );
      });

      // Pause workflow
      await team.pause();
      state = store.getState();
      expect(state.teamWorkflowStatus).toBe('PAUSED');
      expect(state.tasks[lastTaskIndex].status).toBe('PAUSED');
      expect(state.taskQueue.isPaused).toBe(true);

      // Resume workflow
      await team.resume();
      state = store.getState();
      expect(state.teamWorkflowStatus).toBe('RUNNING');
      expect(state.tasks[lastTaskIndex].status).toBe('DOING');
      expect(state.taskQueue.isPaused).toBe(false);

      // Complete workflow and verify logs
      await workflowPromise;
      state = store.getState();

      // Check evolution of the last task through logs
      const taskStatusLogs = state.workflowLogs.filter(
        (log) =>
          log.logType === 'TaskStatusUpdate' &&
          log.task.description === state.tasks[lastTaskIndex].description
      );

      const statusSequence = taskStatusLogs.map((log) => log.taskStatus);
      expect(statusSequence).toEqual(['DOING', 'PAUSED', 'DOING', 'DONE']);

      // Check no other task updates between PAUSED and DOING
      const { pausedIndex, nextDoingIndex } = checkNoTaskUpdatesBetween(
        state,
        state.tasks[lastTaskIndex],
        []
      );

      // Verify thinking metadata consistency
      checkThinkingMetadataConsistency(
        state,
        state.tasks[lastTaskIndex],
        pausedIndex,
        nextDoingIndex
      );
    });
  });

  describe('Stop', () => {
    beforeEach(() => {
      if (withMockedApis) {
        mock(openAITeamRecordedRequests, { delay: 100 });
      }
    });

    afterEach(() => {
      if (withMockedApis) {
        restoreAll();
      }
    });

    it('should stop workflow when no tasks have been completed', async () => {
      const { team } = openAITeam;
      team.start();
      const store = team.useStore();

      // Wait for the first task to start (event date selection)
      await new Promise((resolve) => {
        const unsubscribe = store.subscribe(
          (state) => state.workflowLogs,
          (logs) => {
            const hasStarted = logs.some(
              (log) =>
                log.logType === 'AgentStatusUpdate' &&
                log.agentStatus === 'THINKING'
            );
            if (hasStarted) {
              unsubscribe();
              resolve();
            }
          }
        );
      });

      await team.stop();
      const state = store.getState();

      // Check workflow status transitions
      const statusTransitions = state.workflowLogs
        .filter((log) => log.logType === 'WorkflowStatusUpdate')
        .map((log) => log.workflowStatus);
      expect(statusTransitions).toEqual(['RUNNING', 'STOPPING', 'STOPPED']);

      // Check all tasks are in TODO status
      state.tasks.forEach((task) => {
        expect(task.status).toBe('TODO');
      });

      // Check task queue state
      expect(state.taskQueue.isPaused).toBe(true);
      expect(state.teamWorkflowStatus).toBe('STOPPED');

      // Check no executions in progress
      const lastLog = state.workflowLogs[state.workflowLogs.length - 1];
      expect(lastLog.logType).toBe('WorkflowStatusUpdate');
      expect(lastLog.workflowStatus).toBe('STOPPED');
    });

    it('should stop workflow when intermediate and parallel tasks are executing', async () => {
      const { team } = openAITeam;
      team.start();
      const store = team.useStore();
      let state = store.getState();

      const intermediateTaskIndex = 2;
      const inParallelTaskIndex = 1;
      const intermediateTask = state.tasks[intermediateTaskIndex]; // finalizeGuestListTask
      const inParallelTask = state.tasks[inParallelTaskIndex]; // bookVenueTask

      // Wait for both guest list and marketing tasks to start
      await new Promise((resolve) => {
        const unsubscribe = store.subscribe(
          (state) => state.workflowLogs,
          (logs) => {
            const guestListStarted = logs.some(
              (log) =>
                log.logType === 'AgentStatusUpdate' &&
                log.agent.name === intermediateTask.agent.name &&
                log.task.description === intermediateTask.description &&
                log.agentStatus === 'THINKING'
            );
            const marketingStarted = logs.some(
              (log) =>
                log.logType === 'AgentStatusUpdate' &&
                log.agent.name === inParallelTask.agent.name &&
                log.task.description === inParallelTask.description &&
                log.agentStatus === 'THINKING'
            );
            if (guestListStarted && marketingStarted) {
              unsubscribe();
              resolve();
            }
          }
        );
      });

      await team.stop();
      state = store.getState();

      // Check workflow status transitions
      const statusTransitions = state.workflowLogs
        .filter((log) => log.logType === 'WorkflowStatusUpdate')
        .map((log) => log.workflowStatus);
      expect(statusTransitions).toEqual(['RUNNING', 'STOPPING', 'STOPPED']);

      // Check all tasks are reset to TODO
      state.tasks.forEach((task) => {
        expect(task.status).toBe('TODO');
      });

      // Check task queue state
      expect(state.taskQueue.isPaused).toBe(true);
      expect(state.teamWorkflowStatus).toBe('STOPPED');

      // Check no executions in progress
      const lastLog = state.workflowLogs[state.workflowLogs.length - 1];
      expect(lastLog.logType).toBe('WorkflowStatusUpdate');
      expect(lastLog.workflowStatus).toBe('STOPPED');
    });

    it('should stop workflow when last task is executing', async () => {
      const { team } = openAITeam;
      team.start();
      const store = team.useStore();
      let state = store.getState();

      const lastTaskIndex = state.tasks.length - 1;
      const lastTask = state.tasks[lastTaskIndex]; // finalizeInspectionAndApprovalTask

      // Wait for the final inspection task to start
      await new Promise((resolve) => {
        const unsubscribe = store.subscribe(
          (state) => state.workflowLogs,
          (logs) => {
            const lastTaskStarted = logs.some(
              (log) =>
                log.logType === 'AgentStatusUpdate' &&
                log.agent.name === lastTask.agent.name &&
                log.task.description === lastTask.description &&
                log.agentStatus === 'THINKING'
            );
            if (lastTaskStarted) {
              unsubscribe();
              resolve();
            }
          }
        );
      });

      await team.stop();
      state = store.getState();

      // Check workflow status transitions
      const statusTransitions = state.workflowLogs
        .filter((log) => log.logType === 'WorkflowStatusUpdate')
        .map((log) => log.workflowStatus);
      expect(statusTransitions).toEqual(['RUNNING', 'STOPPING', 'STOPPED']);

      // Check all tasks are reset to TODO
      state.tasks.forEach((task) => {
        expect(task.status).toBe('TODO');
      });

      // Check task queue state
      expect(state.taskQueue.isPaused).toBe(true);

      // check that the workflow is stopped
      expect(state.teamWorkflowStatus).toBe('STOPPED');

      // Check no executions in progress
      const lastLog = state.workflowLogs[state.workflowLogs.length - 1];
      expect(lastLog.logType).toBe('WorkflowStatusUpdate');
      expect(lastLog.workflowStatus).toBe('STOPPED');
    });
  });

  describe('Parallel Execution', () => {
    beforeEach(() => {
      if (withMockedApis) {
        mock(openAITeamRecordedRequests);
      }
    });

    afterEach(() => {
      if (withMockedApis) {
        restoreAll();
      }
    });

    it('executes parallel tasks simultaneously when dependencies are met', async () => {
      const openAITeamParallel = require('./examples/teams/event_planning/openai_parallel');
      const { team, tasks } = openAITeamParallel;

      // Start the workflow
      const workflowPromise = team.start();
      const store = team.useStore();

      // Wait for parallel tasks to start
      await new Promise((resolve) => {
        const unsubscribe = store.subscribe(
          (state) => state.workflowLogs,
          (logs) => {
            // Check if first task is completed and parallel tasks have started
            const firstTaskDone = logs.some(
              (log) =>
                log.logType === 'TaskStatusUpdate' &&
                log.task.id === tasks[0].id &&
                log.taskStatus === 'DONE'
            );

            const parallelTasksStarted =
              logs.filter(
                (log) =>
                  log.logType === 'TaskStatusUpdate' &&
                  log.taskStatus === 'DOING' &&
                  (log.task.id === tasks[1].id || log.task.id === tasks[2].id)
              ).length >= 2;

            if (firstTaskDone && parallelTasksStarted) {
              unsubscribe();
              resolve();
            }
          }
        );
      });

      // Get current state
      const state = store.getState();

      // Verify parallel tasks are in executingTasks
      const executingTaskIds = Array.from(state.executingTasks);
      expect(executingTaskIds).toContain(tasks[1].id); // bookVenueTask
      expect(executingTaskIds).toContain(tasks[2].id); // finalizeGuestListTask

      // Complete workflow
      await workflowPromise;
      const finalState = store.getState();
      const cleanedState = finalState.getCleanedState();

      // Verify workflow completed successfully
      expect(cleanedState.teamWorkflowStatus).toBe('FINISHED');

      // Get task status updates from workflow logs
      const taskStatusLogs = cleanedState.workflowLogs.filter(
        (log) => log.logType === 'TaskStatusUpdate'
      );

      // Verify parallel tasks started after their dependencies
      const taskStartTimes = {};
      taskStatusLogs.forEach((log) => {
        if (log.taskStatus === 'DOING') {
          taskStartTimes[log.task.id] = log.timestamp;
        }
      });

      // Verify bookVenueTask and finalizeGuestListTask started after selectEventDateTask
      expect(taskStartTimes[tasks[1].id]).toBeGreaterThan(
        taskStartTimes[tasks[0].id]
      );
      expect(taskStartTimes[tasks[2].id]).toBeGreaterThan(
        taskStartTimes[tasks[0].id]
      );

      // Verify parallel tasks were actually running simultaneously
      const parallelTaskLogs = taskStatusLogs.filter(
        (log) =>
          (log.task.id === tasks[1].id || log.task.id === tasks[2].id) &&
          log.taskStatus === 'DOING'
      );

      // Get timestamps when parallel tasks were running
      const parallelTaskTimestamps = parallelTaskLogs.map(
        (log) => log.timestamp
      );
      const timestampDiff = Math.abs(
        parallelTaskTimestamps[1] - parallelTaskTimestamps[0]
      );

      // Verify timestamps are close together (within 1 second)
      expect(timestampDiff).toBeLessThan(1000);

      // Verify executingTasks and pendingTasks are not in cleaned state
      expect(cleanedState).not.toHaveProperty('executingTasks');
      expect(cleanedState).not.toHaveProperty('pendingTasks');

      // Verify final state
      expect(finalState.executingTasks.size).toBe(0);
      expect(finalState.pendingTasks.size).toBe(0);
    });

    it('respects priority order for non-parallel tasks', async () => {
      const openAITeamMixed = require('./examples/teams/event_planning/openai_mixed');
      const { team, tasks } = openAITeamMixed;

      // Start the workflow
      const workflowPromise = team.start();
      const store = team.useStore();

      // Wait for first task to complete and parallel tasks to start executing
      await new Promise((resolve) => {
        const unsubscribe = store.subscribe(
          (state) => state.workflowLogs,
          (logs) => {
            // Check if first task is completed
            const firstTaskDone = logs.some(
              (log) =>
                log.logType === 'TaskStatusUpdate' &&
                log.task.id === tasks[0].id &&
                log.taskStatus === 'DONE'
            );

            // Check if parallel tasks have started
            const task1Started = logs.some(
              (log) =>
                log.logType === 'TaskStatusUpdate' &&
                log.task.id === tasks[1].id &&
                log.taskStatus === 'DOING'
            );

            const task3Started = logs.some(
              (log) =>
                log.logType === 'TaskStatusUpdate' &&
                log.task.id === tasks[3].id &&
                log.taskStatus === 'DOING'
            );

            if (firstTaskDone && task1Started && task3Started) {
              unsubscribe();
              resolve();
            }
          }
        );
      });

      // Get current state
      const state = store.getState();

      // verify the workflow is running
      // this validates the subscription is working
      expect(state.teamWorkflowStatus).toBe('RUNNING');

      // Get task status logs
      const taskStatusLogs = state.workflowLogs.filter(
        (log) => log.logType === 'TaskStatusUpdate'
      );

      // Get timestamps for key events
      const firstTaskDoneLog = taskStatusLogs.find(
        (log) => log.task.id === tasks[0].id && log.taskStatus === 'DONE'
      );

      const task1StartLog = taskStatusLogs.find(
        (log) => log.task.id === tasks[1].id && log.taskStatus === 'DOING'
      );

      const task3StartLog = taskStatusLogs.find(
        (log) => log.task.id === tasks[3].id && log.taskStatus === 'DOING'
      );

      // Verify parallel tasks started after first task completed
      expect(task1StartLog.timestamp).toBeGreaterThan(
        firstTaskDoneLog.timestamp
      );
      expect(task3StartLog.timestamp).toBeGreaterThan(
        firstTaskDoneLog.timestamp
      );

      // Verify parallel tasks started at approximately the same time
      const startTimeDiff = Math.abs(
        task1StartLog.timestamp - task3StartLog.timestamp
      );
      expect(startTimeDiff).toBeLessThan(1000); // Within 1 second

      // Verify parallel tasks are in executingTasks
      const executingTaskIds = Array.from(state.executingTasks);
      expect(executingTaskIds).toContain(tasks[1].id);
      expect(executingTaskIds).toContain(tasks[3].id);

      // Verify non-parallel task is in pendingTasks and not in executingTasks
      const pendingTaskIds = Array.from(state.pendingTasks);
      expect(pendingTaskIds).toContain(tasks[2].id);
      expect(executingTaskIds).not.toContain(tasks[2].id);

      // Complete workflow
      await workflowPromise;
      const finalState = store.getState();
      const cleanedState = finalState.getCleanedState();

      // Verify workflow completed successfully
      expect(cleanedState.teamWorkflowStatus).toBe('FINISHED');

      // Verify all task dependencies were respected
      const taskCompletionOrder = taskStatusLogs
        .filter((log) => log.taskStatus === 'DONE')
        .map((log) => log.task.id);

      tasks.forEach((task) => {
        if (task.dependencies) {
          const taskIndex = taskCompletionOrder.indexOf(task.id);
          task.dependencies.forEach((depId) => {
            const depIndex = taskCompletionOrder.indexOf(depId);
            // eslint-disable-next-line jest/no-conditional-expect
            expect(depIndex).toBeLessThan(taskIndex);
          });
        }
      });

      // Verify executingTasks and pendingTasks are not in cleaned state
      expect(cleanedState).not.toHaveProperty('executingTasks');
      expect(cleanedState).not.toHaveProperty('pendingTasks');

      // Verify final state
      expect(finalState.executingTasks.size).toBe(0);
      expect(finalState.pendingTasks.size).toBe(0);
    });
  });
});
