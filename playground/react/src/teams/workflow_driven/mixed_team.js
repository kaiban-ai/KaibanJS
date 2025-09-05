import { Agent, Task, Team } from 'kaibanjs';
import { createStep, createWorkflow } from '@kaibanjs/workflow';
import { z } from 'zod';

// Create workflow steps for data processing
const validateDataStep = createStep({
  id: 'validate-data',
  inputSchema: z.object({ text: z.string() }),
  outputSchema: z.object({
    isValid: z.boolean(),
    text: z.string(),
    wordCount: z.number(),
    characterCount: z.number(),
  }),
  execute: async ({ inputData }) => {
    const { text } = inputData;
    const isValid = text.length > 0 && text.length <= 1000;
    return {
      isValid,
      text,
      wordCount: text.split(' ').length,
      characterCount: text.length,
    };
  },
});

const formatDataStep = createStep({
  id: 'format-data',
  inputSchema: z.object({
    isValid: z.boolean(),
    text: z.string(),
    wordCount: z.number(),
    characterCount: z.number(),
  }),
  outputSchema: z.object({
    formattedText: z.string(),
    metadata: z.object({
      wordCount: z.number(),
      characterCount: z.number(),
      formattedAt: z.string(),
    }),
  }),
  execute: async ({ inputData }) => {
    const { text, wordCount, characterCount } = inputData;
    const formattedText = text.trim().toLowerCase();

    return {
      formattedText,
      metadata: {
        wordCount,
        characterCount,
        formattedAt: new Date().toISOString(),
      },
    };
  },
});

// Create the data processing workflow
const dataProcessingWorkflow = createWorkflow({
  id: 'data-processing-workflow',
  inputSchema: z.object({ text: z.string() }),
  outputSchema: z.object({
    formattedText: z.string(),
    metadata: z.object({
      wordCount: z.number(),
      characterCount: z.number(),
      formattedAt: z.string(),
    }),
  }),
});

// Build the workflow: validate -> format
dataProcessingWorkflow.then(validateDataStep).then(formatDataStep);

dataProcessingWorkflow.commit();

// Define the workflow-driven agent for data processing
const dataProcessorAgent = new Agent({
  name: 'Data Processor',
  type: 'WorkflowDrivenAgent',
  workflow: dataProcessingWorkflow,
});

// Define the LLM-based content analyzer agent
const contentAnalyzerAgent = new Agent({
  name: 'Content Analyzer',
  role: 'Content Analysis Expert',
  goal: 'Analyze processed text and provide insights',
  background:
    'Expert in text analysis, sentiment analysis, and content insights',
  type: 'ReactChampionAgent',
  tools: [],
});

// Define the LLM-based summary generator agent
const summaryGeneratorAgent = new Agent({
  name: 'Summary Generator',
  role: 'Summary Creation Expert',
  goal: 'Generate concise summaries of analyzed content',
  background:
    'Specialized in creating clear, concise summaries from complex analysis',
  type: 'ReactChampionAgent',
  tools: [],
});

// Define tasks
const processDataTask = new Task({
  description: 'Process and validate the input text: {text}',
  expectedOutput: 'Formatted text with validation metadata',
  agent: dataProcessorAgent,
});

const analyzeContentTask = new Task({
  description:
    'Analyze the processed text and provide detailed insights about content quality, sentiment, and key themes',
  expectedOutput:
    'Comprehensive content analysis with insights and recommendations',
  agent: contentAnalyzerAgent,
});

const generateSummaryTask = new Task({
  description: 'Generate a concise summary of the content analysis results',
  expectedOutput: 'Clear and concise summary of the analysis findings',
  agent: summaryGeneratorAgent,
});

// Create the mixed team
const team = new Team({
  name: 'Mixed Workflow-LLM Team',
  agents: [dataProcessorAgent, contentAnalyzerAgent, summaryGeneratorAgent],
  tasks: [processDataTask, analyzeContentTask, generateSummaryTask],
  inputs: {
    text: 'This is a sample text for demonstrating the mixed team capabilities. It combines workflow-driven processing with LLM-based analysis to provide comprehensive text insights.',
  },
  env: {
    OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY,
    ANTHROPIC_API_KEY: import.meta.env.VITE_ANTHROPIC_API_KEY,
  },
});

export default team;
