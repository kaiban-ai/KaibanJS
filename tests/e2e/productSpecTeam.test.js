require('dotenv').config({ path: './.env.local' });
// Setup mock
const { mock, record, restoreAll, getRecords } = require('../utils/moscaFetch')();

const openAIProducSpecsTeam = require('./examples/teams/openai/productSpecsTeam');
const openAITeamRecordedRequests = require('./examples/teams/openai/productSpecsTeam.requests');
const geminiAIProducSpecsTeam = require('./examples/teams/google/productSpecsTeam');
const geminiAITeamRecordedRequests = require('./examples/teams/google/productSpecsTeam.requests');
const anthropicAIProductSpecsTeam = require('./examples/teams/anthropic/productSpecsTeam');
const anthropicAITeamRecordedRequests = require('./examples/teams/anthropic/productSpecsTeam.requests');
const mistralAIProductSpecsTeam = require('./examples/teams/mistral/productSpecsTeam');
const mistralAITeamRecordedRequests = require('./examples/teams/mistral/productSpecsTeam.requests');

// Determine if mocks should be applied based on the environment
const withMockedApis = process.env.TEST_ENV === 'mocked-llm-apis' ? true : false;

describe('Product Spec Team Workflows', () => {
    describe.skip('Using OpenAI Agents', () => {
        beforeEach(() => {         
            // Mocking all POST requests with a callback
            withMockedApis && mock(openAITeamRecordedRequests);
        });
        afterEach(() => {
            withMockedApis && restoreAll();
        });      
        it('completes the entire workflow successfully', async () => {
            const result = await openAIProducSpecsTeam.start();
            expect(result).toBeDefined();
            expect(typeof result).toBe('string');
            const wordCount = result.trim().split(/\s+/).length;
            expect(wordCount).toBeGreaterThan(20);      
        });
    });

    describe.skip('Using Gemini AI Agents', () => {
        beforeEach(() => {         
            // Mocking all POST requests with a callback
            withMockedApis && mock(geminiAITeamRecordedRequests);
        });
        afterEach(() => {
            withMockedApis && restoreAll();
        });      
        it('completes the entire workflow successfully', async () => {

            const result = await geminiAIProducSpecsTeam.start();         
            expect(result).toBeDefined();
            expect(typeof result).toBe('string');
            const wordCount = result.trim().split(/\s+/).length;
            expect(wordCount).toBeGreaterThan(20);      
        });
    });

    describe('Using Anthropic Agents', () => {
        beforeEach(() => {         
            // Mocking all POST requests with a callback
            withMockedApis && mock(anthropicAITeamRecordedRequests);
        });
        afterEach(() => {
            withMockedApis && restoreAll();
        });      
        it('completes the entire workflow successfully', async () => {
            const result = await anthropicAIProductSpecsTeam.start();                          
            expect(result).toBeDefined();
            expect(typeof result).toBe('string');
            const wordCount = result.trim().split(/\s+/).length;
            expect(wordCount).toBeGreaterThan(20);      
        });
    });        
    describe.skip('Using Mistral AI Agents', () => {
        beforeEach(() => {         
            // Mocking all POST requests with a callback
            withMockedApis && mock(mistralAITeamRecordedRequests);
        });
        afterEach(() => {
            withMockedApis && restoreAll();
        });      
        it('completes the entire workflow successfully', async () => {

            const result = await mistralAIProductSpecsTeam.start();                      
            expect(result).toBeDefined();
            console.log(result);
            expect(typeof result).toBe('string');
            const wordCount = result.trim().split(/\s+/).length;
            expect(wordCount).toBeGreaterThan(20);      
        });
    });
});
