import { ToolPreviewer } from '../_utils/ToolPreviewer.jsx';
import { AgentWithToolPreviewer } from '../_utils/AgentWithToolPreviewer.jsx';
import { SimpleRAGRetrieve } from './index.ts';
import { RAGToolkit } from './rag/ragToolkit';
import { Agent, Task, Team } from '../../../../';
import { OpenAIEmbeddings } from '@langchain/openai';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import React from 'react';

export default {
  title: 'Tools/SimpleRAGRetrieve/Complex',
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

// Create shared configuration
const sharedEmbeddings = new OpenAIEmbeddings({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
});

const sharedVectorStore = new MemoryVectorStore(sharedEmbeddings);

// Create RAG toolkit with shared configuration
const ragToolkit = new RAGToolkit({
  embeddings: sharedEmbeddings,
  vectorStore: sharedVectorStore,
  chunkOptions: { chunkSize: 500, chunkOverlap: 100 },
  env: { OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY },
});

// Initialize the vector store with sample data
const initializeVectorStore = async () => {
  // Create individual documents with metadata for each sample data item
  const documents = sampleData.map((item) => ({
    source: item.content, // Use content as the main text
    type: 'string',
    metadata: {
      id: item.id,
      title: item.title,
      category: item.category,
      tags: item.tags,
      priority: item.priority,
      // Add a combined text field for better search
      fullText: `${item.title} ${item.content} ${item.tags.join(' ')}`,
    },
  }));

  await ragToolkit.addDocuments(documents);
  console.log('Vector store initialized with sample data and metadata');
};

// Create SimpleRAG tool with shared vector store
const complexRAGTool = new SimpleRAGRetrieve({
  OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY,
  vectorStore: sharedVectorStore,
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
    No find any information by yourself, use strictly the context provided.
    
    Context: {context}
    Question: {question}
    
    Please provide a detailed answer based on the context provided.
  `,
});

// Create filtered RAG tools for specific use cases
const technologyRAGTool = new SimpleRAGRetrieve({
  OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY,
  vectorStore: sharedVectorStore,
  chunkOptions: { chunkSize: 500, chunkOverlap: 100 },
  retrieverOptions: {
    k: 3,
    filter: ({ metadata }) => metadata.category === 'Technology', // Filter by category
    searchType: 'similarity',
  },
  promptQuestionTemplate: `
    Use the following pieces of context to answer the question at the end.
    If you don't know the answer, just say that you don't know. No find any information by yourself.
    Focus only on technology-related information.
    
    Context: {context}
    Question: {question}
    
    Please provide a detailed answer based on the technology context provided.
  `,
});

const highPriorityRAGTool = new SimpleRAGRetrieve({
  OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY,
  vectorStore: sharedVectorStore,
  chunkOptions: { chunkSize: 500, chunkOverlap: 100 },
  retrieverOptions: {
    k: 3,
    filter: ({ metadata }) => metadata.priority === 'high', // Filter by priority
    searchType: 'similarity',
  },
  promptQuestionTemplate: `
    Use the following pieces of context to answer the question at the end.
    If you don't know the answer, just say that you don't know. No find any information by yourself.
    Focus only on high priority items.
    
    Context: {context}
    Question: {question}
    
    Please provide a detailed answer based on the high priority context provided.
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
    },
  },
};

export const CategorySpecificQuery = {
  args: {
    toolInstance: complexRAGTool,
    callParams: {
      query: 'Tell me about technology-related topics',
    },
  },
};

export const PriorityBasedQuery = {
  args: {
    toolInstance: complexRAGTool,
    callParams: {
      query: 'What are the high priority items?',
    },
  },
};

export const TagBasedQuery = {
  args: {
    toolInstance: complexRAGTool,
    callParams: {
      query: 'Find items related to planning and strategy',
    },
  },
};

export const TechnologyFilteredQuery = {
  args: {
    toolInstance: technologyRAGTool,
    callParams: {
      query: 'What technology topics are available?',
    },
  },
};

export const HighPriorityFilteredQuery = {
  args: {
    toolInstance: highPriorityRAGTool,
    callParams: {
      query: 'What are the most important items to focus on?',
    },
  },
};
// Function to create a dynamic RAG tool with custom filters
export const createFilteredRAGTool = (filters, customPrompt = null) => {
  return new SimpleRAGRetrieve({
    OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY,
    vectorStore: sharedVectorStore,
    chunkOptions: { chunkSize: 500, chunkOverlap: 100 },
    retrieverOptions: {
      k: 3,
      filter: filters,
      searchType: 'similarity',
    },
    promptQuestionTemplate:
      customPrompt ||
      `
      Use the following pieces of context to answer the question at the end.
      If you don't know the answer, just say that you don't know. No find any information by yourself.
      The context has been filtered based on specific criteria.
      
      Context: {context}
      Question: {question}
      
      Please provide a detailed answer based on the filtered context provided.
    `,
  });
};

// Example usage of dynamic filtered tools
const businessHighPriorityTool = createFilteredRAGTool(
  ({ metadata }) =>
    metadata.category === 'Business' && metadata.priority === 'high',
  `
    Use the following pieces of context to answer the question at the end.
    If you don't know the answer, just say that you don't know. No find any information by yourself.
    Focus only on high-priority business topics.
    
    Context: {context}
    Question: {question}
    
    Please provide a detailed answer based on the high-priority business context provided.
  `
);

export const BusinessHighPriorityQuery = {
  args: {
    toolInstance: businessHighPriorityTool,
    callParams: {
      query: 'What are the critical business priorities?',
    },
  },
};

export const withAgent = {
  render: (args) => <AgentWithToolPreviewer {...args} />,
  args: {
    team: analysisTeam,
  },
};
// // Additional utility functions for demonstration
// const searchByCategory = async (category) => {
//   // Create a filtered retriever
//   const filteredRetriever = sharedVectorStore.asRetriever({
//     k: 5,
//     filter: { category: category },
//     searchType: 'similarity',
//   });
//   const results = await filteredRetriever.invoke(
//     'Find information about this category'
//   );
//   return results;
// };

// const searchByPriority = async (priority) => {
//   // Create a filtered retriever
//   const filteredRetriever = sharedVectorStore.asRetriever({
//     k: 5,
//     filter: { priority: priority },
//     searchType: 'similarity',
//   });
//   const results = await filteredRetriever.invoke(
//     'Find high priority information'
//   );
//   return results;
// };

// const searchByTags = async (tags) => {
//   // For tag-based search, we can use a combination of filter and similarity search
//   // Since tags is an array, we might need to search for documents that contain any of the tags
//   const results = await ragToolkit.search(`tags: ${tags.join(' ')}`);
//   return results;
// };

// const searchByMultipleFilters = async (filters) => {
//   // Create a filtered retriever with multiple conditions
//   const filteredRetriever = sharedVectorStore.asRetriever({
//     k: 5,
//     filter: filters, // e.g., { category: 'Technology', priority: 'high' }
//     searchType: 'similarity',
//   });
//   const results = await filteredRetriever.invoke(
//     'Find information matching the filters'
//   );
//   return results;
// };
