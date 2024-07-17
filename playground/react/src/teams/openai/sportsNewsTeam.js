import { Agent, Task, Team } from 'agenticjs';
import { TavilySearchResults } from '@langchain/community/tools/tavily_search';
import { WikipediaQueryRun } from "@langchain/community/tools/wikipedia_query_run";

// Define tools
const searchTool = new TavilySearchResults({
    maxResults: 1,
    apiKey: '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',
});

const wikiTool = new WikipediaQueryRun({
    topKResults: 3,
    maxDocContentLength: 4000,
});

// Define agents
const searchAgent = new Agent({
    name: 'Scout',
    role: 'Information Gatherer',
    goal: 'Find up-to-date information about the given sports query.',
    background: 'Research',
    type: 'ReAct',
    tools: [searchTool],
});

// const contentCreator = new Agent({
//     name: 'Writer',
//     role: 'Content Creator',
//     goal: 'Generate a comprehensive article about the sports event.',
//     background: 'Journalism',
//     tools: [wikiTool],
// });

// Define tasks
const searchTask = new Task({
    description: `Search for detailed information about the sports query: {sportsQuery}.`,
    expectedOutput: 'Detailed information about the sports event.',
    agent: searchAgent
});

// const writeTask = new Task({
//     description: `Using the gathered information, write a detailed article about the sports event.`,
//     expectedOutput: 'A well-structured and engaging sports article.',
//     agent: contentCreator
// });

// Team to coordinate the agents
const team = new Team({
    name: 'Sports Content Creation Team',
    agents: [searchAgent ],
    tasks: [searchTask],
    inputs: { sportsQuery: 'Who won the last Copa America?' },  // Placeholder for dynamic input
    // Results of the latest UEFA Champions League match.
});

// Listening to changes in the team's state and starting the workflow
team.subscribeToChanges((updatedFields) => {
    console.log("Workflow Status Updated:", updatedFields);
});

// (async () => {
//     const result = await team.start();
//     console.log("Final Output:", result);
// })();

export default team;
