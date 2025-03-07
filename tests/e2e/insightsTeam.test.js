require('dotenv').config({ path: './.env.local' });
// Setup mock
const { mock, restoreAll } = require('../utils/moscaFetch')();
// For recording mode:
// const { record, getRecords, saveRecords } = require('../utils/moscaFetch')();

const openAIInsightsTeam = require('./examples/teams/insights/openai');
const openAITeamRecordedRequests = require('./examples/teams/insights/openai.requests.json');

// Determine if mocks should be applied based on the environment
const withMockedApis =
  process.env.TEST_ENV === 'mocked-llm-apis' ? true : false;

// Enable recording when not using mocks
// record({
//     url: '*',
//     method: '*',
//     body: '*'
// });

describe('Insights-Driven Team Workflows', () => {
  describe('Using OpenAI Agents with Team Insights', () => {
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

    it('completes workflow successfully using team insights', async () => {
      await openAIInsightsTeam.start();
      const store = openAIInsightsTeam.useStore();

      expect(store.getState().getCleanedState()).toMatchSnapshot();
      // Save recorded responses
      //   const recordedData = getRecords();
      //   console.log('Recorded data:', recordedData);
      //   saveRecords();
    });
  });
});
