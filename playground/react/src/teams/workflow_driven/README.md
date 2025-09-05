# Workflow-Driven Teams

This directory contains examples of teams that use WorkflowDrivenAgent to execute predefined workflows instead of using LLM-based reasoning.

## Available Teams

### Basic Workflow (`basic_workflow.js`)

Simple mathematical workflow demonstrating sequential processing:

- Add two numbers
- Multiply result by original inputs
- Format output with calculation details

### Complex Workflow (`complex_workflow.js`)

Advanced workflow with multiple patterns:

- Sequential processing
- Conditional branching
- Parallel processing (foreach)
- Result aggregation

### Suspension Workflow (`suspension_workflow.js`)

Workflow with suspension/resumption capabilities:

- Data validation
- Manual approval step (suspends workflow)
- Data processing after approval
- Final result aggregation

### Mixed Team (`mixed_team.js`)

Combines WorkflowDrivenAgent with ReactChampionAgent:

- Workflow-driven data processing (validation and formatting)
- LLM-based content analysis
- LLM-based summary generation

### LangChain + AI SDK Workflow (`langchain_ai_sdk_workflow.js`)

**NEW**: Demonstrates multi-SDK integration:

- **Step 1**: LangChain-powered web search using Tavily API
- **Step 2**: Vercel AI SDK-powered analysis and summarization
- **Team**: WorkflowDrivenAgent + ReactChampionAgent collaboration

### LangChain Only Workflow (`langchain_only_workflow.js`)

**NEW**: Pure LangChain implementation:

- **Step 1**: LangChain web search with Tavily API
- **Step 2**: LangChain content analysis and insights
- **Team**: Single WorkflowDrivenAgent with pure LangChain workflow

### AI SDK Only Workflow (`ai_sdk_only_workflow.js`)

**NEW**: Pure Vercel AI SDK implementation:

- **Step 1**: AI SDK content generation with `generateText`
- **Step 2**: AI SDK content enhancement with `generateObject`
- **Team**: Single WorkflowDrivenAgent with pure AI SDK workflow

## Key Features

- **Deterministic Execution**: Workflows execute the same way every time
- **Type Safety**: Full TypeScript support with Zod schema validation
- **State Management**: Built-in workflow state tracking
- **Error Handling**: Robust error handling and recovery
- **Team Integration**: Seamless integration with existing team system
- **Multi-SDK Support**: Integration of different LLM SDKs in single workflows

## Environment Variables

For the different workflows, you'll need:

- `VITE_OPENAI_API_KEY`: OpenAI API key (required for all workflows)
- `VITE_TAVILY_API_KEY`: Tavily API key for web search (LangChain workflows)
- `VITE_ANTHROPIC_API_KEY`: Anthropic API key (mixed teams with ReactChampionAgent)

## Usage

Each team can be imported and used in Storybook stories or directly in your application:

```javascript
import langchainAiSdkTeam from './teams/workflow_driven/langchain_ai_sdk_workflow';

// Use the team
const result = await langchainAiSdkTeam.execute();
```
