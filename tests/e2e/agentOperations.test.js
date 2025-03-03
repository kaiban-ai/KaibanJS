require('dotenv').config({ path: './.env.local' });
// Setup mock
const { mock, restoreAll } = require('../utils/moscaFetch')();
// const { record, getRecords, saveRecords } = require('../utils/moscaFetch')();

// Determine if mocks should be applied based on the environment
const withMockedApis =
  process.env.TEST_ENV === 'mocked-llm-apis' ? true : false;

describe('Agent Operations Team Workflows', () => {
  describe('setEnv operation', () => {
    let fetchSpy;

    beforeEach(() => {
      // record({
      //   url: '*',
      //   method: '*',
      //   body: '*', // Record any POST request to this URL
      // });

      fetchSpy = jest.spyOn(global, 'fetch');
    });

    afterEach(() => {
      if (withMockedApis) {
        restoreAll();
      }
      jest.restoreAllMocks();
    });

    it('handles environment updates before workflow start', async () => {
      // Get store and update environment before starting
      const openAITeam = require('./examples/teams/agent_operations/openaiSetEnv');
      const openAITeamRecordedRequests = require('./examples/teams/agent_operations/openaiSetEnvBeforeStart.requests.json');
      if (withMockedApis) {
        mock(openAITeamRecordedRequests);
      }

      const apiKey2 = process.env.OPENAI_API_KEY_2 ?? 'test-api-key-2';

      const store = openAITeam.useStore();
      store.getState().setEnv({
        OPENAI_API_KEY: apiKey2,
      });

      // Verify that agents have the updated API key in their llmConfig
      const agentsBeforeStart = store.getState().agents;
      agentsBeforeStart.forEach((agent) => {
        expect(agent.agentInstance.env.OPENAI_API_KEY).toBe(apiKey2);
        expect(agent.agentInstance.llmConfig.apiKey).toBe(apiKey2);
        expect(agent.agentInstance.llmInstance.apiKey).toBe(apiKey2);
      });

      // Start the workflow
      await openAITeam.start();

      const fetchCalls = fetchSpy.mock.calls;
      fetchCalls
        .filter(([url]) => url.includes('api.openai.com'))
        .forEach(([_, config]) => {
          expect(config.headers.authorization).toContain(apiKey2);
        });

      // check clean state
      expect(store.getState().getCleanedState()).toMatchSnapshot();

      const agentsAfterStart = store.getState().agents;
      agentsAfterStart.forEach((agent) => {
        expect(agent.agentInstance.env.OPENAI_API_KEY).toBe(apiKey2);
        expect(agent.agentInstance.llmConfig.apiKey).toBe(apiKey2);
        expect(agent.agentInstance.llmInstance.apiKey).toBe(apiKey2);
      });

      // const recordedData = getRecords();
      // console.log(recordedData);
      // saveRecords();
    });
  });

  describe('setEnv operation after first task', () => {
    let fetchSpy;

    beforeEach(() => {
      // record({
      //   url: '*',
      //   method: '*',
      //   body: '*', // Record any POST request to this URL
      // });

      fetchSpy = jest.spyOn(global, 'fetch');
    });

    afterEach(() => {
      if (withMockedApis) {
        restoreAll();
      }
      jest.restoreAllMocks();
    });

    it('handles environment updates mid-workflow', async () => {
      const openAITeam = require('./examples/teams/agent_operations/openaiSetEnv1');
      const openAITeamRecordedRequests = require('./examples/teams/agent_operations/openaiSetEnvAfterFirstTask.requests.json');
      if (withMockedApis) {
        mock(openAITeamRecordedRequests);
      }
      // Start the workflow
      const workflowPromise = openAITeam.start();
      const store = openAITeam.useStore();

      const apiKey1 = process.env.OPENAI_API_KEY ?? 'test-api-key-1';
      const apiKey2 = process.env.OPENAI_API_KEY_2 ?? 'test-api-key-2';

      const fetchCalls = fetchSpy.mock.calls;
      fetchCalls
        .filter(([url]) => url.includes('api.openai.com'))
        .forEach(([_, config]) => {
          expect(config.headers.authorization).toContain(apiKey1);
        });

      let nFetchCallsAfterFirstTask = 0;

      // Wait for the first task to complete
      await new Promise((resolve) => {
        const unsubscribe = store.subscribe(
          (state) => state.tasks[0].status,
          (status) => {
            if (status === 'DONE') {
              unsubscribe();
              resolve();

              const fetchCallsAfterBeforeFirstTask = fetchSpy.mock.calls;

              fetchCallsAfterBeforeFirstTask
                .filter(([url]) => url.includes('api.openai.com'))
                .forEach(([_, config]) => {
                  // eslint-disable-next-line jest/no-conditional-expect
                  expect(config.headers.authorization).toContain(
                    process.env.OPENAI_API_KEY
                  );
                });

              nFetchCallsAfterFirstTask = fetchCallsAfterBeforeFirstTask.filter(
                ([url]) => url.includes('api.openai.com')
              ).length;
            }
          }
        );
      });

      // Update environment with new API key
      store.getState().setEnv({
        OPENAI_API_KEY: apiKey2,
      });

      // Verify that agents have the updated API key immediately after update
      const agentsAfterUpdate = store.getState().agents;
      agentsAfterUpdate.forEach((agent) => {
        expect(agent.agentInstance.env.OPENAI_API_KEY).toBe(apiKey2);
        expect(agent.agentInstance.llmConfig.apiKey).toBe(apiKey2);
        expect(agent.agentInstance.llmInstance.apiKey).toBe(apiKey2);
      });

      // Wait for workflow completion
      await workflowPromise;

      // const recordedData = getRecords();
      // console.log(recordedData);
      // saveRecords();

      const fetchCallsAfterWorkflowCompletion = fetchSpy.mock.calls.slice(
        nFetchCallsAfterFirstTask
      );

      fetchCallsAfterWorkflowCompletion
        .filter(([url]) => url.includes('api.openai.com'))
        .forEach(([_, config]) => {
          expect(config.headers.authorization).toContain(apiKey2);
        });

      // check clean state
      expect(store.getState().getCleanedState()).toMatchSnapshot();

      // Verify that agents still have the updated API key after workflow completion
      const agentsAfterCompletion = store.getState().agents;
      agentsAfterCompletion.forEach((agent) => {
        expect(agent.agentInstance.env.OPENAI_API_KEY).toBe(apiKey2);
        expect(agent.agentInstance.llmConfig.apiKey).toBe(apiKey2);
        expect(agent.agentInstance.llmInstance.apiKey).toBe(apiKey2);
      });
    });
  });
});
