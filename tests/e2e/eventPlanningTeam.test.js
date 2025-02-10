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
    expect(statusHistory).toEqual(['DOING', 'DONE']);
  });

  // Get completion order with log indices
  const taskCompletionOrder = taskStatusLogs
    .filter((log) => log.taskStatus === 'DONE')
    .map((log, index) => ({
      id: log.task.id,
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
  const logsExistInBoth = storeFinalState.workflowLogs.every((currentLog) =>
    snapshotContentObj.workflowLogs.some(
      (snapshotLog) =>
        JSON.stringify(currentLog) === JSON.stringify(snapshotLog)
    )
  );
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

      // Verify workflow completed successfully
      expect(cleanedState.teamWorkflowStatus).toBe('FINISHED');

      // create mapping between task ids and task descriptions
      const taskIdToDescription = sequentialTeam.tasks.reduce((acc, task) => {
        acc[task.id] = task.description;
        return acc;
      }, {});

      // Validate task execution order and dependencies
      validateTaskExecution(
        cleanedState.workflowLogs,
        sequentialTeam.tasks,
        taskIdToDescription
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

      // const recordedData = getRecords();
      // console.log(recordedData);
      // saveRecords();
    });
  });

  describe('Parallel Execution (openai_parallel.js)', () => {
    let parallelTeam;
    let parallelTeamRequests;
    beforeAll(() => {
      parallelTeam = require('./examples/teams/event_planning/openai_parallel');
      parallelTeamRequests = require('./examples/teams/event_planning/openai_parallel.requests.json');

      //   record({
      //     url: '*',
      //     method: '*',
      //     body: '*', // Record any POST request to this URL
      //   });
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

      // create mapping between task ids and task descriptions
      const taskIdToDescription = parallelTeam.tasks.reduce((acc, task) => {
        acc[task.id] = task.description;
        return acc;
      }, {});

      // Validate task execution order and dependencies
      validateTaskExecution(
        cleanedState.workflowLogs,
        parallelTeam.tasks,
        taskIdToDescription
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
          log.task.description === taskIdToDescription['bookVenueTask']
      );
      const bookVenueEndIndex = cleanedState.workflowLogs.findIndex(
        (log) =>
          log.logType === 'TaskStatusUpdate' &&
          log.taskStatus === 'DONE' &&
          log.task.description === taskIdToDescription['bookVenueTask']
      );
      const finalizeGuestListStartIndex = cleanedState.workflowLogs.findIndex(
        (log) =>
          log.logType === 'TaskStatusUpdate' &&
          log.taskStatus === 'DOING' &&
          log.task.description === taskIdToDescription['finalizeGuestListTask']
      );
      const finalizeGuestListEndIndex = cleanedState.workflowLogs.findIndex(
        (log) =>
          log.logType === 'TaskStatusUpdate' &&
          log.taskStatus === 'DONE' &&
          log.task.description === taskIdToDescription['finalizeGuestListTask']
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

      // create mapping between task ids and task descriptions
      const taskIdToDescription = mixedTeam.tasks.reduce((acc, task) => {
        acc[task.id] = task.description;
        return acc;
      }, {});

      // Validate task execution order and dependencies
      validateTaskExecution(
        cleanedState.workflowLogs,
        mixedTeam.tasks,
        taskIdToDescription
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
        expect(currentTaskStartIndex).toBeGreaterThan(previousTaskEndIndex);
      });

      // check bookVenueTask and finalizeGuestListTask are executed in parallel
      const bookVenueStartIndex = cleanedState.workflowLogs.findIndex(
        (log) =>
          log.logType === 'TaskStatusUpdate' &&
          log.taskStatus === 'DOING' &&
          log.task.description === taskIdToDescription['bookVenueTask']
      );
      const bookVenueEndIndex = cleanedState.workflowLogs.findIndex(
        (log) =>
          log.logType === 'TaskStatusUpdate' &&
          log.taskStatus === 'DONE' &&
          log.task.description === taskIdToDescription['bookVenueTask']
      );
      const finalizeGuestListStartIndex = cleanedState.workflowLogs.findIndex(
        (log) =>
          log.logType === 'TaskStatusUpdate' &&
          log.taskStatus === 'DOING' &&
          log.task.description === taskIdToDescription['finalizeGuestListTask']
      );
      const finalizeGuestListEndIndex = cleanedState.workflowLogs.findIndex(
        (log) =>
          log.logType === 'TaskStatusUpdate' &&
          log.taskStatus === 'DONE' &&
          log.task.description === taskIdToDescription['finalizeGuestListTask']
      );

      expect(bookVenueStartIndex).toBeLessThan(finalizeGuestListEndIndex);
      expect(finalizeGuestListStartIndex).toBeLessThan(bookVenueEndIndex);

      // check prepareEventBudgetTask is executed after bookVenueTask
      const prepareEventBudgetStartIndex = cleanedState.workflowLogs.findIndex(
        (log) =>
          log.logType === 'TaskStatusUpdate' &&
          log.taskStatus === 'DOING' &&
          log.task.description === taskIdToDescription['prepareEventBudgetTask']
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

  describe.skip('Pause-Resume', () => {
    // TODO: Implement pause-resume tests
  });

  describe.skip('Stop', () => {
    // TODO: Implement stop tests
  });
});
