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
    tools: [searchTool],
});

const contentCreator = new Agent({
    name: 'Writer',
    role: 'Content Creator',
    goal: 'Generate a comprehensive articles about any sports event.',
    background: 'Journalism',
    tools: []    
});

// Define tasks
const searchTask = new Task({
    description: `Search for detailed information about the sports query: {sportsQuery}.`,
    expectedOutput: 'Detailed information about the sports event. Key players, key moments, final score and other usefull information.',
    agent: searchAgent
});

const writeTask = new Task({
    description: `Using the gathered information, write a detailed article about the sport event.`,
    expectedOutput: 'A well-structured and engaging sports article. With a title, introduction, body, and conclusion.',
    agent: contentCreator
});

// Team to coordinate the agents
const team = new Team({
    name: 'Sports Content Creation Team',
    agents: [searchAgent,contentCreator ],
    tasks: [searchTask, writeTask],
    inputs: { sportsQuery: 'Who won the Copa America in 2024?' },  // Placeholder for dynamic input
    // Results of the latest UEFA Champions League match.
});

// Listening to changes in the team's state and starting the workflow
// team.subscribeToChanges((updatedFields) => {
//     console.log("Workflow Status Updated:", updatedFields);


export default team;




// - tavily_search_results_json: A search engine optimized for comprehensive, accurate, and trusted results. Useful for when you need to answer questions about current events. Input should be a search query.

// - clock: A tool that provides the current date and time.

// - team_knowledge_base: This tool will give you access to useful knowledge gathered by your team that could be helpful for successfully achieving your task. But please remember that this tool may not be accurate or up-to-date.