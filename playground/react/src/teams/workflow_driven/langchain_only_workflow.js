import { Agent, Task, Team } from 'kaibanjs';
import { createStep, createWorkflow } from '@kaibanjs/workflow';
import { z } from 'zod';
import { ChatOpenAI } from '@langchain/openai';
import { TavilySearchResults } from '@langchain/community/tools/tavily_search';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
  SystemMessagePromptTemplate,
  HumanMessagePromptTemplate,
} from '@langchain/core/prompts';

// Step 1: LangChain-based web search
const searchStep = createStep({
  id: 'search',
  inputSchema: z.object({ query: z.string() }),
  outputSchema: z.object({
    searchResults: z.string(),
    sources: z.array(z.string()),
  }),
  execute: async ({ inputData }) => {
    const { query } = inputData;

    // Create search tool
    const searchTool = new TavilySearchResults({
      apiKey: import.meta.env.VITE_TAVILY_API_KEY || '',
    });

    // Create search agent with LangChain
    const model = new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature: 0,
      apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
    });

    const prompt = ChatPromptTemplate.fromMessages([
      SystemMessagePromptTemplate.fromTemplate(
        `You are a research assistant that searches for information on the internet.
        Your task is to find comprehensive and accurate information about the given topic.
        Be thorough and focus on finding factual, up-to-date information.
        Provide detailed search results with proper context.
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

    const agentExecutor = new AgentExecutor({
      agent,
      tools: [searchTool],
    });

    const result = await agentExecutor.invoke({
      input: query,
    });

    // Extract sources from the search results
    const sources =
      result.intermediateSteps?.map(
        (step) => step.action?.toolInput?.query || 'Unknown source'
      ) || [];

    return {
      searchResults: result.output,
      sources: sources.slice(0, 5), // Limit to 5 sources
    };
  },
});

// Step 2: LangChain-based content analysis
const analyzeStep = createStep({
  id: 'analyze',
  inputSchema: z.object({
    searchResults: z.string(),
    sources: z.array(z.string()),
  }),
  outputSchema: z.object({
    analysis: z.string(),
    keyPoints: z.array(z.string()),
    summary: z.string(),
    confidence: z.number(),
  }),
  execute: async ({ inputData, getInitData }) => {
    const { searchResults, sources } = inputData;
    const { query } = getInitData();

    // Create analysis model with LangChain
    const model = new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature: 0.3,
      apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
    });

    const prompt = ChatPromptTemplate.fromMessages([
      SystemMessagePromptTemplate.fromTemplate(
        `You are an expert analyst that processes search results and provides comprehensive analysis.
        Your task is to:
        1. Analyze the search results for the query: "{query}"
        2. Extract key points and insights
        3. Provide a concise summary
        4. Assess the confidence level of the information (0-1 scale)
        
        Be objective, factual, and highlight the most important information.
        Format your response as follows:
        Analysis: [detailed analysis]
        Key Points: [bullet points]
        Summary: [concise summary]
        Confidence: [number between 0 and 1]`
      ),
      HumanMessagePromptTemplate.fromTemplate(
        `Search Results: {searchResults}
        
        Sources: {sources}
        
        Please provide a comprehensive analysis of these findings.`
      ),
    ]);

    const chain = prompt.pipe(model);
    const response = await chain.invoke({
      query,
      searchResults,
      sources: sources.join(', '),
    });

    const responseText = response.content;

    // Parse the response to extract structured data
    const lines = responseText.split('\n');
    const analysis =
      lines.find(
        (line) => line.includes('Analysis:') || line.includes('analysis:')
      ) || responseText;
    const keyPointsMatch = responseText.match(
      /Key Points?:?\s*([\s\S]*?)(?=Summary:|$)/i
    );
    const summaryMatch = responseText.match(
      /Summary:?\s*([\s\S]*?)(?=Confidence:|$)/i
    );
    const confidenceMatch = responseText.match(/Confidence:?\s*([0-9.]+)/i);

    const keyPoints = keyPointsMatch
      ? keyPointsMatch[1]
          .split('\n')
          .filter(
            (line) => line.trim().startsWith('-') || line.trim().startsWith('•')
          )
          .map((point) => point.replace(/^[-•]\s*/, '').trim())
          .filter((point) => point.length > 0)
      : ['No key points extracted'];

    const summary = summaryMatch
      ? summaryMatch[1].trim()
      : 'Summary not available';
    const confidence = confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.7;

    return {
      analysis: analysis.replace(/Analysis:?\s*/i, '').trim(),
      keyPoints: keyPoints.slice(0, 5), // Limit to 5 key points
      summary,
      confidence: Math.min(Math.max(confidence, 0), 1), // Ensure between 0 and 1
    };
  },
});

// Create the workflow
const langchainOnlyWorkflow = createWorkflow({
  id: 'langchain-only-workflow',
  inputSchema: z.object({ query: z.string() }),
  outputSchema: z.object({
    analysis: z.string(),
    keyPoints: z.array(z.string()),
    summary: z.string(),
    confidence: z.number(),
    sources: z.array(z.string()),
  }),
});

// Build the workflow: search -> analyze
langchainOnlyWorkflow.then(searchStep).then(analyzeStep);

langchainOnlyWorkflow.commit();

// Define the workflow-driven agent
const langchainAgent = new Agent({
  name: 'LangChain Research Agent',
  type: 'WorkflowDrivenAgent',
  workflow: langchainOnlyWorkflow,
});

// Define the task
const researchTask = new Task({
  description: 'Research and analyze information about: {query}',
  expectedOutput:
    'Comprehensive research analysis with key points, summary, and confidence assessment using LangChain',
  agent: langchainAgent,
});

// Create the team
const team = new Team({
  name: 'LangChain Only Research Team',
  agents: [langchainAgent],
  tasks: [researchTask],
  inputs: {
    query:
      'Latest trends in artificial intelligence and machine learning for 2024',
  },
  env: {
    OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY,
    TAVILY_API_KEY: import.meta.env.VITE_TAVILY_API_KEY,
  },
});

export default team;
