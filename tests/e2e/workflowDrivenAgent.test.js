require('dotenv').config({ path: './.env.local' });
// Setup mock
const { mock, restoreAll, cleanSnapshotForComparison } =
  require('../utils/moscaFetch')();
// const { record, getRecords, saveRecords } = require('../utils/moscaFetch')();

// Determine if mocks should be applied based on the environment
const withMockedApis =
  process.env.TEST_ENV === 'mocked-llm-apis' ? true : false;

describe('WorkflowDrivenAgent E2E Tests', () => {
  describe('Basic Workflow Execution', () => {
    let _fetchSpy;

    beforeEach(() => {
      _fetchSpy = jest.spyOn(global, 'fetch');
    });

    afterEach(() => {
      if (withMockedApis) {
        restoreAll();
      }
      jest.restoreAllMocks();
    });

    it('should execute a simple workflow successfully', async () => {
      const basicWorkflowTeam = require('./examples/teams/workflow_driven/basicWorkflow');
      const basicWorkflowTeamRecordedRequests = require('./examples/teams/workflow_driven/basicWorkflow.requests.json');

      if (withMockedApis) {
        mock(basicWorkflowTeamRecordedRequests);
      }

      const result = await basicWorkflowTeam.start({ a: 5, b: 3 });
      const store = basicWorkflowTeam.useStore();
      const state = store.getState().getCleanedState();

      // Verify successful execution
      expect(result.status).toBe('FINISHED');
      expect(result.result).toBe(8); // 5 + 3

      // Verify workflow logs
      const workflowLogs = state.workflowLogs;
      expect(workflowLogs.length).toBeGreaterThan(0);

      // Check for workflow execution logs
      const workflowExecutionLogs = workflowLogs.filter(
        (log) => log.logType === 'WorkflowAgentStatusUpdate'
      );
      expect(workflowExecutionLogs.length).toBeGreaterThan(0);

      // Verify task completion
      expect(state.tasks[0].status).toBe('DONE');
      expect(state.teamWorkflowStatus).toBe('FINISHED');

      // Match snapshot with cleaned dynamic values
      expect(cleanSnapshotForComparison(state)).toMatchSnapshot();
    });

    it('should handle workflow with multiple steps', async () => {
      const multiStepWorkflowTeam = require('./examples/teams/workflow_driven/multiStepWorkflow');
      const multiStepWorkflowTeamRecordedRequests = require('./examples/teams/workflow_driven/multiStepWorkflow.requests.json');

      if (withMockedApis) {
        mock(multiStepWorkflowTeamRecordedRequests);
      }

      const result = await multiStepWorkflowTeam.start({
        initialValue: 10,
        multiplier: 2,
      });
      const store = multiStepWorkflowTeam.useStore();
      const state = store.getState().getCleanedState();

      // Verify successful execution
      expect(result.status).toBe('FINISHED');
      expect(result.result).toBe(22); // (10 + 1) * 2

      // Verify workflow logs show step execution
      const workflowLogs = state.workflowLogs;
      const stepLogs = workflowLogs.filter(
        (log) =>
          log.logDescription.includes('started step:') ||
          log.logDescription.includes('completed step:')
      );
      expect(stepLogs.length).toBeGreaterThan(0);

      // Match snapshot with cleaned dynamic values
      expect(cleanSnapshotForComparison(state)).toMatchSnapshot();
    });
  });

  describe('Complex Workflow Patterns', () => {
    let _fetchSpy;

    beforeEach(() => {
      _fetchSpy = jest.spyOn(global, 'fetch');
    });

    afterEach(() => {
      if (withMockedApis) {
        restoreAll();
      }
      jest.restoreAllMocks();
    });

    it('should execute workflow with conditional branching', async () => {
      const conditionalWorkflowTeam = require('./examples/teams/workflow_driven/conditionalWorkflow');
      const conditionalWorkflowTeamRecordedRequests = require('./examples/teams/workflow_driven/conditionalWorkflow.requests.json');

      if (withMockedApis) {
        mock(conditionalWorkflowTeamRecordedRequests);
      }

      // Test even number path
      const evenResult = await conditionalWorkflowTeam.start({ number: 6 });
      expect(evenResult.status).toBe('FINISHED');
      expect(evenResult.result).toMatch(/even: \d+/);

      // Test odd number path
      const oddResult = await conditionalWorkflowTeam.start({ number: 7 });
      expect(oddResult.status).toBe('FINISHED');
      expect(oddResult.result).toMatch(/odd: \d+/);

      const store = conditionalWorkflowTeam.useStore();
      const state = store.getState().getCleanedState();
      expect(cleanSnapshotForComparison(state)).toMatchSnapshot();
    });

    it('should execute workflow with parallel execution', async () => {
      const parallelWorkflowTeam = require('./examples/teams/workflow_driven/parallelWorkflow');
      const parallelWorkflowTeamRecordedRequests = require('./examples/teams/workflow_driven/parallelWorkflow.requests.json');

      if (withMockedApis) {
        mock(parallelWorkflowTeamRecordedRequests);
      }

      const result = await parallelWorkflowTeam.start({
        value: 5,
      });
      console.log('result.result', result.result);

      const store = parallelWorkflowTeam.useStore();
      const state = store.getState().getCleanedState();

      // Verify successful execution
      expect(result.status).toBe('FINISHED');
      expect(typeof result.result).toBe('number');
      expect(result.result).toBe(25); // (5 * 2) + (5 * 3) = 10 + 15 = 25

      // Verify parallel execution logs
      const workflowLogs = state.workflowLogs;
      const parallelLogs = workflowLogs.filter(
        (log) =>
          log.logDescription.includes('parallel') ||
          log.logDescription.includes('concurrent')
      );
      expect(parallelLogs.length).toBeGreaterThan(0);

      expect(cleanSnapshotForComparison(state)).toMatchSnapshot();
    });
  });

  describe('Workflow Error Handling', () => {
    let _fetchSpy;

    beforeEach(() => {
      _fetchSpy = jest.spyOn(global, 'fetch');
    });

    afterEach(() => {
      if (withMockedApis) {
        restoreAll();
      }
      jest.restoreAllMocks();
    });

    it('should handle workflow execution errors gracefully', async () => {
      const errorWorkflowTeam = require('./examples/teams/workflow_driven/errorWorkflow');
      const errorWorkflowTeamRecordedRequests = require('./examples/teams/workflow_driven/errorWorkflow.requests.json');

      if (withMockedApis) {
        mock(errorWorkflowTeamRecordedRequests);
      }
      try {
        await errorWorkflowTeam.start({ shouldFail: true });
      } catch (_error) {
        //   console.log('error', error);
      }

      // const result = await errorWorkflowTeam.start({ shouldFail: true });

      const store = errorWorkflowTeam.useStore();
      const state = store.getState().getCleanedState();

      // Verify error handling

      // Verify error logs
      const workflowLogs = state.workflowLogs;
      const errorLogs = workflowLogs.filter(
        (log) =>
          log.logType === 'WorkflowAgentError' ||
          log.logDescription.includes('error')
      );
      expect(errorLogs.length).toBeGreaterThan(0);

      // Verify task status
      expect(state.tasks[0].status).toBe('BLOCKED');
      expect(state.teamWorkflowStatus).toBe('ERRORED');

      expect(cleanSnapshotForComparison(state)).toMatchSnapshot();
    });
  });

  //   describe('Mixed Agent Teams', () => {
  //     let _fetchSpy;

  //     beforeEach(() => {
  //       _fetchSpy = jest.spyOn(global, 'fetch');
  //     });

  //     afterEach(() => {
  //       if (withMockedApis) {
  //         restoreAll();
  //       }
  //       jest.restoreAllMocks();
  //     });

  //     it('should work with mixed WorkflowDrivenAgent and ReactChampionAgent teams', async () => {
  //       const mixedAgentTeam = require('./examples/teams/workflow_driven/mixedAgentTeam');
  //       const mixedAgentTeamRecordedRequests = require('./examples/teams/workflow_driven/mixedAgentTeam.requests.json');

  //       if (withMockedApis) {
  //         mock(mixedAgentTeamRecordedRequests);
  //       }

  //       const result = await mixedAgentTeam.start({
  //         data: 'test data',
  //         calculation: { a: 5, b: 3 },
  //       });
  //       const store = mixedAgentTeam.useStore();
  //       const state = store.getState().getCleanedState();

  //       // Verify successful execution
  //       expect(result.status).toBe('FINISHED');
  //       expect(result.result).toBeDefined();

  //       // Verify both agent types worked together
  //       const workflowLogs = state.workflowLogs;
  //       const workflowAgentLogs = workflowLogs.filter(
  //         (log) => log.agentType === 'WorkflowDrivenAgent'
  //       );
  //       const reactAgentLogs = workflowLogs.filter(
  //         (log) => log.agentType === 'ReactChampionAgent'
  //       );

  //       expect(workflowAgentLogs.length).toBeGreaterThan(0);
  //       expect(reactAgentLogs.length).toBeGreaterThan(0);

  //       // Verify all tasks completed
  //       expect(state.tasks.every((task) => task.status === 'DONE')).toBe(true);

  //       expect(cleanSnapshotForComparison(state)).toMatchSnapshot();
  //     });

  //     it('should handle task dependencies between different agent types', async () => {
  //       const dependentTasksTeam = require('./examples/teams/workflow_driven/dependentTasksTeam');
  //       const dependentTasksTeamRecordedRequests = require('./examples/teams/workflow_driven/dependentTasksTeam.requests.json');

  //       if (withMockedApis) {
  //         mock(dependentTasksTeamRecordedRequests);
  //       }

  //       const result = await dependentTasksTeam.start({
  //         input: 'process this data',
  //       });
  //       const store = dependentTasksTeam.useStore();
  //       const state = store.getState().getCleanedState();

  //       // Verify successful execution
  //       expect(result.status).toBe('FINISHED');

  //       // Verify task execution order
  //       const workflowLogs = state.workflowLogs;
  //       const taskStatusLogs = workflowLogs.filter(
  //         (log) => log.logType === 'TaskStatusUpdate'
  //       );

  //       // Find the order of task completions
  //       const taskCompletionOrder = taskStatusLogs
  //         .filter((log) => log.taskStatus === 'DONE')
  //         .map((log) => log.task.description);

  //       // Verify workflow task completed before ReactChampionAgent task
  //       const workflowTaskIndex = taskCompletionOrder.findIndex((desc) =>
  //         desc.includes('workflow')
  //       );
  //       const reactTaskIndex = taskCompletionOrder.findIndex((desc) =>
  //         desc.includes('ReactChampionAgent')
  //       );

  //       expect(workflowTaskIndex).toBeLessThan(reactTaskIndex);

  //       expect(cleanSnapshotForComparison(state)).toMatchSnapshot();
  //     });
  //   });

  describe('Workflow State Management', () => {
    let _fetchSpy;

    beforeEach(() => {
      _fetchSpy = jest.spyOn(global, 'fetch');
    });

    afterEach(() => {
      if (withMockedApis) {
        restoreAll();
      }
      jest.restoreAllMocks();
    });

    it('should maintain workflow state across executions', async () => {
      const statefulWorkflowTeam = require('./examples/teams/workflow_driven/statefulWorkflow');
      const statefulWorkflowTeamRecordedRequests = require('./examples/teams/workflow_driven/statefulWorkflow.requests.json');

      if (withMockedApis) {
        mock(statefulWorkflowTeamRecordedRequests);
      }

      // First execution
      const result1 = await statefulWorkflowTeam.start({ value: 5 });
      expect(result1.status).toBe('FINISHED');
      expect(result1.result).toBe(5); // 5 + 0

      // Second execution with state
      const result2 = await statefulWorkflowTeam.start({ value: 10 });
      expect(result2.status).toBe('FINISHED');
      expect(result2.result).toBe(10); // 5 + 5 (previous result)

      const store = statefulWorkflowTeam.useStore();
      const state = store.getState().getCleanedState();

      // Verify state persistence
      const workflowLogs = state.workflowLogs;
      const stateLogs = workflowLogs.filter(
        (log) =>
          log.logDescription.includes('state') ||
          log.logDescription.includes('context')
      );
      expect(stateLogs.length).toBeGreaterThan(0);

      expect(cleanSnapshotForComparison(state)).toMatchSnapshot();
    });
  });

  //   describe('Workflow Performance and Monitoring', () => {
  //     let _fetchSpy;

  //     beforeEach(() => {
  //       _fetchSpy = jest.spyOn(global, 'fetch');
  //     });

  //     afterEach(() => {
  //       if (withMockedApis) {
  //         restoreAll();
  //       }
  //       jest.restoreAllMocks();
  //     });

  //     it('should track workflow execution metrics', async () => {
  //       const monitoredWorkflowTeam = require('./examples/teams/workflow_driven/monitoredWorkflow');
  //       const monitoredWorkflowTeamRecordedRequests = require('./examples/teams/workflow_driven/monitoredWorkflow.requests.json');

  //       if (withMockedApis) {
  //         mock(monitoredWorkflowTeamRecordedRequests);
  //       }

  //       const startTime = Date.now();
  //       const result = await monitoredWorkflowTeam.start({
  //         iterations: 3,
  //         delay: 100,
  //       });
  //       const endTime = Date.now();
  //       const store = monitoredWorkflowTeam.useStore();
  //       const state = store.getState().getCleanedState();

  //       // Verify successful execution
  //       expect(result.status).toBe('FINISHED');

  //       // Verify execution time tracking
  //       const workflowLogs = state.workflowLogs;
  //       const executionTimeLogs = workflowLogs.filter(
  //         (log) =>
  //           log.logDescription.includes('execution time') ||
  //           log.logDescription.includes('duration')
  //       );
  //       expect(executionTimeLogs.length).toBeGreaterThan(0);

  //       // Verify iteration tracking
  //       const iterationLogs = workflowLogs.filter(
  //         (log) =>
  //           log.logDescription.includes('iteration') ||
  //           log.logDescription.includes('step')
  //       );
  //       expect(iterationLogs.length).toBeGreaterThan(0);

  //       // Verify reasonable execution time
  //       const executionTime = endTime - startTime;
  //       expect(executionTime).toBeGreaterThan(0);

  //       expect(cleanSnapshotForComparison(state)).toMatchSnapshot();
  //     });
  //   });
});
