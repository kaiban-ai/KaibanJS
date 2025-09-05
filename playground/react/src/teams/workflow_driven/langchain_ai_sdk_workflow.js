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
import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

const openai = createOpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
});

// Step 1: LangChain-based search agent
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
        `You are a search agent that helps find relevant information on the internet.
        Your task is to search for information about the given topic and return the most relevant results.
        Be thorough and comprehensive in your search.
        Focus on finding factual, up-to-date information.
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

// Step 2: AI SDK-based analysis and summarization
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

    // Use Vercel AI SDK for analysis
    const { text: response } = await generateText({
      model: openai('gpt-4o-mini'),
      system: `You are an expert analyst that processes search results and provides comprehensive analysis.
      Your task is to:
      1. Analyze the search results for the query: "${query}"
      2. Extract key points and insights
      3. Provide a concise summary
      4. Assess the confidence level of the information (0-1 scale)
      
      Be objective, factual, and highlight the most important information.`,
      prompt: `Search Results: ${searchResults}
      
      Sources: ${sources.join(', ')}
      
      Please provide:
      1. A detailed analysis of the findings
      2. Key points as a bulleted list
      3. A concise summary
      4. Confidence level (0-1)`,
      temperature: 0.3,
    });

    // Parse the response to extract structured data
    const lines = response.split('\n');
    const analysis =
      lines.find(
        (line) => line.includes('Analysis:') || line.includes('analysis:')
      ) || response;
    const keyPointsMatch = response.match(
      /Key Points?:?\s*([\s\S]*?)(?=Summary:|$)/i
    );
    const summaryMatch = response.match(
      /Summary:?\s*([\s\S]*?)(?=Confidence:|$)/i
    );
    const confidenceMatch = response.match(/Confidence:?\s*([0-9.]+)/i);

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
const langchainAiSdkWorkflow = createWorkflow({
  id: 'langchain-ai-sdk-workflow',
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
langchainAiSdkWorkflow.then(searchStep).then(analyzeStep);

langchainAiSdkWorkflow.commit();

// Define the workflow-driven agent
const researchAgent = new Agent({
  name: 'Research Agent',
  type: 'WorkflowDrivenAgent',
  workflow: langchainAiSdkWorkflow,
});

// Define the LLM-based insights agent
const insightsAgent = new Agent({
  name: 'Insights Generator',
  role: 'Research Insights Expert',
  goal: 'Generate additional insights and recommendations based on research findings',
  background:
    'Expert in research analysis, trend identification, and strategic recommendations',
  type: 'ReactChampionAgent',
  tools: [],
});

// Define tasks
const researchTask = new Task({
  description: 'Research and analyze information about: {query}',
  expectedOutput:
    'Comprehensive research analysis with key points, summary, and confidence assessment',
  agent: researchAgent,
});

const insightsTask = new Task({
  description:
    'Generate strategic insights and recommendations based on the research findings',
  expectedOutput:
    'Strategic insights, recommendations, and actionable next steps',
  agent: insightsAgent,
});

// Create the mixed team
const team = new Team({
  name: 'LangChain + AI SDK Research Team',
  agents: [researchAgent, insightsAgent],
  tasks: [researchTask, insightsTask],
  inputs: {
    query:
      'Latest developments in artificial intelligence and machine learning in 2024',
  },
  env: {
    OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY,
    ANTHROPIC_API_KEY: import.meta.env.VITE_ANTHROPIC_API_KEY,
    TAVILY_API_KEY: import.meta.env.VITE_TAVILY_API_KEY,
  },
});

export default team;
