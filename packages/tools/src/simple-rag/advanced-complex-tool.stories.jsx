import { ToolPreviewer } from '../_utils/ToolPreviewer.jsx';
import { AgentWithToolPreviewer } from '../_utils/AgentWithToolPreviewer.jsx';
import { SimpleRAG } from './index.ts';
// import { RAGToolkit } from '../_utils/rag/ragToolkit';
import { Agent, Task, Team } from '../../../../';
import { OpenAIEmbeddings } from '@langchain/openai';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { ChatOpenAI } from '@langchain/openai';
import { Document as LangChainDocument } from 'langchain/document';
import React from 'react';

export default {
  title: 'Tools/SimpleRAG/AdvancedComplex',
  component: ToolPreviewer,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

// Advanced sample data with rich metadata
const advancedSampleData = [
  {
    id: 'PM001',
    title: 'Product Management Fundamentals',
    category: 'Business',
    subcategory: 'Product Strategy',
    content:
      'Product management involves overseeing the development and lifecycle of products. It includes market research, product strategy, roadmap planning, and cross-functional team coordination. Key responsibilities include defining product vision, gathering requirements, and prioritizing features.',
    tags: ['strategy', 'planning', 'leadership', 'roadmap'],
    priority: 'high',
    difficulty: 'intermediate',
    department: 'Product',
    lastUpdated: '2024-01-15',
    author: 'Sarah Johnson',
  },
  {
    id: 'DEV001',
    title: 'Software Development Lifecycle',
    category: 'Technology',
    subcategory: 'Development',
    content:
      'Software development is the process of creating, designing, deploying, and supporting software. It includes coding, testing, debugging, and maintaining applications. Modern development practices include Agile methodologies, CI/CD pipelines, and DevOps principles.',
    tags: ['coding', 'testing', 'debugging', 'agile', 'devops'],
    priority: 'high',
    difficulty: 'advanced',
    department: 'Engineering',
    lastUpdated: '2024-01-20',
    author: 'Mike Chen',
  },
  {
    id: 'DS001',
    title: 'Data Science and Machine Learning',
    category: 'Technology',
    subcategory: 'Data Analytics',
    content:
      'Data science combines statistics, programming, and domain expertise to extract insights from data. It involves data cleaning, analysis, visualization, and machine learning. Key areas include predictive modeling, natural language processing, and computer vision.',
    tags: ['statistics', 'machine-learning', 'analytics', 'python', 'nlp'],
    priority: 'high',
    difficulty: 'advanced',
    department: 'Data Science',
    lastUpdated: '2024-01-18',
    author: 'Dr. Emily Rodriguez',
  },
  {
    id: 'MKT001',
    title: 'Digital Marketing Strategy',
    category: 'Business',
    subcategory: 'Marketing',
    content:
      'Marketing strategy involves planning and executing campaigns to promote products or services. It includes market analysis, target audience identification, and campaign optimization. Digital marketing encompasses SEO, social media, email marketing, and PPC advertising.',
    tags: ['campaigns', 'audience', 'optimization', 'seo', 'social-media'],
    priority: 'medium',
    difficulty: 'intermediate',
    department: 'Marketing',
    lastUpdated: '2024-01-12',
    author: 'Alex Thompson',
  },
  {
    id: 'CS001',
    title: 'Customer Support Excellence',
    category: 'Service',
    subcategory: 'Support',
    content:
      'Customer support focuses on helping customers with their questions and issues. It includes troubleshooting, problem resolution, and maintaining customer satisfaction. Best practices include active listening, empathy, and follow-up procedures.',
    tags: ['help', 'troubleshooting', 'satisfaction', 'empathy', 'resolution'],
    priority: 'low',
    difficulty: 'beginner',
    department: 'Customer Success',
    lastUpdated: '2024-01-10',
    author: 'Lisa Wang',
  },
  {
    id: 'FIN001',
    title: 'Financial Planning and Investment',
    category: 'Finance',
    subcategory: 'Planning',
    content:
      'Financial planning involves creating strategies for managing money and investments. It includes budgeting, investment planning, risk management, and retirement planning. Key concepts include asset allocation, diversification, and compound interest.',
    tags: [
      'budgeting',
      'investments',
      'risk-management',
      'retirement',
      'diversification',
    ],
    priority: 'high',
    difficulty: 'intermediate',
    department: 'Finance',
    lastUpdated: '2024-01-22',
    author: 'Robert Davis',
  },
  {
    id: 'HR001',
    title: 'Human Resources Management',
    category: 'Business',
    subcategory: 'HR',
    content:
      'Human resources management involves recruiting, training, and managing employees. It includes performance management, employee relations, and compliance with labor laws. HR professionals focus on creating positive workplace culture and employee development.',
    tags: ['recruiting', 'training', 'performance', 'compliance', 'culture'],
    priority: 'medium',
    difficulty: 'intermediate',
    department: 'Human Resources',
    lastUpdated: '2024-01-14',
    author: 'Jennifer Lee',
  },
  {
    id: 'SEC001',
    title: 'Cybersecurity Best Practices',
    category: 'Technology',
    subcategory: 'Security',
    content:
      'Cybersecurity involves protecting systems, networks, and data from digital attacks. It includes threat detection, incident response, and security awareness training. Key areas include network security, application security, and data protection.',
    tags: ['security', 'threats', 'protection', 'compliance', 'awareness'],
    priority: 'high',
    difficulty: 'advanced',
    department: 'IT Security',
    lastUpdated: '2024-01-25',
    author: 'David Kim',
  },
];

// Create documents with metadata for better filtering
const createDocumentsWithMetadata = (data) => {
  return data.map((item) => {
    const content = `Title: ${item.title}
Category: ${item.category}
Subcategory: ${item.subcategory}
Content: ${item.content}
Tags: ${item.tags.join(', ')}
Priority: ${item.priority}
Difficulty: ${item.difficulty}
Department: ${item.department}
Last Updated: ${item.lastUpdated}
Author: ${item.author}`;

    return new LangChainDocument({
      pageContent: content,
      metadata: {
        id: item.id,
        title: item.title,
        category: item.category,
        subcategory: item.subcategory,
        tags: item.tags,
        priority: item.priority,
        difficulty: item.difficulty,
        department: item.department,
        lastUpdated: item.lastUpdated,
        author: item.author,
      },
    });
  });
};

// Create shared configuration
const sharedEmbeddings = new OpenAIEmbeddings({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
});

const sharedVectorStore = new MemoryVectorStore(sharedEmbeddings);

// Create advanced RAG toolkit with custom configuration
// const advancedRAGToolkit = new RAGToolkit({
//   embeddings: sharedEmbeddings,
//   vectorStore: sharedVectorStore,
//   llmInstance: new ChatOpenAI({
//     model: 'gpt-4o-mini',
//     temperature: 0.1,
//     apiKey: import.meta.env.VITE_OPENAI_API_KEY,
//   }),
//   chunkOptions: { chunkSize: 800, chunkOverlap: 150 },
//   promptQuestionTemplate: `
//     You are an expert knowledge assistant with access to a comprehensive knowledge base.
//     Use the following pieces of context to answer the question at the end.

//     The context contains information about various business topics with detailed metadata including:
//     - Categories and subcategories
//     - Priority levels (high, medium, low)
//     - Difficulty levels (beginner, intermediate, advanced)
//     - Departments and authors
//     - Tags and keywords

//     Context: {context}
//     Question: {question}

//     Please provide a comprehensive answer that:
//     1. Directly addresses the question
//     2. References relevant metadata when appropriate
//     3. Suggests related topics if applicable
//     4. Maintains a professional and helpful tone

//     If you don't know the answer, just say that you don't know.
//   `,
//   env: { OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY },
// });

// Initialize vector store with documents that have metadata
const initializeAdvancedVectorStore = async () => {
  const documents = createDocumentsWithMetadata(advancedSampleData);

  // Add documents directly to vector store with metadata
  await sharedVectorStore.addDocuments(documents);
  console.log('Advanced vector store initialized with metadata-rich documents');
};

// Create SimpleRAG tool with advanced configuration
const advancedRAGTool = new SimpleRAG({
  OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY,
  embeddings: sharedEmbeddings,
  vectorStore: sharedVectorStore,
  llmInstance: new ChatOpenAI({
    model: 'gpt-4o-mini',
    temperature: 0.1,
    apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  }),
  chunkOptions: { chunkSize: 800, chunkOverlap: 150 },
  retrieverOptions: {
    k: 4, // Retrieve top 4 most relevant documents
    filter: undefined, // Can be used for metadata filtering
    searchType: 'similarity',
    scoreThreshold: 0.7, // Only return results above this similarity threshold
  },
  promptQuestionTemplate: `
    You are an expert knowledge assistant with access to a comprehensive knowledge base.
    Use the following pieces of context to answer the question at the end.
    
    The context contains information about various business topics with detailed metadata including:
    - Categories and subcategories
    - Priority levels (high, medium, low)
    - Difficulty levels (beginner, intermediate, advanced)
    - Departments and authors
    - Tags and keywords
    
    Context: {context}
    Question: {question}
    
    Please provide a comprehensive answer that:
    1. Directly addresses the question
    2. References relevant metadata when appropriate
    3. Suggests related topics if applicable
    4. Maintains a professional and helpful tone
    
    If you don't know the answer, just say that you don't know.
  `,
});

// Create specialized agents
const businessAnalyst = new Agent({
  name: 'Business Analyst',
  role: 'Business Intelligence Specialist',
  goal: 'Analyze business-related topics and provide strategic insights',
  tools: [advancedRAGTool],
});

const technicalExpert = new Agent({
  name: 'Technical Expert',
  role: 'Technology and Development Specialist',
  goal: 'Provide technical guidance and development insights',
  tools: [advancedRAGTool],
});

const complianceOfficer = new Agent({
  name: 'Compliance Officer',
  role: 'Compliance and Risk Management Specialist',
  goal: 'Ensure compliance and manage risk-related information',
  tools: [advancedRAGTool],
});

// Create specialized tasks
const businessAnalysisTask = new Task({
  description:
    'Analyze business topics and provide strategic insights: {query}',
  expectedOutput:
    'Comprehensive business analysis with strategic recommendations.',
  agent: businessAnalyst,
});

const technicalAnalysisTask = new Task({
  description: 'Provide technical guidance and development insights: {query}',
  expectedOutput: 'Detailed technical analysis with implementation guidance.',
  agent: technicalExpert,
});

const complianceAnalysisTask = new Task({
  description: 'Analyze compliance and risk management topics: {query}',
  expectedOutput:
    'Compliance analysis with risk assessment and recommendations.',
  agent: complianceOfficer,
});

// Create the advanced team
const advancedTeam = new Team({
  name: 'Advanced Analysis Team',
  agents: [businessAnalyst, technicalExpert, complianceOfficer],
  tasks: [businessAnalysisTask, technicalAnalysisTask, complianceAnalysisTask],
  inputs: {
    query:
      'What are the high-priority technology topics that require immediate attention?',
  },
  env: {
    OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY,
  },
});

// Initialize vector store
initializeAdvancedVectorStore();

// Story exports with different query types and filtering scenarios
export const AdvancedGeneralQuery = {
  args: {
    toolInstance: advancedRAGTool,
    callParams: {
      query:
        'What are the main categories and subcategories in our knowledge base?',
      content: advancedSampleData
        .map((item) => `${item.title}: ${item.content}`)
        .join('\n\n'),
      retrieverOptions: {
        k: 6,
        searchType: 'similarity',
      },
    },
  },
};

export const PriorityBasedFiltering = {
  args: {
    toolInstance: advancedRAGTool,
    callParams: {
      query:
        'Show me all high-priority topics that require immediate attention',
      content: advancedSampleData
        .map((item) => `${item.title}: ${item.content}`)
        .join('\n\n'),
      retrieverOptions: {
        k: 5,
        searchType: 'similarity',
      },
    },
  },
};

export const DepartmentSpecificQuery = {
  args: {
    toolInstance: advancedRAGTool,
    callParams: {
      query:
        'What are the key responsibilities and best practices for the Engineering department?',
      content: advancedSampleData
        .map((item) => `${item.title}: ${item.content}`)
        .join('\n\n'),
      retrieverOptions: {
        k: 4,
        searchType: 'similarity',
      },
    },
  },
};

export const DifficultyLevelQuery = {
  args: {
    toolInstance: advancedRAGTool,
    callParams: {
      query:
        'Find beginner-friendly topics that new employees should learn first',
      content: advancedSampleData
        .map((item) => `${item.title}: ${item.content}`)
        .join('\n\n'),
      retrieverOptions: {
        k: 3,
        searchType: 'similarity',
      },
    },
  },
};

export const TagBasedSearch = {
  args: {
    toolInstance: advancedRAGTool,
    callParams: {
      query: 'Find topics related to security, compliance, and risk management',
      content: advancedSampleData
        .map((item) => `${item.title}: ${item.content}`)
        .join('\n\n'),
      retrieverOptions: {
        k: 4,
        searchType: 'similarity',
      },
    },
  },
};

export const AuthorSpecificQuery = {
  args: {
    toolInstance: advancedRAGTool,
    callParams: {
      query: 'What topics were authored by Dr. Emily Rodriguez?',
      content: advancedSampleData
        .map((item) => `${item.title}: ${item.content}`)
        .join('\n\n'),
      retrieverOptions: {
        k: 3,
        searchType: 'similarity',
      },
    },
  },
};

export const withAdvancedAgent = {
  render: (args) => <AgentWithToolPreviewer {...args} />,
  args: {
    team: advancedTeam,
  },
};

// Advanced utility functions for demonstration
export const searchWithMetadataFilter = async (filterCriteria) => {
  const retriever = sharedVectorStore.asRetriever({
    k: 5,
    filter: filterCriteria,
  });
  return retriever.invoke('relevant search query');
};

export const searchByPriority = async (priority) => {
  const retriever = sharedVectorStore.asRetriever({
    k: 5,
    filter: { priority: priority },
  });
  return retriever.invoke('priority-based search');
};

export const searchByDepartment = async (department) => {
  const retriever = sharedVectorStore.asRetriever({
    k: 5,
    filter: { department: department },
  });
  return retriever.invoke('department-specific search');
};

export const searchByDifficulty = async (difficulty) => {
  const retriever = sharedVectorStore.asRetriever({
    k: 5,
    filter: { difficulty: difficulty },
  });
  return retriever.invoke('difficulty-based search');
};
