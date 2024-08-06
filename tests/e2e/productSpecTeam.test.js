require('dotenv').config({ path: './.env.local' });
// Setup mock
const { mock, record, restoreAll, getRecords, saveRecords } = require('../utils/moscaFetch')();

const openAIProducSpecsTeam = require('./examples/teams/product_specs/openai');
const openAITeamRecordedRequests = require('./examples/teams/product_specs/openai.requests.json');

// Determine if mocks should be applied based on the environment
const withMockedApis = process.env.TEST_ENV === 'mocked-llm-apis' ? true : false;

//   record({
//     url: '*',
//     method: '*',
//     body: '*'  // Record any POST request to this URL
// });  

describe('Product Spec Team Workflows', () => {
    describe('Using OpenAI Agents', () => {
        beforeEach(() => {         
            // Mocking all POST requests with a callback
            withMockedApis && mock(openAITeamRecordedRequests);
        });
        afterEach(() => {
            withMockedApis && restoreAll();
        });      
        it('completes the entire workflow successfully', async () => {
            const result = await openAIProducSpecsTeam.start();
            const store = openAIProducSpecsTeam.useStore()
            expect(store.getState().getCleanedState()).toMatchSnapshot();

            // const recordedData = getRecords();
            // console.log(recordedData); 
            // saveRecords();  
        });
    });
});
