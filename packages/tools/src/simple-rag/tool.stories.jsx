import { ToolPreviewer } from '../_utils/ToolPreviewer.jsx';
import { AgentWithToolPreviewer } from '../_utils/AgentWithToolPreviewer.jsx';
import { SimpleRAG } from './index.js';
import { Agent, Task, Team } from '../../../../src/index';
import React from 'react';

export default {
  title: 'Tools/SimpleRAG',
  component: ToolPreviewer,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};
const content =
  'France is a country in Europe. It is known for its rich history, culture, and cuisine. The country has many famous landmarks, including the Eiffel Tower, the Louvre Museum, and the Notre-Dame Cathedral. France is also known for its wine regions, such as Bordeaux and Burgundy. The capital of France is Paris, which is a major global city and a center for art, fashion, and commerce.';

const simpleRAGTool = new SimpleRAG({
  OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY,
  //   /* Use just if want to customize the tool with different options instead default values */
  //   loaderOptions: { /* loader-specific options */ },
  //   chunkOptions: { chunkSize: 1000, chunkOverlap: 200 },
  //   embeddings: new OpenAIEmbeddings({ apiKey: import.meta.env.VITE_OPENAI_API_KEY }),
  //   vectorStore: new MemoryVectorStore(new OpenAIEmbeddings({ apiKey: import.meta.env.VITE_OPENAI_API_KEY })),
  //   llm: new ChatOpenAI({ apiKey: import.meta.env.VITE_OPENAI_API_KEY }),
  //   promptQuestionTemplate: 'Your custom prompt template',
});

// Create an agent with the simpleRAG tool
const questionAnswerer = new Agent({
  name: 'QA Agent',
  role: 'Question Answerer',
  goal: 'Answer questions using the RAG toolkit',
  tools: [simpleRAGTool],
});

// Create a question answering task
const qaTask = new Task({
  description: 'Answer the following question: {query}',
  expectedOutput: 'A detailed answer to the question.',
  agent: questionAnswerer,
});

// Create the team
const team = new Team({
  name: 'QA Team',
  agents: [questionAnswerer],
  tasks: [qaTask],
  inputs: {
    query: 'What is the capital of France?',
    content,
  },
  env: {
    OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY,
  },
});

export const Default = {
  args: {
    toolInstance: simpleRAGTool,
    callParams: {
      query: 'What is the capital of France?',
      content,
    },
  },
};

export const withAgent = {
  render: (args) => <AgentWithToolPreviewer {...args} />,
  args: {
    team: team,
  },
};
