/**
 * Content Creation Team — simple 3-agent pipeline (research → write → review).
 * Reused from playground/nodejs-esm; receives the user message as `topic` in inputs.
 */
import { Agent, Task, Team } from 'kaibanjs';

export function createTeam({ topic }: { topic: string }): Team {
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

  const researchTask = new Task({
    title: 'Research Topic',
    description: 'Research the given {topic} and extract key information',
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

  return new Team({
    name: 'Content Creation Team',
    agents: [researcher, writer, reviewer],
    tasks: [researchTask, writingTask, reviewTask],
    inputs: { topic },
    env: { OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? '' },
  });
}
