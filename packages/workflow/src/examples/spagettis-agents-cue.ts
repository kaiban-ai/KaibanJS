import { ChatOpenAI } from '@langchain/openai';
import { TavilySearchResults } from '@langchain/community/tools/tavily_search';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
  SystemMessagePromptTemplate,
  HumanMessagePromptTemplate,
} from '@langchain/core/prompts';
import { Workflow } from '../workflow';
import { z } from 'zod';

require('dotenv').config({ path: './.env' });

// Create the search tool
const searchTool = new TavilySearchResults({
  apiKey: process.env.TAVILY_API_KEY || '',
});

// Create the search agent
const createSearchAgent = async () => {
  const model = new ChatOpenAI({
    modelName: 'gpt-4o-mini',
    temperature: 0,
  });

  const prompt = ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate(
      `You are a search agent that helps find relevant information on the internet.
    Your task is to search for information about the given topic and return the most relevant results.
    Be thorough and comprehensive in your search.
    {input}
      `
    ),
    HumanMessagePromptTemplate.fromTemplate('{input}'),
    new MessagesPlaceholder('agent_scratchpad'),
  ]);

  const agent = createToolCallingAgent({
    llm: model,
    tools: [searchTool],
    prompt,
  });

  return new AgentExecutor({
    agent,
    tools: [searchTool],
    // verbose: true,
  });
};

// Create the summarization agent
const createSummarizeAgent = async () => {
  const model = new ChatOpenAI({
    modelName: 'gpt-4o-mini',
    temperature: 0,
  });

  const prompt = ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate(
      `You are a summarization agent that creates concise and informative summaries.
        Your task is to take the search results and create a clear, well-structured summary.
        Focus on the most important information and present it in a coherent way.
        {input}`
    ),
    HumanMessagePromptTemplate.fromTemplate('{input}'),
    new MessagesPlaceholder('agent_scratchpad'),
  ]);

  const agent = createToolCallingAgent({
    llm: model,
    tools: [], // No tools needed for summarization
    prompt,
  });

  return new AgentExecutor({
    agent,
    tools: [],
    // verbose: true,
  });
};

// Create the workflow
const createAgentsWorkflow = () => {
  const workflow = Workflow.createWorkflow({
    id: 'agents-workflow',
    inputSchema: z.string(),
    outputSchema: z.string(),
  });

  // First step: Search Agent
  const searchStep = Workflow.createStep({
    id: 'search',
    inputSchema: z.string(),
    outputSchema: z.string(),
    execute: async ({ inputData }) => {
      const searchAgent = await createSearchAgent();
      const result = await searchAgent.invoke({
        input: inputData,
      });
      return result.output;
    },
  });

  // Second step: Summarize Agent
  const summarizeStep = Workflow.createStep({
    id: 'summarize',
    inputSchema: z.string(),
    outputSchema: z.string(),
    execute: async ({ inputData }) => {
      const summarizeAgent = await createSummarizeAgent();
      const result = await summarizeAgent.invoke({
        input: inputData,
      });
      return result.output;
    },
  });

  // Connect the steps sequentially
  workflow.then(searchStep).then(summarizeStep);

  return workflow;
};

const log = (message: string, data?: any) => {
  console.log(`\n[${new Date().toISOString()}] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
};

const monitorWorkflow = (workflow: Workflow<any, any, any>) => {
  // Monitor overall Workflow status
  workflow.watch((event) => {
    log(`Workflow Status Update: ${event.type}`, event.data);
  });

  // Monitor step results
  const unsubscribe = workflow.store.subscribe((state) => {
    // Log when a new step result is added
    const lastLog = state.logs[state.logs.length - 1];
    if (lastLog?.logType === 'StepStatusUpdate') {
      log(`Step ${lastLog.stepId} Status: ${lastLog.stepStatus}`, {
        result: lastLog.stepResult,
        executionPath: state.executionPath,
      });
    }
  });

  return unsubscribe;
};

// Example usage
const main = async () => {
  try {
    const workflow = createAgentsWorkflow();
    const unsubscribeMain = monitorWorkflow(workflow);

    const result = await workflow.start(
      'What are the latest developments in artificial intelligence on june 2025?'
    );
    console.log('Final result:', result);
    unsubscribeMain();
  } catch (error) {
    console.error('Error:', error);
  }
};

main();
