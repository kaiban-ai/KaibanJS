import AgentsBoardDebugger from '../AgentsBoardDebugger';
import aiSdkOnlyTeam from '../teams/workflow_driven/ai_sdk_only_workflow';

import '../index.css';

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
export default {
  title: 'Teams/AI SDK Only Workflow',
  component: AgentsBoardDebugger,
  parameters: {
    docs: {
      description: {
        component: `
# AI SDK Only Workflow Team

This team demonstrates a pure Vercel AI SDK workflow implementation using only AI SDK components.
The workflow showcases advanced content generation and analysis capabilities using exclusively Vercel AI SDK tools.

## Key Features

- **Pure AI SDK Implementation**: Uses only Vercel AI SDK components
- **Content Generation**: Advanced text generation with structured prompts
- **Object Generation**: Structured output with Zod schema validation
- **Content Analysis**: Intelligent content enhancement and quality assessment
- **Single Agent Architecture**: WorkflowDrivenAgent handling the entire pipeline

## Workflow Steps

1. **Research Step**: 
   - Uses \`generateText\` with web search tool for research and content creation
   - AI SDK compatible tool calling with Tavily search integration
   - Content generation with research sources and metadata

2. **Enhance Step**:
   - Uses \`generateObject\` for structured analysis
   - Content quality assessment and source accuracy scoring
   - Enhancement suggestions and improved content generation

## Environment Variables Required

- \`VITE_OPENAI_API_KEY\`: OpenAI API key for AI SDK models
- \`VITE_TAVILY_API_KEY\`: Tavily API key for web search tool
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
- **Modern API**: Latest AI SDK v5 features and best practices

### Technical Implementation
- **generateText**: For flexible content generation with tool calling
- **generateObject**: For structured output with schema validation
- **tool()**: AI SDK compatible tool creation with Tavily integration
- **createOpenAI**: Modern OpenAI provider configuration
- **Zod Schemas**: Type-safe input/output validation

### Advanced Features
- **Web Search Tool**: AI SDK compatible tool with Tavily search integration
- **Content Analysis**: Readability assessment and source accuracy scoring
- **Enhancement Pipeline**: Automated content improvement suggestions
- **Metadata Tracking**: Processing time, word count, and source metrics
- **Structured Output**: Consistent format with validation

**Input:** Content topic (e.g., "AI in healthcare")
**Expected Output:** Enhanced content with web research, analysis, quality score, source accuracy, key themes, and improvement suggestions
        `,
      },
    },
  },
};
