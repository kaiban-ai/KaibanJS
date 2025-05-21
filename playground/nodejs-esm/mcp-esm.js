// Assuming kaibanjs is a local module or a placeholder for demonstration purposes
import { Agent, Task, Team } from 'kaibanjs';
import { MultiServerMCPClient } from '@langchain/mcp-adapters';
import * as dotenv from 'dotenv';

dotenv.config();

const mcpClient = new MultiServerMCPClient({
  // Whether to prefix tool names with the server name (optional, default: true)
  prefixToolNameWithServerName: false,
  // Optional additional prefix for tool names (optional, default: "mcp")
  additionalToolNamePrefix: '',
  mcpServers: {
    tavily: {
      command: 'npx',
      args: ['-y', 'tavily-mcp@0.2.0'],
      env: {
        TAVILY_API_KEY: process.env.TAVILY_API_KEY || '',
        PATH: process.env.PATH || '',
      },
    },
  },
});

const tavilyTools = await mcpClient.getTools('tavily');
const searchTool = tavilyTools.find((tool) => tool.name === 'tavily-search');

// Define agents
const searchAgent = new Agent({
  name: 'Scout',
  role: 'Information Gatherer',
  goal: 'Find up-to-date information about the given sports query.',
  background: 'Research',
  tools: [searchTool],
});

// Define tasks
const searchTask = new Task({
  description: `Search for detailed information about the sports query: {sportsQuery}.`,
  expectedOutput:
    'Detailed information about the sports event. Key players, key moments, final score and other usefull information.',
  agent: searchAgent,
});

// Team to coordinate the agents
const team = new Team({
  name: 'Sports Content Creation Team',
  agents: [searchAgent],
  tasks: [searchTask],
  inputs: { sportsQuery: 'Who won the Copa America in 2024?' }, // Placeholder for dynamic input
  env: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  },
  // Results of the latest UEFA Champions League match.
});

// Subscribe to team status updates
const unsubscribe = team.subscribeToChanges(
  (updatedFields) => {
    console.log('Team Status Updated:', updatedFields);
  },
  ['teamWorkflowStatus']
);

// Start the team workflow
console.log('Starting team workflow...');
try {
  const result = await team.start();
  console.log('Final Result:', result);
} catch (error) {
  console.error('Error during workflow:', error);
} finally {
  unsubscribe();
}
