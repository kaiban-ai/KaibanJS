require('dotenv').config({ path: './.env.local' });
// Setup mock
const { mock, restoreAll } = require('../utils/moscaFetch')();
// const { record, getRecords, saveRecords } = require('../utils/moscaFetch')();

const openAITeam = require('./examples/teams/sport_news/openai');
const openAITeamRecordedRequests = require('./examples/teams/sport_news/openai.requests.json');
const geminiTeam = require('./examples/teams/sport_news/gemini');
const geminiTeamRecordedRequests = require('./examples/teams/sport_news/gemini.requests.json');
const deepseekTeam = require('./examples/teams/sport_news/deepseek');
const deepseekTeamRecordedRequests = require('./examples/teams/sport_news/deepseek.requests.json');
const xaiTeam = require('./examples/teams/sport_news/xai');
const xaiTeamRecordedRequests = require('./examples/teams/sport_news/xai.requests.json');

// Determine if mocks should be applied based on the environment
const withMockedApis =
  process.env.TEST_ENV === 'mocked-llm-apis' ? true : false;

// record({
//   url: '*',
//   method: '*',
//   body: '*', // Record any POST request to this URL
// });

describe('Sport News Team Workflows', () => {
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
  describe('Using Gemini Agents', () => {
    beforeEach(() => {
      // Mocking all POST requests with a callback
      if (withMockedApis) {
        mock(geminiTeamRecordedRequests);
      }
    });
    afterEach(() => {
      if (withMockedApis) {
        restoreAll();
      }
    });
    it('completes the entire workflow successfully', async () => {
      await geminiTeam.start();
      const storeFinalState = geminiTeam
        .useStore()
        .getState()
        .getCleanedState();
      expect(storeFinalState).toMatchSnapshot();

      // const recordedData = getRecords();
      // console.log(recordedData);
      // saveRecords();
    });
  });
  describe('Using DeepSeek Agents', () => {
    beforeEach(() => {
      if (withMockedApis) {
        console.log('mocking deepseek');

        mock(deepseekTeamRecordedRequests);
      }
    });
    afterEach(() => {
      if (withMockedApis) {
        restoreAll();
      }
    });
    it('completes the entire workflow successfully', async () => {
      await deepseekTeam.start();
      const storeFinalState = deepseekTeam
        .useStore()
        .getState()
        .getCleanedState();
      expect(storeFinalState).toMatchSnapshot();
      // const recordedData = getRecords();
      // console.log(recordedData);
      // await saveRecords();
    });
  });
  describe('Using XAI Agents', () => {
    beforeEach(() => {
      if (withMockedApis) {
        mock(xaiTeamRecordedRequests);
      }
    });
    afterEach(() => {
      if (withMockedApis) {
        restoreAll();
      }
    });
    it('completes the entire workflow successfully', async () => {
      await xaiTeam.start();
      const storeFinalState = xaiTeam.useStore().getState().getCleanedState();
      expect(storeFinalState).toMatchSnapshot();

      // const recordedData = getRecords();
      // console.log(recordedData);
      // await saveRecords();
    });
  });
});
