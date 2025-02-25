require('dotenv').config({ path: './.env.local' });
// Setup mock
const { mock, restoreAll } = require('../utils/moscaFetch')();
// const { record, getRecords, saveRecords } = require('../utils/moscaFetch')();

const openAIProducSpecsTeam = require('./examples/teams/product_specs/openai');
const openAITeamRecordedRequests = require('./examples/teams/product_specs/openai.requests.json');

const openAIProducSpecsTeamHITL = require('./examples/teams/product_specs/openai_hitl');
const openAIProducSpecsTeamHITL2 = require('./examples/teams/product_specs/openai_hitl_2');
const openAITeamRecordedRequestsHITL = require('./examples/teams/product_specs/openai_hitl.requests.json');
const openAITeamRecordedRequestsHITL2 = require('./examples/teams/product_specs/openai_hitl_2.requests.json');

// Determine if mocks should be applied based on the environment
const withMockedApis =
  process.env.TEST_ENV === 'mocked-llm-apis' ? true : false;
console.log(withMockedApis);

//   record({
//     url: '*',
//     method: '*',
//     body: '*'  // Record any POST request to this URL
// });

describe('Product Spec Team Workflows', () => {
  describe.skip('Using OpenAI Agents', () => {
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
      await openAIProducSpecsTeam.start();
      const store = openAIProducSpecsTeam.useStore();
      expect(store.getState().getCleanedState()).toMatchSnapshot();
    });
    // Add this after your test(s)
    // afterAll(() => {
    //     // // Code to run after all tests in this describe block
    //     // console.log('All tests completed');
    //     // const recordedData = getRecords();
    //     // console.log(recordedData);
    //     // saveRecords();
    // });
  });
  describe('HITL Features Using OpenAI Agents', () => {
    // beforeEach(() => {
    //     withMockedApis && mock(openAITeamRecordedRequestsHITL);
    // });
    afterEach(() => {
      if (withMockedApis) {
        restoreAll();
      }
    });

    // eslint-disable-next-line jest/no-done-callback
    it('(1) - handles task requiring validation', (done) => {
      if (withMockedApis) {
        mock(openAITeamRecordedRequestsHITL);
      }
      const team = openAIProducSpecsTeamHITL;
      team.onWorkflowStatusChange((status) => {
        if (status === 'FINISHED') {
          const finalState = team.useStore().getState().getCleanedState();
          // eslint-disable-next-line jest/no-conditional-expect
          expect(finalState).toMatchSnapshot(
            'State after task validation and workflow completion'
          );
          done(); // Signal that the test is complete
        } else if (status === 'BLOCKED') {
          // Check the state when the workflow is blocked
          const blockedState = team.useStore().getState().getCleanedState();
          // eslint-disable-next-line jest/no-conditional-expect
          expect(blockedState).toMatchSnapshot(
            'State when workflow is blocked waiting for validation'
          );
          team.getTasksByStatus('AWAITING_VALIDATION').forEach((task) => {
            team.validateTask(task.id);
          });
        }
      });

      team.start().catch((error) => {
        done(error); // If an error occurs, fail the test
      });
    });

    // eslint-disable-next-line jest/no-done-callback
    it.only('(2) - processes feedback and completes workflow', (done) => {
      if (withMockedApis) {
        mock(openAITeamRecordedRequestsHITL2);
      }
      const team = openAIProducSpecsTeamHITL2;
      let feedbackProvided = false;

      team.onWorkflowStatusChange((status) => {
        if (status === 'FINISHED') {
          const finalState = team.useStore().getState().getCleanedState();
          // eslint-disable-next-line jest/no-conditional-expect
          expect(finalState).toMatchSnapshot(
            'State after feedback, validation, and workflow completion'
          );
          done(); // Signal that the test is complete
        } else if (status === 'BLOCKED') {
          const blockedState = team.useStore().getState().getCleanedState();
          const tasksAwaitingValidation = team.getTasksByStatus(
            'AWAITING_VALIDATION'
          );

          if (!feedbackProvided && tasksAwaitingValidation.length > 0) {
            // First time blocked: provide feedback
            // eslint-disable-next-line jest/no-conditional-expect
            expect(blockedState).toMatchSnapshot(
              'State when workflow is blocked waiting for initial feedback'
            );
            const taskNeedingFeedback = tasksAwaitingValidation[0];
            team.provideFeedback(
              taskNeedingFeedback.id,
              'Sorry the founder idea is to spent 10k in Google Ads every'
            );
            feedbackProvided = true;
          } else if (feedbackProvided && tasksAwaitingValidation.length > 0) {
            // Second time blocked: validate the task
            // eslint-disable-next-line jest/no-conditional-expect
            expect(blockedState).toMatchSnapshot(
              'State when workflow is blocked after feedback, waiting for validation'
            );
            const taskToValidate = tasksAwaitingValidation[0];
            team.validateTask(taskToValidate.id);
          }
        }
      });

      team.start().catch((error) => {
        done(error); // If an error occurs, fail the test
      });
    });
  });
});
