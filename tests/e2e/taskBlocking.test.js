require('dotenv').config({ path: './.env.local' });
// Setup mock
const { mock, restoreAll } = require('../utils/moscaFetch')();
// Uncomment these lines to record new API interactions
// const { record, getRecords, saveRecords } = require('../utils/moscaFetch')();

const securityTeam = require('./examples/teams/task_blocking/security');
const securityTeamRecordedRequests = require('./examples/teams/task_blocking/security.requests.json');

// Determine if mocks should be applied based on the environment
const withMockedApis =
  process.env.TEST_ENV === 'mocked-llm-apis' ? true : false;

// Uncomment to record API interactions
// record({
//   url: '*',
//   method: '*',
//   body: '*'  // Record any POST request to this URL
// });

describe('Task Blocking Team Workflows', () => {
  describe('Using Security Validation Agent', () => {
    beforeEach(() => {
      // Mocking all POST requests with a callback
      if (withMockedApis) {
        mock(securityTeamRecordedRequests);
      }
    });

    afterEach(() => {
      if (withMockedApis) {
        restoreAll();
      }
    });

    it('blocks the task due to security requirements', async () => {
      await securityTeam.start();
      const store = securityTeam.useStore();
      const state = store.getState().getCleanedState();

      // Verify the workflow was blocked
      expect(state.teamWorkflowStatus).toBe('BLOCKED');

      // Verify task status
      const task = state.tasks[0];
      expect(task.status).toBe('BLOCKED');

      // Match the entire state snapshot
      expect(state).toMatchSnapshot();

      // Uncomment to save recorded API interactions
      //   const recordedData = getRecords();
      //   console.log(recordedData);
      //   saveRecords();
    });
  });
});
