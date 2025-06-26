import { ToolPreviewer } from '../_utils/ToolPreviewer.jsx';
import { AgentWithToolPreviewer } from '../_utils/AgentWithToolPreviewer.jsx';
import { SimpleRAG } from './index.ts';
import { RAGToolkit } from '../_utils/rag/ragToolkit';
import { Agent, Task, Team } from '../../../../';
import { OpenAIEmbeddings } from '@langchain/openai';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { ChatOpenAI } from '@langchain/openai';
import React from 'react';

export default {
  title: 'Tools/SimpleRAG/Complex',
  component: ToolPreviewer,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

// Sample data with multiple fields
const sampleData = [
  {
    id: 1,
    title: 'Product Management',
    category: 'Business',
    content:
      'Product management involves overseeing the development and lifecycle of products. It includes market research, product strategy, roadmap planning, and cross-functional team coordination.',
    tags: ['strategy', 'planning', 'leadership'],
    priority: 'high',
  },
  {
    id: 2,
    title: 'Software Development',
    category: 'Technology',
    content:
      'Software development is the process of creating, designing, deploying, and supporting software. It includes coding, testing, debugging, and maintaining applications.',
    tags: ['coding', 'testing', 'debugging'],
    priority: 'medium',
  },
  {
    id: 3,
    title: 'Data Science',
    category: 'Technology',
    content:
      'Data science combines statistics, programming, and domain expertise to extract insights from data. It involves data cleaning, analysis, visualization, and machine learning.',
    tags: ['statistics', 'machine-learning', 'analytics'],
    priority: 'high',
  },
  {
    id: 4,
    title: 'Marketing Strategy',
    category: 'Business',
    content:
      'Marketing strategy involves planning and executing campaigns to promote products or services. It includes market analysis, target audience identification, and campaign optimization.',
    tags: ['campaigns', 'audience', 'optimization'],
    priority: 'medium',
  },
  {
    id: 5,
    title: 'Customer Support',
    category: 'Service',
    content:
      'Customer support focuses on helping customers with their questions and issues. It includes troubleshooting, problem resolution, and maintaining customer satisfaction.',
    tags: ['help', 'troubleshooting', 'satisfaction'],
    priority: 'low',
  },
  {
    id: 6,
    title: 'Financial Planning',
    category: 'Finance',
    content:
      'Financial planning involves creating strategies for managing money and investments. It includes budgeting, investment planning, risk management, and retirement planning.',
    tags: ['budgeting', 'investments', 'risk-management'],
    priority: 'high',
  },
];

// Convert sample data to structured text format for RAG
const structuredContent = sampleData
  .map(
    (item) =>
      `ID: ${item.id}
Title: ${item.title}
Category: ${item.category}
Content: ${item.content}
Tags: ${item.tags.join(', ')}
Priority: ${item.priority}
---`
  )
  .join('\n\n');

// Create shared configuration
const sharedEmbeddings = new OpenAIEmbeddings({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
});

const sharedVectorStore = new MemoryVectorStore(sharedEmbeddings);

// Create RAG toolkit with shared configuration
const ragToolkit = new RAGToolkit({
  embeddings: sharedEmbeddings,
  vectorStore: sharedVectorStore,
  llmInstance: new ChatOpenAI({
    model: 'gpt-4o-mini',
    temperature: 0,
    apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  }),
  chunkOptions: { chunkSize: 500, chunkOverlap: 100 },
  promptQuestionTemplate: `
    Use the following pieces of context to answer the question at the end.
    The context contains information about various topics with categories, tags, and priorities.
    If you don't know the answer, just say that you don't know.
    
    Context: {context}
    Question: {question}
    
    Please provide a detailed answer based on the context provided.
  `,
  env: { OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY },
});

// Initialize the vector store with sample data
const initializeVectorStore = async () => {
  await ragToolkit.addDocuments([
    { source: structuredContent, type: 'string' },
  ]);
  console.log('Vector store initialized with sample data');
};

// Create SimpleRAG tool with shared vector store
const complexRAGTool = new SimpleRAG({
  OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY,
  embeddings: sharedEmbeddings,
  vectorStore: sharedVectorStore,
  llmInstance: new ChatOpenAI({
    model: 'gpt-4o-mini',
    temperature: 0,
    apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  }),
  chunkOptions: { chunkSize: 500, chunkOverlap: 100 },
  retrieverOptions: {
    k: 3, // Retrieve top 3 most relevant documents
    filter: undefined, // Can be used for filtering by metadata
    searchType: 'similarity',
  },
  promptQuestionTemplate: `
    Use the following pieces of context to answer the question at the end.
    The context contains information about various topics with categories, tags, and priorities.
    If you don't know the answer, just say that you don't know.
    
    Context: {context}
    Question: {question}
    
    Please provide a detailed answer based on the context provided.
  `,
});

// Create an agent with the complex RAG tool
const dataAnalyst = new Agent({
  name: 'Data Analyst',
  role: 'Data Analysis Specialist',
  goal: 'Analyze and answer questions about the stored data using advanced RAG capabilities',
  tools: [complexRAGTool],
});

// Create analysis tasks
const generalAnalysisTask = new Task({
  description: 'Analyze and answer questions about the stored data: {query}',
  expectedOutput:
    'A comprehensive analysis and answer based on the stored data.',
  agent: dataAnalyst,
});

const categoryAnalysisTask = new Task({
  description: 'Find information about specific categories: {query}',
  expectedOutput: 'Detailed information about the requested category.',
  agent: dataAnalyst,
});

const priorityAnalysisTask = new Task({
  description: 'Analyze high priority items: {query}',
  expectedOutput: 'Analysis of high priority items from the data.',
  agent: dataAnalyst,
});

// Create the team
const analysisTeam = new Team({
  name: 'Data Analysis Team',
  agents: [dataAnalyst],
  tasks: [generalAnalysisTask, categoryAnalysisTask, priorityAnalysisTask],
  inputs: {
    query: 'What are the main categories of information in the database?',
  },
  env: {
    OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY,
  },
});

// Initialize vector store when component mounts
initializeVectorStore();

export const ComplexDataAnalysis = {
  args: {
    toolInstance: complexRAGTool,
    callParams: {
      query: 'What are the main categories of information in the database?',
      content: structuredContent,
      retrieverOptions: {
        k: 5,
        searchType: 'similarity',
      },
    },
  },
};

export const CategorySpecificQuery = {
  args: {
    toolInstance: complexRAGTool,
    callParams: {
      query: 'Tell me about technology-related topics',
      content: structuredContent,
      retrieverOptions: {
        k: 3,
        searchType: 'similarity',
      },
    },
  },
};

export const PriorityBasedQuery = {
  args: {
    toolInstance: complexRAGTool,
    callParams: {
      query: 'What are the high priority items?',
      content: structuredContent,
      retrieverOptions: {
        k: 4,
        searchType: 'similarity',
      },
    },
  },
};

export const TagBasedQuery = {
  args: {
    toolInstance: complexRAGTool,
    callParams: {
      query: 'Find items related to planning and strategy',
      content: structuredContent,
      retrieverOptions: {
        k: 3,
        searchType: 'similarity',
      },
    },
  },
};

export const withAgent = {
  render: (args) => <AgentWithToolPreviewer {...args} />,
  args: {
    team: analysisTeam,
  },
};

// Additional utility functions for demonstration
export const searchByCategory = async (category) => {
  const results = await ragToolkit.search(`category: ${category}`);
  return results;
};

export const searchByPriority = async (priority) => {
  const results = await ragToolkit.search(`priority: ${priority}`);
  return results;
};

export const searchByTags = async (tags) => {
  const results = await ragToolkit.search(`tags: ${tags.join(' ')}`);
  return results;
};
