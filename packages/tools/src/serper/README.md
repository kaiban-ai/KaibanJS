# Serper Tool

This tool integrates with Serper (https://serper.dev/), a Google Search API service that provides programmatic access to Google Search results. It enables various types of Google searches including web search, image search, news search, and more, making it ideal for AI applications that need real-time information from the web.

## Components

The tool uses the following components:

- A Serper API client instance
- An API Key for authentication
- A custom HTTP client (ky) for making API requests
- Input validation using Zod schema
- Search type configuration
- Optional search parameters

## Search Types

The tool supports multiple search types:

- "search" (default): For general search queries
- "images": For image search
- "videos": For video search
- "places": For location-based search
- "maps": For map search
- "news": For news search
- "shopping": For shopping search
- "scholar": For academic publications search
- "patents": For patents search
- "webpage": For scraping webpages (Beta)

## Key Features

- Multiple search types for different use cases
- Clean, structured JSON responses
- High-performance API with good uptime
- Webpage scraping capability (Beta)
- Customizable search parameters
- Error handling and validation

## Input

The input depends on the search type:

- For webpage scraping: A JSON object with a "url" field
- For all other search types: A JSON object with a "query" field

## Output

The output is a structured JSON response from Serper containing search results based on the search type and query.

## Example

```javascript
// Basic search
const tool = new Serper({
  apiKey: 'your-api-key',
  type: 'search', // Optional, defaults to 'search'
});

const result = await tool._call({
  query: 'latest AI developments',
});

// Webpage scraping
const webScraperTool = new Serper({
  apiKey: 'your-api-key',
  type: 'webpage',
});

const scrapingResult = await webScraperTool._call({
  url: 'https://example.com',
});
```

## Advanced Example with Custom Parameters

```javascript
const tool = new Serper({
  apiKey: process.env.SERPER_API_KEY,
  type: 'news',
  params: {
    num: 10, // Number of results
    gl: 'us', // Geographic location
  },
});

try {
  const result = await tool._call({
    query: 'artificial intelligence breakthroughs',
  });
  console.log(result);
} catch (error) {
  console.error('Error processing Serper query:', error);
}
```

### Disclaimer

Ensure you have proper API credentials and respect Serper's usage terms and rate limits. The webpage scraping feature is in Beta and may be subject to changes.
