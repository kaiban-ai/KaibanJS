import { Agent, Task, Team } from 'kaibanjs';
import { createStep, createWorkflow } from '@kaibanjs/workflow';
import { z } from 'zod';
import { generateText, generateObject, tool } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { TavilySearchResults } from '@langchain/community/tools/tavily_search';

const openai = createOpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
});

// Create Tavily search tool instance
const tavilySearch = new TavilySearchResults({
  apiKey: import.meta.env.VITE_TAVILY_API_KEY || '',
});

// Create AI SDK compatible web search tool
const webSearchTool = tool({
  description: 'Search the web for current information about any topic',
  inputSchema: z.object({
    query: z.string().describe('The search query to find information about'),
  }),
  outputSchema: z.object({
    results: z.array(
      z.object({
        title: z.string(),
        url: z.string(),
        content: z.string(),
      })
    ),
    summary: z.string(),
  }),
  execute: async ({ query }) => {
    try {
      // Use Tavily search tool
      const searchResultsRaw = await tavilySearch.invoke(query);
      // console.log({ searchResults });
      const searchResults = JSON.parse(searchResultsRaw);
      // Parse and format results
      const results = searchResults.map((result) => ({
        title: result.title || 'No title',
        url: result.url || '',
        content: result.content || result.snippet || 'No content available',
      }));

      // Create a summary of the search results
      const summary = `Found ${
        results.length
      } results for "${query}". Results include: ${results
        .slice(0, 3)
        .map((r) => r.title)
        .join(', ')}`;

      return {
        results: results.slice(0, 5), // Limit to 5 results
        summary,
      };
    } catch (error) {
      console.error('Search error:', error);
      return {
        results: [],
        summary: `Search failed for "${query}": ${error.message}`,
      };
    }
  },
});

// Step 1: AI SDK-based research and content generation
const researchStep = createStep({
  id: 'research',
  inputSchema: z.object({ topic: z.string() }),
  outputSchema: z.object({
    content: z.string(),
    searchResults: z.array(
      z.object({
        title: z.string(),
        url: z.string(),
        content: z.string(),
      })
    ),
    wordCount: z.number(),
    generatedAt: z.string(),
  }),
  execute: async ({ inputData }) => {
    const { topic } = inputData;

    // Use AI SDK with web search tool to research and generate content
    const { text: content, toolResults } = await generateText({
      model: openai('gpt-4o-mini'),
      system: `You are a professional content writer and researcher who creates engaging and informative articles.
      Your task is to research the given topic using web search and then write comprehensive content.
      Make it well-structured, factual, and engaging for readers.
      Include relevant details and insights that would be valuable to someone learning about this topic.
      Use the web search tool to find current and accurate information.`,
      prompt: `Research and write a comprehensive article about: ${topic}
      
      First, search for current information about this topic.
      Then write an article that should be:
      - Well-structured with clear sections
      - Informative and factual based on your research
      - Engaging and easy to read
      - Include practical insights and examples
      - Be approximately 300-500 words
      - Cite the sources you found in your research`,
      tools: {
        webSearch: webSearchTool,
      },
      maxSteps: 3,
      temperature: 0.7,
    });
    console.log({ toolResults });
    // Extract search results from tool calls
    const searchResults =
      toolResults?.flatMap((result) =>
        result.toolName === 'webSearch' ? result.output.results : []
      ) || [];

    return {
      content,
      searchResults,
      wordCount: content.split(' ').length,
      generatedAt: new Date().toISOString(),
    };
  },
});

// Step 2: AI SDK-based content analysis and enhancement
const enhanceStep = createStep({
  id: 'enhance',
  inputSchema: z.object({
    content: z.string(),
    searchResults: z.array(
      z.object({
        title: z.string(),
        url: z.string(),
        content: z.string(),
      })
    ),
    wordCount: z.number(),
    generatedAt: z.string(),
  }),
  outputSchema: z.object({
    enhancedContent: z.string(),
    analysis: z.object({
      readability: z.string(),
      keyThemes: z.array(z.string()),
      suggestions: z.array(z.string()),
      qualityScore: z.number(),
      sourceAccuracy: z.number(),
    }),
    metadata: z.object({
      originalWordCount: z.number(),
      enhancedWordCount: z.number(),
      processingTime: z.string(),
      sourcesUsed: z.number(),
    }),
  }),
  execute: async ({ inputData, getInitData }) => {
    const { content, searchResults, wordCount } = inputData;
    const { topic } = getInitData();

    const startTime = Date.now();

    // Use AI SDK to analyze and enhance content
    const { object: analysis } = await generateObject({
      model: openai('gpt-4o-mini'),
      system: `You are an expert content analyst and editor.
      Your task is to analyze content quality and provide enhancement suggestions.
      Consider the research sources used and assess the accuracy and relevance of the content.
      Be thorough in your analysis and provide actionable recommendations.`,
      prompt: `Analyze and enhance this content about "${topic}":
      
      Content: ${content}
      
      Research Sources Used: ${searchResults
        .map((r) => `- ${r.title}: ${r.url}`)
        .join('\n')}
      
      Please provide:
      1. A readability assessment (Beginner/Intermediate/Advanced)
      2. Key themes and topics covered
      3. Specific suggestions for improvement
      4. A quality score from 1-10
      5. Source accuracy assessment (0-1 scale)
      
      Then provide an enhanced version of the content that incorporates your suggestions and maintains factual accuracy based on the research sources.`,
      schema: z.object({
        readability: z.string().describe('Content readability level'),
        keyThemes: z.array(z.string()).describe('Main themes covered'),
        suggestions: z.array(z.string()).describe('Improvement suggestions'),
        qualityScore: z.number().min(1).max(10).describe('Quality score 1-10'),
        sourceAccuracy: z
          .number()
          .min(0)
          .max(1)
          .describe('Source accuracy score 0-1'),
        enhancedContent: z.string().describe('Enhanced version of the content'),
      }),
      temperature: 0.3,
    });

    const processingTime = `${Date.now() - startTime}ms`;

    return {
      enhancedContent: analysis.enhancedContent,
      analysis: {
        readability: analysis.readability,
        keyThemes: analysis.keyThemes,
        suggestions: analysis.suggestions,
        qualityScore: analysis.qualityScore,
        sourceAccuracy: analysis.sourceAccuracy,
      },
      metadata: {
        originalWordCount: wordCount,
        enhancedWordCount: analysis.enhancedContent.split(' ').length,
        processingTime,
        sourcesUsed: searchResults.length,
      },
    };
  },
});

// Create the workflow
const aiSdkOnlyWorkflow = createWorkflow({
  id: 'ai-sdk-only-workflow',
  inputSchema: z.object({ topic: z.string() }),
  outputSchema: z.object({
    enhancedContent: z.string(),
    analysis: z.object({
      readability: z.string(),
      keyThemes: z.array(z.string()),
      suggestions: z.array(z.string()),
      qualityScore: z.number(),
      sourceAccuracy: z.number(),
    }),
    metadata: z.object({
      originalWordCount: z.number(),
      enhancedWordCount: z.number(),
      processingTime: z.string(),
      sourcesUsed: z.number(),
    }),
  }),
});

// Build the workflow: research -> enhance
aiSdkOnlyWorkflow.then(researchStep).then(enhanceStep);

aiSdkOnlyWorkflow.commit();

// Define the workflow-driven agent
const aiSdkAgent = new Agent({
  name: 'AI SDK Content Agent',
  type: 'WorkflowDrivenAgent',
  workflow: aiSdkOnlyWorkflow,
});

// Define the task
const contentTask = new Task({
  description: 'Research and create enhanced content about: {topic}',
  expectedOutput:
    'High-quality enhanced content with web research, analysis, and improvement suggestions using Vercel AI SDK with web search tool',
  agent: aiSdkAgent,
});

// Create the team
const team = new Team({
  name: 'AI SDK Research & Content Team',
  agents: [aiSdkAgent],
  tasks: [contentTask],
  inputs: {
    topic: 'The future of artificial intelligence in healthcare',
  },
  env: {
    OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY,
    TAVILY_API_KEY: import.meta.env.VITE_TAVILY_API_KEY,
  },
});

export default team;
