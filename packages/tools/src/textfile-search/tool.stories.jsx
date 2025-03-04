import { ToolPreviewer } from '../_utils/ToolPreviewer.jsx';
import { AgentWithToolPreviewer } from '../_utils/AgentWithToolPreviewer.jsx';
import { TextFileSearch } from './index.ts';
import { Agent, Task, Team } from '../../../../src/index';
import React from 'react';

export default {
  title: 'Tools/TextFileSearch',
  component: ToolPreviewer,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

const textFileTool = new TextFileSearch({
  OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY,
  file: '../../public/kaiban.txt',
});

// Create an agent with the text file tool
const textFileAnalyzer = new Agent({
  name: 'Text File Searcher',
  role: 'Text Content Analyzer',
  goal: 'Conduct semantic searches within the content of a particular text file',
  tools: [textFileTool],
});

// Create a text analysis task
const textAnalysisTask = new Task({
  description:
    'Conduct a semantic search on the following Text file: {file} and answer the question: {query}',
  expectedOutput:
    'A detailed answer to the question based on the website content.',
  agent: textFileAnalyzer,
});

// Create the team
const team = new Team({
  name: 'Text Search Team',
  agents: [textFileAnalyzer],
  tasks: [textAnalysisTask],
  inputs: {
    file: '../../public/kaiban.txt',
    query: 'What is the Kaiban Board?',
  },
  env: {
    OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY,
  },
});

export const Default = {
  args: {
    toolInstance: textFileTool,
    callParams: {
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
