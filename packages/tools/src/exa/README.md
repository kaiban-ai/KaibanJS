# Exa Search Tool

This tool integrates with Exa (https://exa.ai/), a search engine for AI that organizes the web using embeddings. It provides high-quality web data specifically optimized for AI applications, offering advanced search capabilities through neural and traditional keyword approaches.

## Components

The tool uses the following components:

- An Exa API client instance
- An API Key for authentication
- A custom HTTP client (ky) for making API requests
- Input validation using Zod schema
- Configurable search parameters
- Multiple search type options

## Key Features

- Neural Search: Meaning-based search using embeddings
- Keyword Search: Traditional search capabilities
- Auto Search: Dynamically chooses between neural and keyword
- Category-focused search (company, research paper, news, github, tweet, etc.)
- Domain and text filtering
- Date-based filtering
- Configurable content retrieval options
- Support for autoprompt query enhancement

## Input

The input should be a JSON object with a "query" field containing the search query to process.

## Output

The output is the response from Exa's API containing search results based on the configured parameters and search type.

## Configuration Options

- `type`: Search type ('neural', 'keyword', or 'auto')
- `useAutoprompt`: Enable query enhancement (for neural search)
- `numResults`: Number of results to return
- `category`: Focus on specific category
- `startPublishedDate`: ISO 8601 date for earliest publish date
- `endPublishedDate`: ISO 8601 date for latest publish date
- `includeDomains`: List of domains to include
- `excludeDomains`: List of domains to exclude
- `includeText`: Text/phrase to include in results
- `excludeText`: Text/phrase to exclude from results
- `startCrawlDate`: ISO 8601 date for earliest crawl date
- `endCrawlDate`: ISO 8601 date for latest crawl date
- `contents`: Configuration for content retrieval

## Example

```javascript
const tool = new ExaSearch({
  apiKey: 'your-api-key',
  type: 'neural',
  useAutoprompt: false,
  numResults: 10,
  category: 'company',
});

const result = await tool._call({
  query: 'AI companies focusing on natural language processing',
});
```

## Advanced Example with Filters

```javascript
const tool = new ExaSearch({
  apiKey: process.env.EXA_API_KEY,
  type: 'neural',
  numResults: 20,
  includeDomains: ['techcrunch.com', 'wired.com'],
  startPublishedDate: '2023-01-01',
  contents: {
    text: { maxCharacters: 1000, includeHtmlTags: false },
    highlights: { numSentences: 3, highlightsPerUrl: 2 },
  },
});

try {
  const result = await tool._call({
    query: 'recent developments in quantum computing',
  });
  console.log(result);
} catch (error) {
  console.error('Error performing Exa search:', error);
}
```

### Disclaimer

Ensure you have proper API credentials and respect Exa's usage terms and rate limits. Some features may require specific subscription tiers.
