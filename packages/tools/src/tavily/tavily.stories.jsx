import { ToolPreviewer } from '../_utils/ToolPreviewer.jsx';
import { TavilySearchResults } from './index.js';
import { Agent, Task, Team } from '../../../../src/index';
import React from 'react';
import { AgentWithToolPreviewer } from '../_utils/AgentWithToolPreviewer.jsx';

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
export default {
  title: 'Tools/Tavily',
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
  }
};

const tavilyTool = new TavilySearchResults({
  apiKey: import.meta.env.VITE_TAVILY_API_KEY,
  maxResults: 5
});

// Create an agent with the tavily tool
const searchResearcher = new Agent({
  name: 'Search Researcher',
  role: 'Web Search Analyzer',
  goal: 'Perform web searches and analyze the results',
  tools: [tavilyTool],
  maxIterations: 5
});

// Create a research task
const searchAnalysisTask = new Task({
  description: 'Performs a web search for: {searchQuery} and provides a structured summary',
  agent: searchResearcher,
  expectedOutput: 'A well-formatted analysis of the search results'
});

// Create the team
const team = new Team({
  name: 'Search Analysis Unit',
  description: 'Specialized team for web search and analysis',
  agents: [searchResearcher],
  tasks: [searchAnalysisTask],
  inputs: {
    searchQuery: 'What are the latest developments in AI?'
  },
  env: {
    OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY
  }
});

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const Default = {
  args: {
    toolInstance: tavilyTool,
    callParams: {
      searchQuery: 'What are the latest developments in AI?'
    }
  },
};

export const withAgent = {
  render: (args) => <AgentWithToolPreviewer {...args} />,
  args: {
    team: team
  },
};






