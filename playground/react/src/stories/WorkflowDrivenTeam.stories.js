import AgentsBoardDebugger from '../AgentsBoardDebugger';
import basicWorkflowTeam from '../teams/workflow_driven/basic_workflow';
import complexWorkflowTeam from '../teams/workflow_driven/complex_workflow';
import suspensionWorkflowTeam from '../teams/workflow_driven/suspension_workflow';
import mixedTeam from '../teams/workflow_driven/mixed_team';
import langchainAiSdkTeam from '../teams/workflow_driven/langchain_ai_sdk_workflow';
import langchainOnlyTeam from '../teams/workflow_driven/langchain_only_workflow';
import aiSdkOnlyTeam from '../teams/workflow_driven/ai_sdk_only_workflow';

import '../index.css';

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
export default {
  title: 'Teams/Workflow-Driven Teams',
  component: AgentsBoardDebugger,
  parameters: {
    docs: {
      description: {
        component: `
# Workflow-Driven Teams

These teams demonstrate the new WorkflowDrivenAgent capabilities in KaibanJS. 
The WorkflowDrivenAgent executes predefined workflows instead of using LLM-based reasoning,
providing deterministic, structured execution with support for:

- **Sequential Processing**: Linear workflow execution
- **Parallel Processing**: Concurrent step execution
- **Conditional Logic**: Branching based on conditions
- **ForEach Operations**: Processing multiple items
- **Suspension/Resumption**: Pausing workflows for manual intervention

## Key Features

- **Deterministic Execution**: Workflows execute the same way every time
- **Type Safety**: Full TypeScript support with Zod schema validation
- **State Management**: Built-in workflow state tracking
- **Error Handling**: Robust error handling and recovery
- **Team Integration**: Seamless integration with existing team system
        `,
      },
    },
  },
};

// Basic workflow demonstration
export const BasicWorkflow = {
  args: {
    team: basicWorkflowTeam,
    title: 'Basic Mathematical Workflow',
  },
  parameters: {
    docs: {
      description: {
        story: `
## Basic Mathematical Workflow

This example demonstrates a simple sequential workflow that:
1. Adds two numbers
2. Multiplies the result by the original inputs
3. Formats the final result with calculation details

**Workflow Steps:**
- \`add\`: Adds input numbers a + b
- \`multiply\`: Multiplies sum by a * b  
- \`format\`: Creates formatted output with calculation details

**Input:** { a: 5, b: 3 }
**Expected Output:** Mathematical result with calculation breakdown
        `,
      },
    },
  },
};

// Complex workflow demonstration
export const ComplexWorkflow = {
  args: {
    team: complexWorkflowTeam,
    title: 'Complex Workflow with Multiple Patterns',
  },
  parameters: {
    docs: {
      description: {
        story: `
## Complex Workflow with Multiple Patterns

This example demonstrates advanced workflow patterns including:
1. Sequential processing (add → multiply)
2. Conditional branching (even/odd logic)
3. Parallel processing (foreach with concurrency)
4. Result aggregation

**Workflow Steps:**
- \`add\`: Adds input numbers
- \`multiply\`: Multiplies result by inputs
- \`branch\`: Conditional logic for even/odd processing
- \`foreach\`: Parallel processing of items
- \`final\`: Aggregates all results

**Input:** { a: 4, b: 5 }
**Expected Output:** Complex result with sequential, conditional, and parallel processing results
        `,
      },
    },
  },
};

// Suspension workflow demonstration
export const SuspensionWorkflow = {
  args: {
    team: suspensionWorkflowTeam,
    title: 'Workflow with Suspension/Resumption',
  },
  parameters: {
    docs: {
      description: {
        story: `
## Workflow with Suspension/Resumption

This example demonstrates workflow suspension capabilities:
1. Data validation
2. Manual approval step (suspends workflow)
3. Data processing (only after approval)
4. Final result aggregation

**Workflow Steps:**
- \`validate\`: Validates input data
- \`approval\`: Suspends for manual approval
- \`process\`: Processes approved data
- \`final\`: Aggregates workflow results

**Key Features:**
- **Suspension**: Workflow pauses for manual intervention
- **Resumption**: Can resume with approval decision
- **Error Handling**: Graceful handling of rejection

**Input:** { data: 'Sample data for approval workflow' }
**Expected Output:** Workflow result after validation and approval process
        `,
      },
    },
  },
};

// Mixed team demonstration
export const MixedTeam = {
  args: {
    team: mixedTeam,
    title: 'Mixed Workflow-LLM Team',
  },
  parameters: {
    docs: {
      description: {
        story: `
## Mixed Workflow-LLM Team

This example demonstrates how workflow-driven agents can work alongside traditional LLM agents:
1. Workflow-driven data processing (validation and formatting)
2. LLM-based content analysis
3. LLM-based summary generation

**Team Composition:**
- **Data Processor**: WorkflowDrivenAgent for structured data processing
- **Content Analyzer**: ReactChampionAgent for intelligent content analysis
- **Summary Generator**: ReactChampionAgent for summary creation

**Workflow Steps:**
- \`validate-data\`: Validates and counts text
- \`format-data\`: Formats text and adds metadata

**Key Benefits:**
- **Deterministic Processing**: Structured data handling via workflows
- **Intelligent Analysis**: LLM-powered insights and analysis
- **Best of Both Worlds**: Combines reliability of workflows with creativity of LLMs

**Input:** Sample text for analysis
**Expected Output:** Processed data, analysis insights, and summary
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

This example demonstrates a sophisticated research workflow that combines multiple LLM SDKs:

### Workflow Steps
1. **Search Step (LangChain)**: 
   - Uses Tavily search tool for comprehensive web research
   - LangChain AgentExecutor with intelligent tool calling
   - Extracts structured search results with source attribution

2. **Analysis Step (AI SDK)**:
   - Vercel AI SDK with OpenAI for advanced analysis
   - Extracts key points and insights from search results
   - Generates confidence scores and structured summaries
   - Provides objective, factual analysis

### Team Composition
- **Research Agent**: WorkflowDrivenAgent handling the multi-SDK workflow
- **Insights Generator**: ReactChampionAgent providing strategic recommendations

### Key Benefits
- **Multi-SDK Integration**: Leverages strengths of both LangChain and AI SDK
- **Type Safety**: Full Zod schema validation throughout the workflow
- **Structured Processing**: Deterministic execution with rich output
- **Comprehensive Research**: Web search + advanced analysis + strategic insights

**Input:** Research query about AI/ML developments
**Expected Output:** Comprehensive research analysis with key points, summary, confidence score, and strategic insights
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

2. **Analysis Step (LangChain)**:
   - LangChain ChatOpenAI for advanced content analysis
   - Structured prompt engineering for consistent output format
   - Key points extraction and confidence scoring

### Key Benefits
- **Pure LangChain**: Demonstrates LangChain's full capabilities
- **Tool Integration**: Seamless integration with external tools (Tavily)
- **Agent Orchestration**: Sophisticated agent-based workflow execution
- **Research Pipeline**: Complete research-to-analysis workflow

**Input:** Research query about AI/ML trends
**Expected Output:** Comprehensive research analysis with key points, summary, confidence score, and source attribution
        `,
      },
    },
  },
};

// AI SDK only workflow demonstration
export const AiSdkOnlyWorkflow = {
  args: {
    team: aiSdkOnlyTeam,
    title: 'AI SDK Only Content Workflow',
  },
  parameters: {
    docs: {
      description: {
        story: `
## AI SDK Only Content Workflow

This example demonstrates a pure Vercel AI SDK implementation for content generation and enhancement:

### Workflow Steps
1. **Research Step (AI SDK)**: 
   - Uses \`generateText\` with web search tool for research and content creation
   - AI SDK compatible tool calling with Tavily search integration
   - Content generation with research sources and metadata tracking

2. **Enhance Step (AI SDK)**:
   - Uses \`generateObject\` for structured content analysis
   - Quality assessment with readability and source accuracy scoring
   - Key themes extraction and improvement suggestions
   - Enhanced content generation with incorporated improvements

### Key Benefits
- **Pure AI SDK**: Demonstrates AI SDK's full capabilities with tool calling
- **Web Search Integration**: AI SDK compatible tool with Tavily search
- **Structured Generation**: \`generateObject\` for consistent output format
- **Research Pipeline**: Complete research-to-enhancement workflow
- **Quality Assessment**: Built-in content analysis and source accuracy scoring

**Input:** Content topic (e.g., "AI in healthcare")
**Expected Output:** Enhanced content with web research, analysis, quality score, source accuracy, key themes, and improvement suggestions
        `,
      },
    },
  },
};
