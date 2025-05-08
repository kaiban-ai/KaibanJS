import { z } from 'zod';
import { ToolPreviewer } from '../_utils/ToolPreviewer.jsx';
import { AgentWithToolPreviewer } from '../_utils/AgentWithToolPreviewer.jsx';
import { GithubIssues } from '../github-issues/index.ts';
import { ZapierWebhook } from './index.ts';
import { Agent, Task, Team } from '../../../../';
import React from 'react';

export default {
  title: 'Tools/Zapier Webhook',
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

const zapierTool = new ZapierWebhook({
  url: 'https://hooks.zapier.com/hooks/catch/4716958/2sdvyu2', // Set your Zapier webhook URL here
  schema: z.object({
    emailSubject: z.string().describe('The subject of the email.'),
    issuesSummary: z.string().describe('The summary of the issues.'),
  }),
});

export const Default = {
  render: (args) => <ToolPreviewer {...args} />,
  args: {
    toolInstance: zapierTool,
    callParams: {
      emailSubject: 'Weekly GitHub Issues Report',
      issuesSummary: 'Summary of the issues found in the repository.',
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

// Create an agent with the Zapier webhook tool
const emailSender = new Agent({
  name: 'Email Sender',
  role: 'Email Reporter',
  goal: 'Send summarized issues via email using Zapier webhook',
  tools: [zapierTool],
});

// Create an analysis task
const issueAnalysisTask = new Task({
  description:
    'Fetch and analyze issues from the following repository: {repoUrl}',
  agent: issueAnalyzer,
  expectedOutput: 'A structured summary of repository issues',
});

// Create a task to send the summary via Zapier webhook
const sendEmailTask = new Task({
  description: 'Send the summarized issues via Zapier webhook',
  agent: emailSender,
  expectedOutput: 'A confirmation that the email was sent successfully',
});

// Create the team
const team = new Team({
  name: 'Issue Reporting Team',
  description:
    'Team to fetch GitHub issues and send them via email using Zapier webhook',
  agents: [issueAnalyzer, emailSender],
  tasks: [issueAnalysisTask, sendEmailTask],
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
