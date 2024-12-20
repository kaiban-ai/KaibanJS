# Tavily Search Results Tool

This tool integrates with Tavily (https://tavily.com/), an advanced search engine optimized for comprehensive, accurate, and trusted results. It's particularly useful for retrieving current information and answering questions about recent events, making it ideal for AI applications and Large Language Models (LLMs).

## Components

The tool uses the following components:

- A Tavily API client instance
- An API Key for authentication
- A custom HTTP client (ky) for making API requests
- Input validation using Zod schema
- Configurable maximum results parameter

## Key Features

- Delivers accurate and trusted search results
- Optimized for current events and real-time information
- Returns well-structured JSON data ready for LLM consumption
- Includes content relevance scoring and filtering
- Configurable number of results
- Built-in error handling and validation
- JSON-formatted responses

## Input

The input should be a JSON object with a "searchQuery" field containing the search query to process.

## Output

The output is a JSON-formatted string containing an array of search results from Tavily. Each result includes relevant information about the search query.

## Example

```javascript
const tool = new TavilySearchResults({
  apiKey: 'your-api-key',
  maxResults: 5  // Optional, defaults to 5
});

const result = await tool._call({ 
  searchQuery: 'What are the latest developments in AI?' 
});
```

## Advanced Example with Error Handling

```javascript
const tool = new TavilySearchResults({
  apiKey: process.env.TAVILY_API_KEY,
  maxResults: 10
});

try {
  const result = await tool._call({ 
    searchQuery: 'recent breakthroughs in quantum computing' 
  });
  
  // Parse the JSON string back to an object
  const searchResults = JSON.parse(result);
  
  // Process the results
  searchResults.forEach((item, index) => {
    console.log(`Result ${index + 1}:`, item);
  });
} catch (error) {
  console.error('Error processing Tavily search:', error);
}
```

### Disclaimer

Ensure you have proper API credentials and respect Tavily's usage terms and rate limits. The search results are optimized for current events and may vary based on the time of the query. 