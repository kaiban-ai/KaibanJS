import { ChatOpenAI } from '@langchain/openai';
import { TavilySearchResults } from '@langchain/community/tools/tavily_search';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
  SystemMessagePromptTemplate,
  HumanMessagePromptTemplate,
} from '@langchain/core/prompts';
import { Cue } from '../../src/cue';
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
  const cue = Cue.createCue({
    id: 'agents-workflow',
    inputSchema: z.string(),
    outputSchema: z.string(),
  });

  // First block: Search Agent
  const searchBlock = Cue.createBlock({
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

  // Second block: Summarize Agent
  const summarizeBlock = Cue.createBlock({
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

  // Connect the blocks sequentially
  cue.then(searchBlock).then(summarizeBlock);

  return cue;
};

const log = (message: string, data?: any) => {
  console.log(`\n[${new Date().toISOString()}] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
};

const monitorCue = (cue: Cue<any, any, any>) => {
  // Monitor overall Cue status
  cue.watch((event) => {
    log(`Cue Status Update: ${event.type}`, event.data);
  });

  // Monitor block results
  const unsubscribe = cue.store.subscribe((state) => {
    // Log when a new block result is added
    const lastLog = state.logs[state.logs.length - 1];
    if (lastLog?.logType === 'BlockStatusUpdate') {
      log(`Block ${lastLog.blockId} Status: ${lastLog.blockStatus}`, {
        result: lastLog.blockResult,
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
    const unsubscribeMain = monitorCue(workflow);

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
