require('dotenv').config({ path: './.env.local' });
// Setup mock
const { mock, restoreAll } = require('../utils/moscaFetch')();

const historyFactSummaryTeam = require('./examples/teams/output_schema/openai');
const historyFactSummaryTeamRecordedRequests = require('./examples/teams/output_schema/openai.requests.json');

// Determine if mocks should be applied based on the environment
const withMockedApis =
  process.env.TEST_ENV === 'mocked-llm-apis' ? true : false;

describe('History Fact Summary Team Workflows', () => {
  describe('Using OpenAI Agents', () => {
    beforeEach(() => {
      // Mocking all POST requests with a callback
      if (withMockedApis) {
        mock(historyFactSummaryTeamRecordedRequests);
      }
    });
    afterEach(() => {
      if (withMockedApis) {
        restoreAll();
      }
    });
    it.skip('completes the entire workflow successfully', async () => {
      await historyFactSummaryTeam.start();
      const store = historyFactSummaryTeam.useStore();
      expect(store.getState().getCleanedState()).toMatchSnapshot();
    });
  });
});
