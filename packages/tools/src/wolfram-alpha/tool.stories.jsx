import { ToolPreviewer } from '../_utils/ToolPreviewer.jsx';
import { WolframAlphaTool } from './index.ts';
import { Agent, Task, Team } from '../../../../src/index';
import React from 'react';
import { AgentWithToolPreviewer } from '../_utils/AgentWithToolPreviewer.jsx';

export default {
  title: 'Tools/WolframAlpha',
  component: ToolPreviewer,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {},
};

const wolframTool = new WolframAlphaTool({
  appId: import.meta.env.VITE_WOLFRAM_APP_ID,
});

// Create an agent with the wolfram tool
const mathScientist = new Agent({
  name: 'Euler',
  role: 'Mathematical and Scientific Analyst',
  goal: 'Solve complex mathematical and scientific problems with precise calculations and detailed explanations.',
  background: 'Advanced Mathematics and Scientific Computing',
  tools: [wolframTool],
});

// Create a computation task
const computationTask = new Task({
  description:
    'Analyze and solve the following problem: {query}. Provide detailed steps and explanations in markdown format.',
  expectedOutput:
    'A comprehensive solution in markdown format including calculations, visualizations (if applicable), and detailed explanations. Markdown format.',
  agent: mathScientist,
});

// Create the team
const team = new Team({
  name: 'Scientific Computing Team',
  agents: [mathScientist],
  tasks: [computationTask],
  inputs: {
    query: 'Calculate the orbital period of Mars around the Sun',
  },
  env: {
    OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY,
  },
});

export const Default = {
  args: {
    toolInstance: wolframTool,
    callParams: {
      query: 'Calculate the orbital period of Mars around the Sun',
    },
  },
};

export const withAgent = {
  render: (args) => <AgentWithToolPreviewer {...args} />,
  args: {
    team: team,
  },
};
