import AgentsBoardDebugger from '../AgentsBoardDebugger';
import langchainOnlyTeam from '../teams/workflow_driven/langchain_only_workflow';

import '../index.css';

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
export default {
  title: 'Teams/LangChain Only Workflow',
  component: AgentsBoardDebugger,
  parameters: {
    docs: {
      description: {
        component: `
# LangChain Only Workflow Team

This team demonstrates a pure LangChain workflow implementation using only LangChain components.
The workflow showcases how to build sophisticated research and analysis pipelines using exclusively LangChain tools and agents.

## Key Features

- **Pure LangChain Implementation**: Uses only LangChain components and tools
- **Web Search Integration**: Tavily search tool for comprehensive research
- **Intelligent Analysis**: LangChain agents for content analysis and insights
- **Structured Output**: Zod schema validation for type safety
- **Single Agent Architecture**: WorkflowDrivenAgent handling the entire pipeline

## Workflow Steps

1. **Search Step**: 
   - Uses Tavily search tool for web research
   - LangChain AgentExecutor with intelligent tool calling
   - Extracts and structures search results with source attribution

2. **Analysis Step**:
   - LangChain ChatOpenAI for content analysis
   - Structured prompt engineering for consistent output
   - Key points extraction and confidence scoring

## Environment Variables Required

- \`VITE_OPENAI_API_KEY\`: OpenAI API key for LangChain models
- \`VITE_TAVILY_API_KEY\`: Tavily API key for web search
        `,
      },
    },
  },
};

// LangChain only workflow demonstration
export const LangchainOnlyWorkflow = {
  args: {
    team: langchainOnlyTeam,
    title: 'LangChain Only Research Workflow',
  },
  parameters: {
    docs: {
      description: {
        story: `
## LangChain Only Research Workflow

This example demonstrates a pure LangChain implementation for research and analysis:

### Workflow Steps
1. **Search Step (LangChain)**: 
   - Uses Tavily search tool for comprehensive web research
   - LangChain AgentExecutor with intelligent tool calling
   - Extracts structured search results with source attribution
   - Handles search result processing and formatting

2. **Analysis Step (LangChain)**:
   - LangChain ChatOpenAI for advanced content analysis
   - Structured prompt engineering for consistent output format
   - Key points extraction and confidence scoring
   - Content summarization and insights generation

### Key Benefits
- **Pure LangChain**: Demonstrates LangChain's full capabilities
- **Tool Integration**: Seamless integration with external tools (Tavily)
- **Agent Orchestration**: Sophisticated agent-based workflow execution
- **Structured Processing**: Consistent output format with validation
- **Research Pipeline**: Complete research-to-analysis workflow

### Technical Implementation
- **AgentExecutor**: Orchestrates tool calling and reasoning
- **ChatPromptTemplate**: Structured prompt engineering
- **Tool Calling**: Intelligent tool selection and execution
- **Chain Composition**: Sequential processing with data flow

**Input:** Research query about AI/ML trends
**Expected Output:** Comprehensive research analysis with key points, summary, confidence score, and source attribution
        `,
      },
    },
  },
};
