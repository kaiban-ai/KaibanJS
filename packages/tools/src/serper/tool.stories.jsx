import { ToolPreviewer } from '../_utils/ToolPreviewer.jsx';
import { Serper } from './index.js';
import { Agent, Task, Team } from '../../../../src/index';
import React from 'react';
import { AgentWithToolPreviewer } from '../_utils/AgentWithToolPreviewer.jsx';

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
export default {
  title: 'Tools/Serper',
  component: ToolPreviewer,
  parameters: {
    // Optional parameter to center the component in the Canvas. More info: https://storybook.js.org/docs/configure/story-layout
    layout: 'centered',
  },
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ['autodocs'],
  // More on argTypes: https://storybook.js.org/docs/api/argtypes
  argTypes: {
    // backgroundColor: { control: 'color' },
  },
};

const serperTool = new Serper({
  apiKey: import.meta.env.VITE_SERPER_API_KEY,
  type: 'news',
});

// Create an agent with the serper tool
const newsGatherer = new Agent({
  name: 'Echo',
  role: 'News Gatherer',
  goal: 'Collect all recent news articles about a specific event using diverse media sources.',
  background: 'Journalism',
  tools: [serperTool],
});

// Create a gather news task
const gatherNewsTask = new Task({
  description:
    'Gather all relevant news articles about the event: {query}. Please use markdown format for the output.',
  expectedOutput:
    'A collection of links and summaries in markdown format of all articles related to the event.',
  agent: newsGatherer,
});

// Create the team
const team = new Team({
  name: 'Global News Report Team',
  agents: [newsGatherer],
  tasks: [gatherNewsTask],
  inputs: {
    query: '2024 US Presidential Election',
  },
  env: {
    OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY,
  },
});

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const Default = {
  args: {
    toolInstance: serperTool,
    callParams: {
      query: '2024 US Presidential Election',
    },
  },
};

export const withAgent = {
  render: (args) => <AgentWithToolPreviewer {...args} />,
  args: {
    team: team,
  },
};
