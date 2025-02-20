import { ToolPreviewer } from '../_utils/ToolPreviewer.jsx';
import { AgentWithToolPreviewer } from '../_utils/AgentWithToolPreviewer.jsx';
import { WebsiteSearch } from './index.ts';
import { Agent, Task, Team } from '../../../../src/index';
import React from 'react';

export default {
  title: 'Tools/WebsiteSearch',
  component: ToolPreviewer,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

const websiteSearchTool = new WebsiteSearch({
  OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY,
  url: 'https://docs.kaibanjs.com/get-started/The%20Kaiban%20Board',
});

// Create an agent with the website search tool
const webSearcher = new Agent({
  name: 'Web Searcher',
  role: 'Web Content Analyzer',
  goal: 'Conduct semantic searches within the content of a particular website',
  tools: [websiteSearchTool],
});

// Create a search task
const searchTask = new Task({
  description:
    'Conduct a semantic search on the following URL: {url} and answer the question: {query}',
  expectedOutput:
    'A detailed answer to the question based on the website content.',
  agent: webSearcher,
});

// Create the team
const team = new Team({
  name: 'Web Search Team',
  agents: [webSearcher],
  tasks: [searchTask],
  inputs: {
    url: 'https://docs.kaibanjs.com/get-started/The%20Kaiban%20Board',
    query: 'What is the Kaiban Board?',
  },
  env: {
    OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY,
  },
});

export const Default = {
  args: {
    toolInstance: websiteSearchTool,
    callParams: {
      url: 'https://docs.kaibanjs.com/get-started/The%20Kaiban%20Board',
      query: 'What is the Kaiban Board?',
    },
  },
};

export const withAgent = {
  render: (args) => <AgentWithToolPreviewer {...args} />,
  args: {
    team: team,
  },
};
