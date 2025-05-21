// Assuming kaibanjs is a local module or a placeholder for demonstration purposes
const { Agent, Task, Team } = require('kaibanjs');
const { MultiServerMCPClient } = require('@langchain/mcp-adapters');

require('dotenv').config({ path: './.env.local' });

async function main() {
  // ╔══════════════════════════════════════════════════════╗
  // ║ How to Use KaibanJS:                                ║
  // ║ 1. Define your Agents with specific roles and goals  ║
  // ║ 2. Define the Tasks each Agent will perform          ║
  // ║ 3. Create the Team and assign Agents and their Tasks ║
  // ║ 4. Start the Team to execute the defined tasks       ║
  // ╚══════════════════════════════════════════════════════╝

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

  // ──── Agents ────────────────────────────────────────────
  // ─ Agents are autonomous entities designed to perform
  // ─ specific roles and achieve goals based on the
  // ─ tasks assigned to them.
  // ────────────────────────────────────────────────────────

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
    tools: [],
  });

  // Define tasks
  const searchTask = new Task({
    description: `Search for detailed information about the sports query: {sportsQuery}.`,
    expectedOutput:
      'Detailed information about the sports event. Key players, key moments, final score and other usefull information.',
    agent: searchAgent,
  });

  const writeTask = new Task({
    description: `Using the gathered information, write a detailed article about the sport event.`,
    expectedOutput:
      'A well-structured and engaging sports article. With a title, introduction, body, and conclusion. Min 4 paragrahps long.',
    agent: contentCreator,
  });

  // Team to coordinate the agents
  const team = new Team({
    name: 'Sports Content Creation Team',
    agents: [searchAgent, contentCreator],
    tasks: [searchTask, writeTask],
    inputs: { sportsQuery: 'Who won the Copa America in 2024?' }, // Placeholder for dynamic input
    env: {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    },
    // Results of the latest UEFA Champions League match.
  });

  // ──── Listening to Changes────────────────────────────────────────────
  //
  // Listening to changes in the team's state is crucial for dynamic updates.
  // Yup...KaibanJS utilizes a store similar to Redux for state management.
  //
  // You can subscribe to specific fields or any field on the store.
  //──────────────────────────────────────────────────────────────────────

  team.subscribeToChanges(
    (updatedFields) => {
      console.log('Workflow Status Updated:', updatedFields);
    },
    ['teamWorkflowStatus']
  );

  // ──── Start Team Workflow ───────────────────────────────────────
  //
  // Begins the predefined team process, producing the final result.
  //─────────────────────────────────────────────────────────────────
  const result = await team.start();
  console.log('Final Output:', result);
}

main();
