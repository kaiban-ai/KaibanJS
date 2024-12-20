# Firecrawl Tool

This tool integrates with Firecrawl (https://www.firecrawl.dev/), a web scraping and crawling service designed to turn websites into LLM-ready data. It enables the extraction of clean, well-formatted content from websites, making it ideal for AI applications, particularly those using Large Language Models (LLMs).

## Components

The tool uses the following components:

- A Firecrawl API client instance
- An API Key for authentication
- A custom HTTP client (ky) for making API requests
- Input validation using Zod schema
- Configurable output format

## Key Features

- Scrapes and crawls websites, even those with dynamic content
- Converts web content into clean, LLM-ready markdown
- Handles complex web scraping challenges:
  - Rate limits
  - JavaScript rendering
  - Anti-bot mechanisms
- Multiple output format options
- Clean, structured data extraction
- Support for dynamic content
- Automatic content cleaning and formatting

## Input

The input should be a JSON object with a "url" field containing the URL to scrape and retrieve content from.

## Output

The output is the scraped content from the specified URL, formatted according to the configured format (default: markdown).

## Configuration Options

- `apiKey`: Your Firecrawl API key
- `format`: Output format (defaults to 'markdown')
- `mode`: Scraping mode (currently supports 'scrape')

## Example

```javascript
const tool = new Firecrawl({
  apiKey: 'your-api-key',
  format: 'markdown'
});

const result = await tool._call({ 
  url: 'https://example.com' 
});
```

## Advanced Example with Error Handling

```javascript
const tool = new Firecrawl({
  apiKey: process.env.FIRECRAWL_API_KEY,
  format: 'markdown'
});

try {
  const result = await tool._call({ 
    url: 'https://example.com/blog/article' 
  });
  
  // Process the scraped content
  console.log('Scraped content:', result);
  
  // Use the content with an LLM or other processing
  // ...
} catch (error) {
  console.error('Error scraping website:', error);
}
```

### Disclaimer

Ensure you have proper API credentials and respect Firecrawl's usage terms and rate limits. The service offers flexible pricing plans, including a free tier for small-scale use. When scraping websites, make sure to comply with the target website's terms of service and robots.txt directives. 