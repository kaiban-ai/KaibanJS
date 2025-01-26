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

    it('completes the entire workflow successfully', async () => {
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
});
