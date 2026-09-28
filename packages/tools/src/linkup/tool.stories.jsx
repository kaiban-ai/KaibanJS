import { ToolPreviewer } from '../_utils/ToolPreviewer.jsx';
import { LinkupSearch } from './index.ts';
import { Agent, Task, Team } from '../../../../';
import React from 'react';
import { AgentWithToolPreviewer } from '../_utils/AgentWithToolPreviewer.jsx';

export default {
  title: 'Tools/LinkupSearch',
  component: ToolPreviewer,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {},
};

const linkupTool = new LinkupSearch({
  apiKey: import.meta.env.VITE_LINKUP_API_KEY,
  depth: 'standard',
  outputType: 'searchResults',
  maxResults: 5,
});

// Create an agent with the linkup tool
const researchAgent = new Agent({
  name: 'Insight',
  role: 'Research Analyst',
  goal: 'Provide comprehensive research and analysis on specific topics using high-quality sources.',
  background: 'Advanced Research and Data Analysis',
  tools: [linkupTool],
});

// Create a research task
const researchTask = new Task({
  description:
    'Research and analyze the following topic: {query}. Focus on high-quality sources and recent developments. Please use markdown format for the output.',
  expectedOutput:
    'A detailed analysis in markdown format with insights from reputable sources, including links to the sources used.',
  agent: researchAgent,
});

// Create the team
const team = new Team({
  name: 'Web Research Team',
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
    toolInstance: linkupTool,
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
