// ESM version
import { Agent, Task, Team } from 'kaibanjs';
import * as dotenv from 'dotenv';

dotenv.config();

// Create multiple agents with different roles
const researcher = new Agent({
  name: 'ResearchBot',
  role: 'Research Specialist',
  goal: 'Gather and analyze information',
  background: 'Expert in data collection and analysis',
});

const writer = new Agent({
  name: 'WriterBot',
  role: 'Content Writer',
  goal: 'Create engaging content from research',
  background: 'Professional content creator and editor',
});

const reviewer = new Agent({
  name: 'ReviewBot',
  role: 'Quality Reviewer',
  goal: 'Ensure content meets quality standards',
  background: 'Quality assurance specialist',
});

// Create tasks for each agent
const researchTask = new Task({
  title: 'Research Topic',
  description: 'Research the given topic and extract key information',
  expectedOutput: 'Structured research data',
  agent: researcher,
});

const writingTask = new Task({
  title: 'Create Content',
  description: 'Transform research into engaging content',
  expectedOutput: 'Draft content',
  agent: writer,
});

const reviewTask = new Task({
  title: 'Review Content',
  description: 'Review and polish the content',
  expectedOutput: 'Final polished content',
  agent: reviewer,
});

// Create and configure the team
const team = new Team({
  name: 'Content Creation Team',
  agents: [researcher, writer, reviewer],
  tasks: [researchTask, writingTask, reviewTask],
  inputs: {
    topic:
      'The impact of artificial intelligence on modern software development',
  },
  env: { OPENAI_API_KEY: process.env.OPENAI_API_KEY },
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
