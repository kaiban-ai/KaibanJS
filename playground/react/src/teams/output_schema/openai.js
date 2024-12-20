import { Agent, Task, Team } from 'kaibanjs';
import { z } from 'zod';

// Define agents
const writerAgent = new Agent({
  name: 'Clark Kent',
  role: 'Write history fact summary',
  goal: 'Write a summary about any given historical fact.',
  background: 'Writer',
  type: 'ReactChampionAgent',
});

const schemaSummary = z.object({
  title: z.string().describe('The title for historical fact summary'),
  summary: z.string().describe('The historical fact summary'),
  time_range: z
    .string()
    .describe(
      'Range of years in which the historical fact occurs. example: "1815-1816" '
    ),
  figures: z
    .array(z.string())
    .describe('List of historical figures involved in the historical fact'),
  countries: z
    .array(z.string())
    .describe('List of countries involved in the historical fact'),
  words: z.number().describe('Number of words in the summary'),
});

// Define tasks
const writeTask = new Task({
  description: `Write detailed summaries about a given historical fact, giving dates, historical figures involved, motives, and repercussions of the fact.`,
  expectedOutput:
    'A well-structured and detailed summary about historical fact, add metadata like title, epoch of fact, historical figures, countries and number of words',
  outputSchema: schemaSummary,
  agent: writerAgent,
});

// Team to coordinate the agents
const team = new Team({
  name: 'History fact summary Team',
  agents: [writerAgent],
  tasks: [writeTask],
  inputs: { fact: 'battle of waterloo' }, // Placeholder for dynamic input
  env: { OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY }, // Environment variables for the team,
  logLevel: 'error',
});
export default team;
