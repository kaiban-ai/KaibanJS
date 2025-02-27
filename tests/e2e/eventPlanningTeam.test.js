require('dotenv').config({ path: './.env.local' });
const fs = require('fs');
const path = require('path');

// Setup mock
const { mock, restoreAll } = require('../utils/moscaFetch')();
// const { record, getRecords, saveRecords } = require('../utils/moscaFetch')();

// Determine if mocks should be applied based on the environment
const withMockedApis =
  process.env.TEST_ENV === 'mocked-llm-apis' ? true : false;

// Helper functions
const validateTaskExecution = (workflowLogs, tasks, taskIdsToDescriptions) => {
  // Get task status updates from workflow logs
  const taskStatusLogs = workflowLogs.filter(
    (log) => log.logType === 'TaskStatusUpdate'
  );

  // Verify each task followed the correct status sequence
  tasks.forEach((task) => {
    const statusHistory = taskStatusLogs
      .filter(
        (log) =>
          log.task.description === task.description &&
          log.logType === 'TaskStatusUpdate'
      )
      .map((log) => log.taskStatus);
    expect(statusHistory).toEqual(
      ['DOING', 'DONE'],
      `Task "${task.description}" did not follow the expected status sequence`
    );
  });

  // Get completion order with log indices
  const taskCompletionOrder = taskStatusLogs
    .filter((log) => log.taskStatus === 'DONE')
    .map((log, index) => ({
      referenceId: log.task.referenceId,
      description: log.task.description,
      logIndex: index,
    }));

  // Verify dependencies were completed before dependent tasks
  tasks.forEach((task) => {
    if (task.dependencies && task.dependencies.length > 0) {
      const taskCompletion = taskCompletionOrder.find(
        (t) => t.description === task.description
      );
      task.dependencies.forEach((depId) => {
        const depCompletion = taskCompletionOrder.find(
          (t) => t.description === taskIdsToDescriptions[depId]
        );
        expect(depCompletion).toBeDefined();
        expect(depCompletion.logIndex).toBeLessThan(taskCompletion.logIndex);
      });
    }
  });

  return taskCompletionOrder;
};

const validateParallelExecution = (workflowLogs) => {
  const concurrentTasks = new Set();
  let maxConcurrentTasks = 0;

  workflowLogs
    .filter((log) => log.logType === 'TaskStatusUpdate')
    .forEach((log) => {
      if (log.taskStatus === 'DOING') {
        concurrentTasks.add(log.task.description);
      } else if (log.taskStatus === 'DONE') {
        concurrentTasks.delete(log.task.description);
      }
      maxConcurrentTasks = Math.max(maxConcurrentTasks, concurrentTasks.size);
    });

  return maxConcurrentTasks;
};

const verifySnapshots = ({
  storeFinalState,
  taskDefinitions,
  fileName,
  verifyFullMatch = false,
}) => {
  const snapshotName = `eventPlanningTeam-${fileName}.test.json`;
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
  const logsExistInBoth = storeFinalState.workflowLogs.every((currentLog) => {
    const logExists = snapshotContentObj.workflowLogs.some((snapshotLog) => {
      const currentLogStr = JSON.stringify(currentLog);
      const snapshotLogStr = JSON.stringify(snapshotLog);

      return currentLogStr === snapshotLogStr;
    });

    if (!logExists) {
      console.log(currentLog);
    }

    return logExists;
  });
  expect(logsExistInBoth).toBe(true);

  // Verify task definitions match the logs
  const taskLogs = storeFinalState.workflowLogs.filter(
    (log) => log.logType === 'TaskStatusUpdate'
  );

  taskDefinitions.forEach((task) => {
    const taskLogsForDefinition = taskLogs.filter(
      (log) => log.task.description === task.description
    );
    expect(taskLogsForDefinition.length).toBeGreaterThan(0);
  });

  if (verifyFullMatch) {
    expect(storeFinalStateStr).toEqual(snapshotContent);
  }
};

describe('Execution Strategies Integration Tests', () => {
  describe('Sequential Execution (openai.js)', () => {
    let sequentialTeam;
    let sequentialTeamRequests;
    beforeAll(() => {
      sequentialTeam = require('./examples/teams/event_planning/openai');
      sequentialTeamRequests = require('./examples/teams/event_planning/openai.requests.json');

      // record({
      //   url: '*',
      //   method: '*',
      //   body: '*', // Record any POST request to this URL
      // });
    });

    beforeEach(() => {
      if (withMockedApis) {
        mock(sequentialTeamRequests, { delay: 100 });
      }
    });

    afterEach(() => {
      if (withMockedApis) {
        restoreAll();
      }
    });

    it('executes tasks in correct sequential order with proper dependencies', async () => {
      await sequentialTeam.team.start();
      const store = sequentialTeam.team.useStore();
      const finalState = store.getState();
      const cleanedState = finalState.getCleanedState();

      // const recordedData = getRecords();
      // console.log(recordedData);
      // saveRecords();

      // Verify workflow completed successfully
      expect(cleanedState.teamWorkflowStatus).toBe('FINISHED');

      // create mapping between task referenceIds and task descriptions
      const taskRefIdToDescription = sequentialTeam.tasks.reduce(
        (acc, task) => {
          acc[task.referenceId] = task.description;
          return acc;
        },
        {}
      );

      // Validate task execution order and dependencies
      validateTaskExecution(
        cleanedState.workflowLogs,
        sequentialTeam.tasks,
        taskRefIdToDescription
      );

      // Verify maximum concurrent tasks is 1 for sequential execution
      const maxConcurrent = validateParallelExecution(
        cleanedState.workflowLogs
      );
      expect(maxConcurrent).toBe(1);

      // Verify first task started first
      const firstTaskLog = cleanedState.workflowLogs.find(
        (log) =>
          log.logType === 'TaskStatusUpdate' && log.taskStatus === 'DOING'
      );
      expect(firstTaskLog.task.description).toBe(
        sequentialTeam.tasks[0].description
      );

      // verify snapshots
      verifySnapshots({
        storeFinalState: cleanedState,
        taskDefinitions: sequentialTeam.tasks,
        fileName: 'sequential',
        verifyFullMatch: true,
      });
    });
  });

  describe('Parallel Execution (openai_parallel.js)', () => {
    let parallelTeam;
    let parallelTeamRequests;
    beforeAll(() => {
      parallelTeam = require('./examples/teams/event_planning/openai_parallel');
      parallelTeamRequests = require('./examples/teams/event_planning/openai_parallel.requests.json');

      // record({
      //   url: '*',
      //   method: '*',
      //   body: '*', // Record any POST request to this URL
      // });
    });

    beforeEach(() => {
      if (withMockedApis) {
        mock(parallelTeamRequests, { delay: 100 });
      }
    });

    afterEach(() => {
      if (withMockedApis) {
        restoreAll();
      }
    });

    it('executes tasks in parallel when possible while respecting dependencies', async () => {
      await parallelTeam.team.start();
      const store = parallelTeam.team.useStore();
      const finalState = store.getState();
      const cleanedState = finalState.getCleanedState();

      // const recordedData = getRecords();
      // console.log(recordedData);
      // saveRecords();

      // Verify workflow completed successfully
      expect(cleanedState.teamWorkflowStatus).toBe('FINISHED');

      // create mapping between task referenceIds and task descriptions
      const taskRefIdToDescription = parallelTeam.tasks.reduce((acc, task) => {
        acc[task.referenceId] = task.description;
        return acc;
      }, {});

      // Validate task execution order and dependencies
      validateTaskExecution(
        cleanedState.workflowLogs,
        parallelTeam.tasks,
        taskRefIdToDescription
      );

      // Verify parallel execution occurred
      const maxConcurrent = validateParallelExecution(
        cleanedState.workflowLogs
      );
      expect(maxConcurrent).toBeGreaterThan(1);

      // Verify parallel tasks after selectEventDateTask executed concurrently
      const bookVenueStartIndex = cleanedState.workflowLogs.findIndex(
        (log) =>
          log.logType === 'TaskStatusUpdate' &&
          log.taskStatus === 'DOING' &&
          log.task.description === taskRefIdToDescription['bookVenueTask']
      );
      const bookVenueEndIndex = cleanedState.workflowLogs.findIndex(
        (log) =>
          log.logType === 'TaskStatusUpdate' &&
          log.taskStatus === 'DONE' &&
          log.task.description === taskRefIdToDescription['bookVenueTask']
      );
      const finalizeGuestListStartIndex = cleanedState.workflowLogs.findIndex(
        (log) =>
          log.logType === 'TaskStatusUpdate' &&
          log.taskStatus === 'DOING' &&
          log.task.description ===
            taskRefIdToDescription['finalizeGuestListTask']
      );
      const finalizeGuestListEndIndex = cleanedState.workflowLogs.findIndex(
        (log) =>
          log.logType === 'TaskStatusUpdate' &&
          log.taskStatus === 'DONE' &&
          log.task.description ===
            taskRefIdToDescription['finalizeGuestListTask']
      );

      // Verify tasks started within a small number of log entries of each other
      expect(
        Math.abs(bookVenueStartIndex - finalizeGuestListStartIndex)
      ).toBeLessThan(3);

      // Verify tasks were running concurrently
      expect(bookVenueStartIndex).toBeLessThan(finalizeGuestListEndIndex);
      expect(finalizeGuestListStartIndex).toBeLessThan(bookVenueEndIndex);

      // Match snapshot
      verifySnapshots({
        storeFinalState: cleanedState,
        taskDefinitions: parallelTeam.tasks,
        fileName: 'parallel',
        verifyFullMatch: false,
      });
    });
  });

  describe('Mixed Execution (openai_mixed.js)', () => {
    let mixedTeam;
    let mixedTeamRequests;
    beforeAll(() => {
      mixedTeam = require('./examples/teams/event_planning/openai_mixed');
      mixedTeamRequests = require('./examples/teams/event_planning/openai_mixed.requests.json');

      // record({
      //   url: '*',
      //   method: '*',
      //   body: '*', // Record any POST request to this URL
      // });
    });

    beforeEach(() => {
      if (withMockedApis) {
        mock(mixedTeamRequests, { delay: 100 });
      }
    });

    afterEach(() => {
      if (withMockedApis) {
        restoreAll();
      }
    });

    it('executes tasks respecting both sequential and parallel constraints', async () => {
      await mixedTeam.team.start();
      const store = mixedTeam.team.useStore();
      const finalState = store.getState();
      const cleanedState = finalState.getCleanedState();

      // const recordedData = getRecords();
      // console.log(recordedData);
      // saveRecords();

      // Verify workflow completed successfully
      expect(cleanedState.teamWorkflowStatus).toBe('FINISHED');

      // create mapping between task referenceIds and task descriptions
      const taskRefIdToDescription = mixedTeam.tasks.reduce((acc, task) => {
        acc[task.referenceId] = task.description;
        return acc;
      }, {});

      // Validate task execution order and dependencies
      validateTaskExecution(
        cleanedState.workflowLogs,
        mixedTeam.tasks,
        taskRefIdToDescription
      );

      // Verify mixed execution pattern
      const maxConcurrent = validateParallelExecution(
        cleanedState.workflowLogs
      );
      expect(maxConcurrent).toBeGreaterThan(1);

      // Verify non-parallel tasks executed sequentially
      const nonParallelTasks = mixedTeam.tasks.filter(
        (t) => !t.allowParallelExecution
      );
      nonParallelTasks.forEach((task, index) => {
        if (index === 0) {
          return;
        }

        // get logIndex for TaskStatusUpdate log for current task
        const currentTaskStartIndex = cleanedState.workflowLogs.findIndex(
          (log) =>
            log.logType === 'TaskStatusUpdate' &&
            log.taskStatus === 'DOING' &&
            log.task.description === task.description
        );

        const previousTaskEndIndex = cleanedState.workflowLogs.findIndex(
          (log) =>
            log.logType === 'TaskStatusUpdate' &&
            log.taskStatus === 'DONE' &&
            log.task.description === nonParallelTasks[index - 1].description
        );
        expect(currentTaskStartIndex).toBeGreaterThan(
          previousTaskEndIndex,
          `Task "${task.description}" did not start after task "${
            nonParallelTasks[index - 1].description
          }"`
        );
      });

      // check bookVenueTask and finalizeGuestListTask are executed in parallel
      const bookVenueStartIndex = cleanedState.workflowLogs.findIndex(
        (log) =>
          log.logType === 'TaskStatusUpdate' &&
          log.taskStatus === 'DOING' &&
          log.task.description === taskRefIdToDescription['bookVenueTask']
      );
      const bookVenueEndIndex = cleanedState.workflowLogs.findIndex(
        (log) =>
          log.logType === 'TaskStatusUpdate' &&
          log.taskStatus === 'DONE' &&
          log.task.description === taskRefIdToDescription['bookVenueTask']
      );
      const finalizeGuestListStartIndex = cleanedState.workflowLogs.findIndex(
        (log) =>
          log.logType === 'TaskStatusUpdate' &&
          log.taskStatus === 'DOING' &&
          log.task.description ===
            taskRefIdToDescription['finalizeGuestListTask']
      );
      const finalizeGuestListEndIndex = cleanedState.workflowLogs.findIndex(
        (log) =>
          log.logType === 'TaskStatusUpdate' &&
          log.taskStatus === 'DONE' &&
          log.task.description ===
            taskRefIdToDescription['finalizeGuestListTask']
      );

      expect(bookVenueStartIndex).toBeLessThan(finalizeGuestListEndIndex);
      expect(finalizeGuestListStartIndex).toBeLessThan(bookVenueEndIndex);

      // check prepareEventBudgetTask is executed after bookVenueTask
      const prepareEventBudgetStartIndex = cleanedState.workflowLogs.findIndex(
        (log) =>
          log.logType === 'TaskStatusUpdate' &&
          log.taskStatus === 'DOING' &&
          log.task.description ===
            taskRefIdToDescription['prepareEventBudgetTask']
      );
      expect(prepareEventBudgetStartIndex).toBeGreaterThan(bookVenueEndIndex);

      verifySnapshots({
        storeFinalState: cleanedState,
        taskDefinitions: mixedTeam.tasks,
        fileName: 'mixed',
        verifyFullMatch: false,
      });
    });
  });

  describe('Pause-Resume', () => {
    let mixedTeam;
    let mixedTeamRequests;
    beforeAll(() => {
      mixedTeam = require('./examples/teams/event_planning/openai_mixed');
      mixedTeamRequests = require('./examples/teams/event_planning/openai_mixed.requests.json');

      //   record({
      //   url: '*',
      //   method: '*',
      //   body: '*', // Record any POST request to this URL
      // });
    });

    beforeEach(() => {
      if (withMockedApis) {
        mock(mixedTeamRequests, { delay: 100 });
      }
    });

    afterEach(() => {
      if (withMockedApis) {
        restoreAll();
      }
    });

    it('should correctly pause and resume parallel tasks', async () => {
      const team = mixedTeam.team;
      const store = team.getStore();

      // Start workflow
      const workflowPromise = team.start();

      // Wait for parallel tasks (bookVenue and finalizeGuestList) to start
      await new Promise((resolve) => {
        const unsubscribe = store.subscribe(
          (state) => state.tasks,
          (tasks) => {
            const bookVenueTask = tasks.find(
              (t) => t.referenceId === 'bookVenueTask'
            );
            const finalizeGuestListTask = tasks.find(
              (t) => t.referenceId === 'finalizeGuestListTask'
            );
            const selectEventDateTask = tasks.find(
              (t) => t.referenceId === 'selectEventDateTask'
            );

            if (
              bookVenueTask?.status === 'DOING' &&
              finalizeGuestListTask?.status === 'DOING' &&
              selectEventDateTask?.status === 'DONE'
            ) {
              unsubscribe();
              resolve();
            }
          }
        );
      });

      // Pause workflow
      await team.pause();
      let state = store.getState();

      // 1.2 Check task statuses
      const tasksAfterPause = state.tasks;
      const bookVenueTask = tasksAfterPause.find(
        (t) => t.referenceId === 'bookVenueTask'
      );
      const finalizeGuestListTask = tasksAfterPause.find(
        (t) => t.referenceId === 'finalizeGuestListTask'
      );
      const selectEventDateTask = tasksAfterPause.find(
        (t) => t.referenceId === 'selectEventDateTask'
      );
      const otherTasks = tasksAfterPause.filter(
        (t) =>
          ![
            'bookVenueTask',
            'finalizeGuestListTask',
            'selectEventDateTask',
          ].includes(t.referenceId)
      );

      expect(bookVenueTask.status).toBe('PAUSED');
      expect(finalizeGuestListTask.status).toBe('PAUSED');
      expect(selectEventDateTask.status).toBe('DONE');
      expect(otherTasks.every((t) => t.status === 'TODO')).toBe(true);

      // 1.3 Check workflow status
      expect(state.teamWorkflowStatus).toBe('PAUSED');

      // Store the last task status update log index before resuming
      const lastLogIndexBeforeResume = state.workflowLogs.reduce(
        (maxIndex, log, index) => {
          return log.logType === 'TaskStatusUpdate' ? index : maxIndex;
        },
        -1
      );

      // 1.4 Resume execution
      await team.resume();
      state = store.getState();

      // 1.5 Check workflow status is RUNNING
      expect(state.teamWorkflowStatus).toBe('RUNNING');

      // 1.6 Check previously paused tasks are now DOING
      const tasksAfterResume = state.tasks;
      const bookVenueTaskAfterResume = tasksAfterResume.find(
        (t) => t.referenceId === 'bookVenueTask'
      );
      const finalizeGuestListTaskAfterResume = tasksAfterResume.find(
        (t) => t.referenceId === 'finalizeGuestListTask'
      );

      expect(bookVenueTaskAfterResume.status).toBe('DOING');
      expect(finalizeGuestListTaskAfterResume.status).toBe('DOING');

      // 1.7 Wait for workflow to finish
      await workflowPromise;
      state = store.getState();

      // 1.8 Check status sequence for paused tasks
      const bookVenueStatusUpdates = state.workflowLogs
        .filter(
          (log) =>
            log.logType === 'TaskStatusUpdate' &&
            log.task.referenceId === 'bookVenueTask'
        )
        .map((log) => log.taskStatus);

      const finalizeGuestListStatusUpdates = state.workflowLogs
        .filter(
          (log) =>
            log.logType === 'TaskStatusUpdate' &&
            log.task.referenceId === 'finalizeGuestListTask'
        )
        .map((log) => log.taskStatus);

      expect(bookVenueStatusUpdates).toEqual([
        'DOING',
        'PAUSED',
        'RESUMED',
        'DOING',
        'DONE',
      ]);
      expect(finalizeGuestListStatusUpdates).toEqual([
        'DOING',
        'PAUSED',
        'RESUMED',
        'DOING',
        'DONE',
      ]);

      // 1.9 Check no task status updates during pause
      const changeToDoingAfterPause =
        state.workflowLogs
          .slice(lastLogIndexBeforeResume + 1)
          .findIndex(
            (log) =>
              log.logType === 'TaskStatusUpdate' &&
              (log.task.referenceId === 'bookVenueTask' ||
                log.task.referenceId === 'finalizeGuestListTask') &&
              (log.taskStatus === 'DOING' || log.taskStatus === 'RESUMED')
          ) +
        lastLogIndexBeforeResume +
        1;

      expect(changeToDoingAfterPause).toBeGreaterThan(lastLogIndexBeforeResume);

      // there should be no task update status logs between lastLogIndexBeforeResume and changeToDoingAfterPause
      const logsBetweenPauseAndResume = state.workflowLogs
        .slice(lastLogIndexBeforeResume + 1, changeToDoingAfterPause)
        .filter((log) => log.logType === 'TaskStatusUpdate');

      expect(logsBetweenPauseAndResume.length).toBe(0);

      // 1.10 Check final workflow status
      expect(state.tasks.every((task) => task.status === 'DONE')).toBe(true);
      expect(state.teamWorkflowStatus).toBe('FINISHED');
    });
  });

  describe('Stop', () => {
    let mixedTeam;
    let mixedTeamRequests;

    beforeEach(() => {
      mixedTeam = require('./examples/teams/event_planning/openai_mixed');
      mixedTeamRequests = require('./examples/teams/event_planning/openai_mixed.requests.json');

      if (withMockedApis) {
        mock(mixedTeamRequests, { delay: 100 });
      }
    });

    afterEach(() => {
      if (withMockedApis) {
        restoreAll();
      }
    });

    it('should stop workflow and reset task states', async () => {
      const team = mixedTeam.team;
      const store = team.getStore();

      // Start workflow
      team.start();

      // Wait for first task to start
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

      // Stop workflow
      await team.stop();
      const state = store.getState();

      // Verify stop state
      expect(state.teamWorkflowStatus).toBe('STOPPED');
      expect(state.tasks.every((task) => task.status === 'TODO')).toBe(true);

      // Verify workflow status transitions in logs
      const statusTransitions = state.workflowLogs
        .filter((log) => log.logType === 'WorkflowStatusUpdate')
        .map((log) => log.workflowStatus);
      expect(statusTransitions).toEqual(['RUNNING', 'STOPPING', 'STOPPED']);
    });

    it('should stop workflow during parallel task execution', async () => {
      const team = mixedTeam.team;
      const store = team.getStore();

      // Start workflow
      team.start();

      const taskRefIdToDescription = mixedTeam.tasks.reduce((acc, task) => {
        acc[task.referenceId] = task.description;
        return acc;
      }, {});

      // Wait for parallel tasks to start
      await new Promise((resolve) => {
        const unsubscribe = store.subscribe(
          (state) => state.workflowLogs,
          (logs) => {
            const selectEventDateDone = logs.some(
              (log) =>
                log.logType === 'TaskStatusUpdate' &&
                log.taskStatus === 'DONE' &&
                log.task.description ===
                  taskRefIdToDescription['selectEventDateTask']
            );
            const parallelTasksStarted = logs.some(
              (log) =>
                log.logType === 'AgentStatusUpdate' &&
                log.agentStatus === 'THINKING' &&
                (log.task.description ===
                  taskRefIdToDescription['bookVenueTask'] ||
                  log.task.description ===
                    taskRefIdToDescription['finalizeGuestListTask'])
            );
            if (selectEventDateDone && parallelTasksStarted) {
              unsubscribe();
              resolve();
            }
          }
        );
      });

      // Stop workflow
      await team.stop();
      const state = store.getState();

      // Verify stop state
      expect(state.teamWorkflowStatus).toBe('STOPPED');

      // Check all tasks are in TODO status except the first one
      expect(state.tasks[0].status).toBe('DONE');
      state.tasks.slice(1).forEach((task) => {
        expect(task.status).toBe('TODO');
      });

      // Verify workflow status transitions in logs
      const statusTransitions = state.workflowLogs
        .filter((log) => log.logType === 'WorkflowStatusUpdate')
        .map((log) => log.workflowStatus);
      expect(statusTransitions).toEqual(['RUNNING', 'STOPPING', 'STOPPED']);
    });
  });
});
