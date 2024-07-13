// Assuming agenticjs is a local module or a placeholder for demonstration purposes
const { Agent, Task, Team } = require('../../dist/bundle.cjs.js');

require('dotenv').config({ path: './.env.local' });

async function main() {
  // Define agents
  const researcher = new Agent({
    name: 'Alice',
    role: 'Researcher',
    goal: 'Analyze AI advancements about {topic}',
    background: 'AI researcher',
    tools: []
  });

  const writer = new Agent({
    name: 'Bob',
    role: 'Writer',
    goal: 'Write an article about {topic}',
    background: 'Tech writer',
    tools: []
  });

  // Define tasks
  const researchTask = new Task({
    description: ` Identify the next big trend in {topic}.
    Focus on identifying pros and cons and the overall narrative.
    Your final report should clearly articulate the key points,
    its market opportunities, and potential risks.
    `,
    expectedOutput: 'A comprehensive 3 paragraphs long report on the latest AI trends.',
    agent: researcher
  });

  const writingTask = new Task({
    description: `Compose an insightful article on {topic}.
    Focus on the latest trends and how it's impacting the industry.
    This article should be easy to understand, engaging, and positive.`,
    expectedOutput: 'A 4 paragraph article on {topic} advancements formatted as markdown.',
    agent: writer
  });

  // Create a team
  const team = new Team({
    name: 'Productivity Team',
    agents: [researcher, writer],
    tasks: [researchTask, writingTask],
    inputs: { topic: "AI Agents" },
    verbose: 2
  });

  // Subscribe to any change
  // team.subscribeToChanges(state => {
  //   console.log("Something in the state changed", state);
  // });

  // Subscribe only to changes in 'agents' and 'name'
  const unsubscribe = team.subscribeToChanges((newValues) => {
    console.log("Workflow Updated:", newValues);
  }, ['teamWorkflowStatus']);

  try {
    const result = await team.start();
    console.log(result);
    // After some operations or when no longer needed, you can unsubscribe
    // unsubscribe(); // Call this function to stop listening to state changes when appropriate

  } catch (error) {
    console.error('Failed to start the team:', error);
  }
}

main();