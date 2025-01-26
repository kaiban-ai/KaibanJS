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
  describe('Using OpenAI Agents', () => {
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
      expect(state.taskQueue.isPaused).toBe(true);

      // Resume workflow
      await openAITeam.resume();

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
      expect(state.taskQueue.isPaused).toBe(true);

      // Resume workflow
      await openAITeam.resume();

      state = store.getState();

      // Verify resume state
      expect(state.teamWorkflowStatus).toBe('RUNNING');
      expect(state.tasks[1].status).toBe('DOING');
      expect(state.taskQueue.isPaused).toBe(false);

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
      expect(state.taskQueue.isPaused).toBe(true);

      // Resume workflow
      await openAITeam.resume();

      state = store.getState();

      // Verify resume state
      expect(state.teamWorkflowStatus).toBe('RUNNING');
      expect(state.tasks[2].status).toBe('DOING');
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
});
