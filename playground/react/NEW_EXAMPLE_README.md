# KaibanJS React Playground

This playground demonstrates various KaibanJS features including workflow-driven agents, LLM integrations, and team collaboration patterns.

## Features

- **Workflow-Driven Agents**: Demonstrates structured workflow execution
- **Multi-SDK Integration**: Combines LangChain and Vercel AI SDK
- **Team Collaboration**: Shows how different agent types work together
- **Storybook Integration**: Interactive examples and documentation

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```bash
# OpenAI API Key for LangChain and AI SDK
VITE_OPENAI_API_KEY=your_openai_api_key_here

# Anthropic API Key for ReactChampionAgent
VITE_ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Tavily API Key for web search
VITE_TAVILY_API_KEY=your_tavily_api_key_here
```

## Getting Started

1. **Build the workflow package first** (required for local development):

   ```bash
   cd ../../packages/workflow
   npm install
   npm run build
   cd ../../playground/react
   ```

   > **Important**: The workflow package must be built before running the playground because it uses a local file reference (`file:../../packages/workflow`) in its dependencies. This ensures the latest workflow code is available to the playground.

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables (see above)

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Start Storybook for interactive examples:
   ```bash
   npm run storybook
   ```

## Available Stories

- **Basic Workflow**: Simple mathematical workflow
- **Complex Workflow**: Advanced patterns with conditional logic
- **Suspension Workflow**: Workflow with pause/resume capabilities
- **Mixed Team**: WorkflowDrivenAgent + ReactChampionAgent collaboration
- **LangChain + AI SDK Workflow**: Multi-SDK integration example
- **LangChain Only Workflow**: Pure LangChain implementation
- **AI SDK Only Workflow**: Pure Vercel AI SDK implementation with web search tool

## Troubleshooting

### Common Issues

1. **"Module not found" errors**: Make sure you've built the workflow package first (step 1 above)

2. **"crypto.randomUUID is not a function"**: This is a browser compatibility issue. The workflow package includes a polyfill, but you may need to clear your browser cache or restart the dev server.

3. **API Key errors**: Ensure all required environment variables are set in your `.env` file

4. **Tool calling errors**: Make sure you have the latest version of the AI SDK packages installed

### Rebuilding After Changes

If you make changes to the workflow package, you'll need to rebuild it:

```bash
cd ../../packages/workflow
npm run build
cd ../../playground/react
# Restart your dev server or Storybook
```
