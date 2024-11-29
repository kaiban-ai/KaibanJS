import { ToolPreviewer } from '../_utils/ToolPreviewer.jsx';
import { AgentWithToolPreviewer } from '../_utils/AgentWithToolPreviewer.jsx';
import { PdfSearch } from './index.js';
import { Agent, Task, Team } from '../../../../src/index';
import React from 'react';

export default {
  title: 'Tools/PDFSearch',
  component: ToolPreviewer,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

const pdfFileTool = new PdfSearch({
  OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY,
  file: '../../public/KaibanJS.pdf',
});

// Create an agent with the text file tool
const pdfSearcher = new Agent({
  name: 'PDF File Analyzer',
  role: 'PDF Content Analyzer',
  goal: 'Conduct semantic searches within the content of a particular pdf file',
  tools: [pdfFileTool],
});

// Create a text analysis task
const searchTask = new Task({
  description:
    'Conduct a semantic search on the following PDF: {file} and answer the question: {query}',
  expectedOutput:
    'A detailed answer to the question based on the website content.',
  agent: pdfSearcher,
});

// Create the team
const team = new Team({
  name: 'Pdf Search Team',
  agents: [pdfSearcher],
  tasks: [searchTask],
  inputs: {
    file: '../../public/KaibanJS.pdf',
    query: 'What is Agents in Kaiban?',
  },
  env: {
    OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY,
  },
});

export const Default = {
  args: {
    toolInstance: pdfFileTool,
    callParams: {
      query: 'What is Agents in Kaiban?',
    },
  },
};

export const withAgent = {
  render: (args) => <AgentWithToolPreviewer {...args} />,
  args: {
    team: team,
  },
};
