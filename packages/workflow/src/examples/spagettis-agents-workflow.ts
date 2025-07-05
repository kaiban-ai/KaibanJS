import { ChatOpenAI } from '@langchain/openai';
import { TavilySearchResults } from '@langchain/community/tools/tavily_search';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
  SystemMessagePromptTemplate,
  HumanMessagePromptTemplate,
} from '@langchain/core/prompts';
import { createWorkflow, createStep } from '..';
import { z } from 'zod';
import { Run } from '../run';

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
    apiKey: process.env.OPENAI_API_KEY || '',
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
  const workflow = createWorkflow({
    id: 'agents-workflow',
    inputSchema: z.string(),
    outputSchema: z.string(),
  });

  // First step: Search Agent
  const searchStep = createStep({
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
  const summarizeStep = createStep({
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

const monitorWorkflow = (run: Run<any, any>) => {
  // Monitor overall Workflow status

  // Monitor step results
  const unsubscribe = run.watch((events) => {
    // Log when a new step result is added
    console.log(JSON.stringify(events, null, 2));
  });

  return unsubscribe;
};

// Example usage
const main = async () => {
  try {
    const workflow = createAgentsWorkflow();
    workflow.commit();
    const run = workflow.createRun();
    const unsubscribeMain = monitorWorkflow(run);

    const result = await run.start({
      inputData:
        'What are the latest developments in artificial intelligence on june 2025?',
    });
    console.log('Final result:', result);
    unsubscribeMain();
  } catch (error) {
    console.error('Error:', error);
  }
};

// Export for use in tests or other modules
export { main, createAgentsWorkflow };

// Run the example if this file is executed directly
if (require.main === module) {
  main();
}
