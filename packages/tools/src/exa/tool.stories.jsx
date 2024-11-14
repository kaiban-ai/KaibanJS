import { ToolPreviewer } from '../_utils/ToolPreviewer.jsx';
import { ExaSearch } from './index.js';
import { Agent, Task, Team } from '../../../../src/index';
import React from 'react';
import { AgentWithToolPreviewer } from '../_utils/AgentWithToolPreviewer.jsx';

export default {
  title: 'Tools/ExaSearch',
  component: ToolPreviewer,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {},
};

const exaTool = new ExaSearch({
  apiKey: import.meta.env.VITE_EXA_API_KEY,
  type: 'neural',
  contents: {
    text: true,
    summary: true,
  },
});

// Create an agent with the exa tool
const researchAgent = new Agent({
  name: 'Insight',
  role: 'Research Analyst',
  goal: 'Provide comprehensive research and analysis on specific topics using high-quality sources.',
  background: 'Advanced Research and Data Analysis',
  tools: [exaTool],
});

// Create a research task
const researchTask = new Task({
  description:
    'Research and analyze the following topic: {query}. Focus on high-quality sources and recent developments. Please use markdown format for the output.',
  expectedOutput:
    'A detailed analysis in markdown format with insights from reputable sources, including academic papers and expert opinions.',
  agent: researchAgent,
});

// Create the team
const team = new Team({
  name: 'Deep Research Team',
  agents: [researchAgent],
  tasks: [researchTask],
  inputs: {
    query: 'Latest breakthroughs in quantum computing',
  },
  env: {
    OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY,
  },
});

export const Default = {
  args: {
    toolInstance: exaTool,
    callParams: {
      query: 'Latest breakthroughs in quantum computing',
    },
  },
};

export const withAgent = {
  render: (args) => <AgentWithToolPreviewer {...args} />,
  args: {
    team: team,
  },
};
