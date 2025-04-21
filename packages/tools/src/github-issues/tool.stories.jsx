import { ToolPreviewer } from '../_utils/ToolPreviewer.jsx';
import { AgentWithToolPreviewer } from '../_utils/AgentWithToolPreviewer.jsx';
import { GithubIssues } from './index.ts';
import { Agent, Task, Team } from '../../../../src/index';
import React from 'react';

export default {
  title: 'Tools/Github Issues',
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {},
};

const githubTool = new GithubIssues({
  token: import.meta.env.VITE_GITHUB_TOKEN,
  limit: 5,
});

export const Default = {
  render: (args) => <ToolPreviewer {...args} />,
  args: {
    toolInstance: githubTool,
    callParams: {
      repoUrl: 'https://github.com/facebook/react',
    },
  },
};

// Create an agent with the GitHub tool
const issueAnalyzer = new Agent({
  name: 'Issue Analyzer',
  role: 'GitHub Repository Inspector',
  goal: 'Analyze and summarize GitHub repository issues',
  tools: [githubTool],
});

// Create an analysis task
const issueAnalysisTask = new Task({
  description:
    'Fetch and analyze issues from the following repository: {repoUrl}',
  agent: issueAnalyzer,
  expectedOutput: 'A structured summary of repository issues',
});

// Create the team
const team = new Team({
  name: 'Repository Analysis Unit',
  description: 'Specialized team for GitHub repository issue analysis',
  agents: [issueAnalyzer],
  tasks: [issueAnalysisTask],
  inputs: {
    repoUrl: 'https://github.com/facebook/react',
  },
  env: {
    OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY,
  },
});

export const withAgent = {
  render: (args) => <AgentWithToolPreviewer {...args} />,
  args: {
    team: team,
  },
};
