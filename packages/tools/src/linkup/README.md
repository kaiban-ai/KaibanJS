# Linkup Search Tool

This tool integrates with Linkup (https://www.linkup.so/), a web search API built for AI applications. It retrieves real-time, citable sources from the web and can return either a list of search results or a natural language answer grounded in its sources.

## Components

The tool uses the following components:

- An API Key for authentication (get one at https://app.linkup.so/)
- A custom HTTP client (ky) for making API requests
- Input validation using Zod schema
- Configurable search parameters

## Key Features

- Configurable search depth: `fast`, `standard` or `deep`
- Two output types: raw search results or a sourced answer
- Domain filtering (include / exclude)
- Date-based filtering

## Input

The input should be a JSON object with a "query" field containing the search query to process.

## Output

The output is the response from Linkup's API:

- With `outputType: 'searchResults'`: `{ results: [{ type, name, url, content }] }`
- With `outputType: 'sourcedAnswer'`: `{ answer, sources: [{ name, url, snippet }] }`

## Configuration Options

- `apiKey`: Your Linkup API key
- `depth`: Search depth (`'fast'`, `'standard'` or `'deep'`). Defaults to `'standard'`
- `outputType`: Output type (`'searchResults'` or `'sourcedAnswer'`). Defaults to `'searchResults'`
- `maxResults`: Maximum number of results to return
- `includeDomains`: List of domains to search within
- `excludeDomains`: List of domains to exclude
- `fromDate`: `YYYY-MM-DD` date for the earliest results
- `toDate`: `YYYY-MM-DD` date for the latest results

## Example

```javascript
const tool = new LinkupSearch({
  apiKey: process.env.LINKUP_API_KEY,
  depth: 'standard',
  outputType: 'searchResults',
  maxResults: 5,
});

const result = await tool._call({
  query: 'Latest breakthroughs in quantum computing',
});
```

## Advanced Example with Sourced Answer and Filters

```javascript
const tool = new LinkupSearch({
  apiKey: process.env.LINKUP_API_KEY,
  depth: 'deep',
  outputType: 'sourcedAnswer',
  includeDomains: ['nature.com', 'arxiv.org'],
  fromDate: '2025-01-01',
});

try {
  const result = await tool._call({
    query: 'What are the most recent advances in quantum error correction?',
  });
  console.log(result.answer, result.sources);
} catch (error) {
  console.error('Error performing Linkup search:', error);
}
```

### Disclaimer

Ensure you have proper API credentials and respect Linkup's usage terms and rate limits. See the [Linkup documentation](https://docs.linkup.so/) for more details.
