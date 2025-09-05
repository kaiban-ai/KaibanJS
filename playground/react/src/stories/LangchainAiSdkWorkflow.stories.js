import AgentsBoardDebugger from '../AgentsBoardDebugger';
import langchainAiSdkTeam from '../teams/workflow_driven/langchain_ai_sdk_workflow';

import '../index.css';

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
export default {
  title: 'Teams/LangChain + AI SDK Workflow',
  component: AgentsBoardDebugger,
  parameters: {
    docs: {
      description: {
        component: `
# LangChain + AI SDK Workflow Team

This team demonstrates the integration of multiple LLM SDKs within a single WorkflowDrivenAgent.
The workflow combines LangChain for web search capabilities with Vercel's AI SDK for advanced analysis,
showcasing how different AI tools can work together in a structured workflow.

## Key Features

- **Multi-SDK Integration**: Combines LangChain and Vercel AI SDK in one workflow
- **Web Search**: LangChain-powered search using Tavily API
- **Advanced Analysis**: AI SDK-powered analysis and summarization
- **Structured Output**: Zod schema validation for type safety
- **Mixed Team**: WorkflowDrivenAgent + ReactChampionAgent collaboration

## Workflow Steps

1. **Search Step (LangChain)**: 
   - Uses Tavily search tool for web research
   - LangChain AgentExecutor for intelligent search
   - Extracts and structures search results

2. **Analysis Step (AI SDK)**:
   - Vercel AI SDK for advanced text analysis
   - Extracts key points and insights
   - Generates confidence scores
   - Creates structured summaries

## Team Composition

- **Research Agent**: WorkflowDrivenAgent handling search and analysis
- **Insights Generator**: ReactChampionAgent providing strategic recommendations

## Environment Variables Required

- \`VITE_OPENAI_API_KEY\`: OpenAI API key for both LangChain and AI SDK
- \`VITE_TAVILY_API_KEY\`: Tavily API key for web search
- \`VITE_ANTHROPIC_API_KEY\`: Anthropic API key for ReactChampionAgent
        `,
      },
    },
  },
};

// LangChain + AI SDK workflow demonstration
export const LangchainAiSdkWorkflow = {
  args: {
    team: langchainAiSdkTeam,
    title: 'LangChain + AI SDK Research Workflow',
  },
  parameters: {
    docs: {
      description: {
        story: `
## LangChain + AI SDK Research Workflow

This example demonstrates a sophisticated research workflow that combines:

### Step 1: LangChain Search Agent
- **Tool**: Tavily Search Results API
- **Agent**: LangChain AgentExecutor with tool calling
- **Purpose**: Comprehensive web research on the given topic
- **Output**: Structured search results with source attribution

### Step 2: AI SDK Analysis Agent  
- **SDK**: Vercel AI SDK with OpenAI
- **Purpose**: Advanced analysis and summarization of search results
- **Features**: 
  - Key point extraction
  - Confidence scoring
  - Structured summary generation
  - Objective analysis

### Workflow Benefits
- **Multi-SDK Integration**: Leverages strengths of both LangChain and AI SDK
- **Type Safety**: Full Zod schema validation throughout
- **Structured Processing**: Deterministic workflow execution
- **Rich Output**: Comprehensive research with confidence metrics

### Team Collaboration
- **Research Agent**: Handles the technical research workflow
- **Insights Generator**: Provides strategic insights and recommendations
- **Seamless Integration**: Workflow results feed into LLM-based insights

**Input:** Research query about AI/ML developments
**Expected Output:** Comprehensive research analysis with key points, summary, confidence score, and strategic insights
        `,
      },
    },
  },
};
