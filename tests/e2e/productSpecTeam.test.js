require('dotenv').config({ path: './.env.local' });
const openAIProducSpecsTeam = require('./examples/teams/openai/productSpecsTeam');
const geminiAIProducSpecsTeam = require('./examples/teams/google/productSpecsTeam');
const teamRecordedRequests = require('./examples/teams/openai/productSpecsTeam.requests');



// Setup mock
const { mock, record, restoreAll, getRecords } = require('../utils/moscaFetch')();



// Setting up recording
record({
    url: '*',
    method: '*',
    body: '*'  // Record any POST request to this URL
});

// Later, after making some requests in your application
// const recordedData = getRecords();
// console.log(recordedData);




describe('Product Spec Team Workflows', () => {
    // describe('Using OpenAI Agents', () => {
    //     beforeEach(() => {         
    //         // Mocking all POST requests with a callback
    //         mock(teamRecordedRequests);
    //     });
    //     afterEach(() => {
    //         restoreAll();
    //     });      
    //     it('completes the entire workflow successfully', async () => {
    //         const result = await openAIProducSpecsTeam.start();
    //         console.log(result);
    //         expect(result).toBeDefined();
    //         expect(typeof result).toBe('string');
    //         const wordCount = result.trim().split(/\s+/).length;
    //         expect(wordCount).toBeGreaterThan(20);      
    //     });
    // });

    describe('Using Gemini AI Agents', () => {
        beforeEach(() => {         
            // Mocking all POST requests with a callback
            // mock(teamRecordedRequests);
        });
        afterEach(() => {
            // restoreAll();
        });      
        it('completes the entire workflow successfully', async () => {

            debugger;
            const result = await geminiAIProducSpecsTeam.start();
            console.log(result);
            // const recordedData = getRecords();
            // console.log(recordedData);            
            expect(result).toBeDefined();
            expect(typeof result).toBe('string');
            const wordCount = result.trim().split(/\s+/).length;
            expect(wordCount).toBeGreaterThan(20);      
        });
    });    

    // describe('Using Anthropic Agents', () => {
    //     it('completes the entire workflow successfully', async () => {
    //         // Setup for Product Spec Team with Anthropic
    //         // Execute workflow
    //         // Assertions and expectations
    //         expect(true).toBeDefined();
    //     });
    // });

    // describe('Using Gemini Agents', () => {
    //     it('completes the entire workflow successfully', async () => {
    //         // Setup for Product Spec Team with Gemini
    //         // Execute workflow
    //         // Assertions and expectations
    //         expect(true).toBeDefined();
    //     });
    // });
});
