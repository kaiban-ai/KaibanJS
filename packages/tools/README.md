# Kaiban Tools for AI Agents

This package provides a collection of specialized tools designed for use with AI agents, enhancing their capabilities for various tasks.

## Purpose

The Kaiban Tools package offers a set of tools that can be integrated into AI agent systems, allowing agents to perform a wide range of tasks more effectively. These tools are designed to extend the capabilities of AI agents, enabling them to interact with external services, process data, and perform complex operations.

## Features

- A collection of tools specifically designed for AI agents
- Easy integration with existing agent frameworks and architectures
- Tools for various purposes, including web scraping, data transformation, and more
- Configurable options for each tool to suit different agent requirements

## Installation

```bash
npm install @kaibanjs/tools
```

## Available Tools

### 1. Firecrawl

Firecrawl is a tool that allows agents to interact with the Firecrawl web scraping service, enabling them to extract clean, structured data from websites.

Learn more: https://www.firecrawl.dev/

### 2. Tavily Search

Tavily Search is a tool that provides AI-optimized search capabilities, delivering comprehensive and accurate results. It's particularly useful for retrieving current information and answering questions about recent events.

Learn more: https://tavily.com/

### 3. Serper

Serper is a tool that integrates with Google Search API service, providing access to various types of search results including web search, news, images, and more. It's particularly useful for retrieving real-time information from Google's search engine.

Learn more: https://serper.dev/

### 4. Exa Search

Exa Search is a tool that integrates with Exa (https://exa.ai/), a search engine for AI that organizes the web using embeddings. It provides high-quality web data specifically optimized for AI applications.

Key features:

- Neural Search: Meaning-based search using embeddings
- Keyword Search: Traditional search capabilities
- Auto Search: Dynamically chooses between neural and keyword
- Category-focused search (company, research paper, news, github, tweet, etc.)
- Domain and text filtering
- Date-based filtering

Learn more: https://exa.ai/

### 5. WolframAlpha

WolframAlpha is a tool that integrates with WolframAlpha's computational intelligence engine, providing detailed answers to complex queries across various domains. It's particularly powerful for mathematical, scientific, and technical computations.

Key features:

- Advanced computations and data analysis
- Scientific and mathematical calculations
- Real-time data processing
- Domain-specific knowledge in:
  - Mathematics
  - Physics
  - Chemistry
  - Engineering
  - Earth Sciences
  - Life Sciences
  - Units & Measures
  - Financial calculations
  - And more

Learn more: https://www.wolframalpha.com/

### 6. Github Issues

Github Issues is a tool that allows agents to interact with the Github API, enabling them to fetch issues from a repository.

Learn more: https://docs.github.com/en/rest/issues/issues

## Development

### Local Setup

1. Clone the repository:

```bash
git clone https://github.com/kaiban-ai/KaibanJS.git
```

2. Navigate to the tools package:

```bash
cd packages/tools
```

3. Install dependencies:

```bash
npm install
```

4. Environment Variables:

Create a `.env` file in the root directory with your API keys:

```env
VITE_FIRECRAWL_API_KEY=your_firecrawl_api_key
VITE_TAVILY_API_KEY=your_tavily_api_key
VITE_SERPER_API_KEY=your_serper_api_key
VITE_EXA_API_KEY=your_exa_api_key
VITE_WOLFRAM_APP_ID=your_wolfram_app_id
```

5. Run Storybook to view and test components:

```bash
npm run storybook
```

5. Build the package:

```bash
npm run build
```

6. Run tests:

```bash
npm run test
```

## Contributing

To contribute a new tool:

1. Follow the Development steps above to set up your local environment
2. Use an existing tool as reference (check `src/firecrawl` or `src/tavily` for examples)
3. Remember to create:
   - Your tool implementation
   - A Storybook story
   - Tests

For questions or discussions, join our [Discord](https://kaibanjs.com/discord).

## License

MIT License
