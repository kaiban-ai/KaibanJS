require('dotenv').config({ path: './.env.local' });
// Setup mock
const { mock, restoreAll } = require('../utils/moscaFetch')();
// const { record, getRecords, saveRecords } = require('../utils/moscaFetch')();

const openAITeam = require('./examples/teams/trip_planning/openai');
const openAITeamRecordedRequests = require('./examples/teams/trip_planning/openai.requests.json');
const openAITeamWithCustomPrompts = require('./examples/teams/trip_planning/openai_with_custom_prompts');
const openAITeamWithCustomPromptsRecordedRequests = require('./examples/teams/trip_planning/openai_with_custom_prompts.requests.json');

// Determine if mocks should be applied based on the environment
const withMockedApis =
  process.env.TEST_ENV === 'mocked-llm-apis' ? true : false;

//   record({
//     url: '*',
//     method: '*',
//     body: '*'  // Record any POST request to this URL
// });

describe('Trip Planning Team Workflows', () => {
  describe.only('Using OpenAI Agents', () => {
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
      await openAITeam.start();
      const storeFinalState = openAITeam
        .useStore()
        .getState()
        .getCleanedState();
      expect(storeFinalState).toMatchSnapshot();

      // const recordedData = getRecords();
      // console.log(recordedData);
      // saveRecords();
    });

    it('executes tasks in correct sequential order with proper state transitions', async () => {
      await openAITeam.start();
      const store = openAITeam.useStore();
      const finalState = store.getState();
      const cleanedState = finalState.getCleanedState();

      // Verify workflow completed successfully
      expect(cleanedState.teamWorkflowStatus).toBe('FINISHED');

      // Get task status updates from workflow logs
      const taskStatusLogs = cleanedState.workflowLogs.filter(
        (log) => log.logType === 'TaskStatusUpdate'
      );

      const tasks = store.getState().tasks;

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

      // Verify tasks were executed in correct order
      const taskCompletionOrder = taskStatusLogs
        .filter((log) => log.taskStatus === 'DONE')
        .map((log) => log.task.description);

      // Verify each task was completed after its dependencies
      const tasksWithDependencies = tasks.filter(
        (task) => task.dependencies && task.dependencies.length > 0
      );

      tasksWithDependencies.forEach((task) => {
        const taskIndex = taskCompletionOrder.indexOf(task.description);
        task.dependencies.forEach((depId) => {
          const depIndex = taskCompletionOrder.indexOf(depId);
          expect(depIndex).toBeLessThan(taskIndex);
        });
      });

      // Verify first task started first
      const firstTaskStartLog = taskStatusLogs.find(
        (log) => log.taskStatus === 'DOING'
      );
      expect(firstTaskStartLog.task.description).toBe(tasks[0].description);

      // Verify all tasks are completed
      const finalTasks = store.getState().tasks;
      finalTasks.forEach((task) => {
        expect(task.status).toBe('DONE');
      });
    });
  });
  describe('Using OpenAI Agents with Custom Prompts', () => {
    beforeEach(() => {
      // Mocking all POST requests with a callback
      if (withMockedApis) {
        mock(openAITeamWithCustomPromptsRecordedRequests);
      }
    });
    afterEach(() => {
      if (withMockedApis) {
        restoreAll();
      }
    });
    it('completes the entire workflow successfully', async () => {
      await openAITeamWithCustomPrompts.start();
      const store = openAITeamWithCustomPrompts.useStore();
      expect(store.getState().getCleanedState()).toMatchSnapshot();
      // const recordedData = getRecords();
      // console.log(recordedData);
      // saveRecords();
    });
  });
  describe.skip('Pause and Resume', () => {
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
      // Start workflow
      const workflowPromise = openAITeam.start();
      const store = openAITeam.useStore();

      const firstTask = store.getState().tasks[0];

      // Wait for the city selector agent to start working
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
      await openAITeam.pause();

      // Get current state
      let state = store.getState();

      // Verify pause state
      expect(state.teamWorkflowStatus).toBe('PAUSED');
      expect(state.tasks[0].status).toBe('PAUSED');

      // Resume workflow
      await openAITeam.resume();

      state = store.getState();

      // Verify resume state
      expect(state.teamWorkflowStatus).toBe('RUNNING');
      expect(state.tasks[0].status).toBe('DOING');

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
      expect(pauseLogs[0].agent.name).toBe('Peter Atlas');

      // check evolution of the paused task though all logs
      // The sequence of logs should be:
      // 1. TaskStatusUpdate: TO_DO
      // 2. TaskStatusUpdate: DOING
      // 3. TaskStatusUpdate: PAUSED
      // 4. TaskStatusUpdate: DOING
      // 5. TaskStatusUpdate: DONE

      const taskStatusLogs = state.workflowLogs.filter(
        (log) =>
          log.logType === 'TaskStatusUpdate' &&
          log.task.description === firstTask.description
      );

      const statusSequence = taskStatusLogs.map((log) => log.taskStatus);
      expect(statusSequence).toEqual(['DOING', 'PAUSED', 'DOING', 'DONE']);

      // check there is no other task status updates between PAUSED and DOING of the paused task
      const pausedIndex = state.workflowLogs.findIndex(
        (log) =>
          log.logType === 'TaskStatusUpdate' &&
          log.taskStatus === 'PAUSED' &&
          log.task.description === firstTask.description
      );
      const nextDoingIndex = state.workflowLogs.findIndex(
        (log) =>
          log.logType === 'TaskStatusUpdate' &&
          log.taskStatus === 'DOING' &&
          log.task.description === firstTask.description &&
          state.workflowLogs.indexOf(log) > pausedIndex
      );

      const logsInBetween = state.workflowLogs.slice(
        pausedIndex + 1,
        nextDoingIndex
      );

      const taskStatusUpdatesInBetween = logsInBetween.filter(
        (log) => log.logType === 'TaskStatusUpdate'
      );

      expect(taskStatusUpdatesInBetween.length).toBe(0);

      // check the metadata of the thinking logs is the same before pause and after resume
      // Get the last thinking log before pause
      const lastThinkingBeforePause = state.workflowLogs
        .slice(0, pausedIndex)
        .filter(
          (log) =>
            log.logType === 'AgentStatusUpdate' &&
            log.agentStatus === 'THINKING' &&
            log.task.description === firstTask.description
        )
        .pop();

      // Get the first thinking log after resume
      const firstThinkingAfterResume = state.workflowLogs
        .slice(nextDoingIndex)
        .filter(
          (log) =>
            log.logType === 'AgentStatusUpdate' &&
            log.agentStatus === 'THINKING' &&
            log.task.description === firstTask.description
        )
        .shift();

      expect(lastThinkingBeforePause.metadata).toEqual(
        firstThinkingAfterResume.metadata
      );
    });

    it('should pause and resume intermediate task correctly', async () => {
      // Start workflow
      const workflowPromise = openAITeam.start();
      let store = openAITeam.useStore();

      let state = store.getState();

      const intermediateTask = state.tasks[1]; // Get the second task (gatherTask)

      // Wait for the travel researcher agent to start working
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

      // Pause workflow
      await openAITeam.pause();

      // Get current state
      state = store.getState();

      // Verify pause state
      expect(state.teamWorkflowStatus).toBe('PAUSED');
      expect(state.tasks[1].status).toBe('PAUSED');

      // Resume workflow
      await openAITeam.resume();

      state = store.getState();

      // Verify resume state
      expect(state.teamWorkflowStatus).toBe('RUNNING');
      expect(state.tasks[1].status).toBe('DOING');

      // Complete workflow
      await workflowPromise;

      state = store.getState();

      // Get the index of the last PAUSED status update before resume
      const pausedIndex = state.workflowLogs.findIndex(
        (log) =>
          log.logType === 'TaskStatusUpdate' &&
          log.taskStatus === 'PAUSED' &&
          log.task.description === state.tasks[1].description
      );

      // Get the index of the next DOING status update after resume
      const nextDoingIndex = state.workflowLogs.findIndex(
        (log) =>
          log.logType === 'TaskStatusUpdate' &&
          log.taskStatus === 'DOING' &&
          log.task.description === state.tasks[1].description &&
          state.workflowLogs.indexOf(log) > pausedIndex
      );

      const logsInBetween = state.workflowLogs.slice(
        pausedIndex + 1,
        nextDoingIndex
      );

      const taskStatusUpdatesInBetween = logsInBetween.filter(
        (log) => log.logType === 'TaskStatusUpdate'
      );

      expect(taskStatusUpdatesInBetween.length).toBe(0);

      // Check the metadata of the thinking logs is the same before pause and after resume
      // Get the last thinking log before pause
      const lastThinkingBeforePause = state.workflowLogs
        .slice(0, pausedIndex)
        .filter(
          (log) =>
            log.logType === 'AgentStatusUpdate' &&
            log.agentStatus === 'THINKING' &&
            log.task.description === intermediateTask.description
        )
        .pop();

      // Get the first thinking log after resume
      const firstThinkingAfterResume = state.workflowLogs
        .slice(nextDoingIndex)
        .filter(
          (log) =>
            log.logType === 'AgentStatusUpdate' &&
            log.agentStatus === 'THINKING' &&
            log.task.description === intermediateTask.description
        )
        .shift();

      expect(lastThinkingBeforePause.metadata).toEqual(
        firstThinkingAfterResume.metadata
      );
    });

    it('should pause and resume final task correctly', async () => {
      const workflowPromise = openAITeam.start();
      let store = openAITeam.useStore();

      let state = store.getState();

      const finalTask = state.tasks[state.tasks.length - 1];

      // Wait for the final task to start
      await new Promise((resolve) => {
        const unsubscribe = store.subscribe(
          (state) => state.workflowLogs,
          (logs) => {
            const hasAgentStarted = logs.some(
              (log) =>
                log.logType === 'AgentStatusUpdate' &&
                log.agent.name === finalTask.agent.name &&
                log.task.description === finalTask.description &&
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
      await openAITeam.pause();

      await new Promise((resolve) => setTimeout(resolve, 400));

      // Get current state
      state = store.getState();

      // Verify pause state
      expect(state.teamWorkflowStatus).toBe('PAUSED');
      expect(state.tasks[2].status).toBe('PAUSED'); // planTask

      // Resume workflow
      await openAITeam.resume();

      state = store.getState();

      // Verify resume state
      expect(state.teamWorkflowStatus).toBe('RUNNING');
      expect(state.tasks[2].status).toBe('DOING');

      // Complete workflow
      await workflowPromise;

      state = store.getState();

      // Verify workflow logs for pause status
      const pauseLogs = state.workflowLogs.filter(
        (log) =>
          log.logType === 'TaskStatusUpdate' && log.taskStatus === 'PAUSED'
      );

      expect(pauseLogs.length).toBe(1);
      expect(pauseLogs[0].task.description).toBe(finalTask.description);
      expect(pauseLogs[0].agent.name).toBe(finalTask.agent.name);

      // check evolution of the paused task though all logs
      // The sequence of logs should be:
      // 1. TaskStatusUpdate: TO_DO
      // 2. TaskStatusUpdate: DOING
      // 3. TaskStatusUpdate: PAUSED
      // 4. TaskStatusUpdate: DOING
      // 5. TaskStatusUpdate: DONE

      const taskStatusLogs = state.workflowLogs.filter(
        (log) =>
          log.logType === 'TaskStatusUpdate' &&
          log.task.description === finalTask.description
      );

      const statusSequence = taskStatusLogs.map((log) => log.taskStatus);
      expect(statusSequence).toEqual(['DOING', 'PAUSED', 'DOING', 'DONE']);

      // check there is no other task status updates between PAUSED and DOING of the paused task
      const pausedIndex = state.workflowLogs.findIndex(
        (log) =>
          log.logType === 'TaskStatusUpdate' &&
          log.taskStatus === 'PAUSED' &&
          log.task.description === finalTask.description
      );
      const nextDoingIndex = state.workflowLogs.findIndex(
        (log) =>
          log.logType === 'TaskStatusUpdate' &&
          log.taskStatus === 'DOING' &&
          log.task.description === finalTask.description &&
          state.workflowLogs.indexOf(log) > pausedIndex
      );

      const logsInBetween = state.workflowLogs.slice(
        pausedIndex + 1,
        nextDoingIndex
      );

      const taskStatusUpdatesInBetween = logsInBetween.filter(
        (log) => log.logType === 'TaskStatusUpdate'
      );

      expect(taskStatusUpdatesInBetween.length).toBe(0);

      // check the metadata of the thinking logs is the same before pause and after resume
      // Get the last thinking log before pause
      const lastLogsThinkingBeforePause = state.workflowLogs
        .slice(0, pausedIndex)
        .filter(
          (log) =>
            log.logType === 'AgentStatusUpdate' &&
            log.agentStatus === 'THINKING' &&
            log.task.description === finalTask.description
        );

      // Get the first thinking log after resume
      const firstLogsThinkingAfterResume = state.workflowLogs
        .slice(nextDoingIndex)
        .filter(
          (log) =>
            log.logType === 'AgentStatusUpdate' &&
            log.agentStatus === 'THINKING' &&
            log.task.description === finalTask.description
        );

      expect(lastLogsThinkingBeforePause.pop().metadata).toEqual(
        firstLogsThinkingAfterResume.shift().metadata
      );

      // check the workflow finished after the final task finished
      const finalTaskFinished = state.workflowLogs.find(
        (log) =>
          log.logType === 'TaskStatusUpdate' &&
          log.taskStatus === 'DONE' &&
          log.task.description === finalTask.description
      );

      const workflowFinished = state.workflowLogs.find(
        (log) =>
          log.logType === 'WorkflowStatusUpdate' &&
          log.workflowStatus === 'FINISHED'
      );

      expect(finalTaskFinished).toBeDefined();
      expect(workflowFinished).toBeDefined();

      // validate that the final task finished log is after the workflow finished log
      expect(state.workflowLogs.indexOf(workflowFinished)).toBeGreaterThan(
        state.workflowLogs.indexOf(finalTaskFinished)
      );
    });
  });

  describe.skip('Stop', () => {
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
      openAITeam.start();
      const store = openAITeam.useStore();

      // Wait for the first task to start
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

      // Stop the workflow
      await openAITeam.stop();
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

      // Check no executions in progress
      const lastLog = state.workflowLogs[state.workflowLogs.length - 1];
      expect(lastLog.logType).toBe('WorkflowStatusUpdate');
      expect(lastLog.workflowStatus).toBe('STOPPED');

      // check that the workflow is stopped
      expect(state.teamWorkflowStatus).toBe('STOPPED');
    });

    it('should stop workflow when intermediate task is executing', async () => {
      openAITeam.start();
      const store = openAITeam.useStore();

      // Wait for the second task to start
      await new Promise((resolve) => {
        const unsubscribe = store.subscribe(
          (state) => state.workflowLogs,
          (logs) => {
            const firstTaskDone = logs.some(
              (log) =>
                log.logType === 'TaskStatusUpdate' &&
                log.taskStatus === 'DONE' &&
                log.task.description === store.getState().tasks[0].description
            );
            const secondTaskStarted = logs.some(
              (log) =>
                log.logType === 'AgentStatusUpdate' &&
                log.agentStatus === 'THINKING' &&
                log.task.description === store.getState().tasks[1].description
            );
            if (firstTaskDone && secondTaskStarted) {
              unsubscribe();
              resolve();
            }
          }
        );
      });

      // Stop the workflow
      await openAITeam.stop();
      const state = store.getState();

      // Check workflow status transitions
      const statusTransitions = state.workflowLogs
        .filter((log) => log.logType === 'WorkflowStatusUpdate')
        .map((log) => log.workflowStatus);
      expect(statusTransitions).toEqual(['RUNNING', 'STOPPING', 'STOPPED']);

      // Check all tasks are reset to TODO
      // the first task is not reset because it is already done
      expect(state.tasks[0].status).toBe('DONE');
      state.tasks.slice(1).forEach((task) => {
        expect(task.status).toBe('TODO');
      });

      // check that the workflow is stopped
      expect(state.teamWorkflowStatus).toBe('STOPPED');

      // Check no executions in progress
      const lastLog = state.workflowLogs[state.workflowLogs.length - 1];
      expect(lastLog.logType).toBe('WorkflowStatusUpdate');
      expect(lastLog.workflowStatus).toBe('STOPPED');
    });

    it('should stop workflow when last task is executing', async () => {
      openAITeam.start();
      const store = openAITeam.useStore();
      const lastTaskIndex = store.getState().tasks.length - 1;

      // Wait for the last task to start
      await new Promise((resolve) => {
        const unsubscribe = store.subscribe(
          (state) => state.workflowLogs,
          (logs) => {
            const lastTaskStarted = logs.some(
              (log) =>
                log.logType === 'AgentStatusUpdate' &&
                log.agentStatus === 'THINKING' &&
                log.task.description ===
                  store.getState().tasks[lastTaskIndex].description
            );
            if (lastTaskStarted) {
              unsubscribe();
              resolve();
            }
          }
        );
      });

      // Stop the workflow
      await openAITeam.stop();
      const state = store.getState();

      // Check workflow status transitions
      const statusTransitions = state.workflowLogs
        .filter((log) => log.logType === 'WorkflowStatusUpdate')
        .map((log) => log.workflowStatus);
      expect(statusTransitions).toEqual(['RUNNING', 'STOPPING', 'STOPPED']);

      // Check all tasks are in DONE status except the last one
      state.tasks.slice(0, lastTaskIndex).forEach((task) => {
        expect(task.status).toBe('DONE');
      });
      expect(state.tasks[lastTaskIndex].status).toBe('TODO');

      // check that the workflow is stopped
      expect(state.teamWorkflowStatus).toBe('STOPPED');

      // Check no executions in progress
      const lastLog = state.workflowLogs[state.workflowLogs.length - 1];
      expect(lastLog.logType).toBe('WorkflowStatusUpdate');
      expect(lastLog.workflowStatus).toBe('STOPPED');
    });
  });
});
