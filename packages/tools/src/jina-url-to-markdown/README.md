# Jina URL to Markdown

This tool integrates with Jina (https://jina.ai/), a web scraping and crawling service designed to turn websites into LLM-ready data. It enables the extraction of clean, well-formatted content from websites, making it ideal for AI applications, particularly those using Large Language Models (LLMs).

## Components

The tool uses the following components:

- A Jina API client instance
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

- `apiKey`: Your Jina API key (optional)
- `options`: Options for the Jina API request (optional)

## Example

```javascript
const tool = new JinaUrlToMarkdown();

const result = await tool._call({
  url: 'https://example.com',
});
```

## Advanced Example with Custom Options and Error Handling

```javascript
const tool = new JinaUrlToMarkdown({
  apiKey: process.env.JINA_API_KEY,
  options: {
    targetSelector: ['body', '.class', '#id'],
    retainImages: 'none',
  },
});

try {
  const result = await tool._call({
    url: 'https://example.com/blog/article',
  });

  // Process the scraped content
  console.log('Markdown content:', result);

  // Use the content with an LLM or other processing
  // ...
} catch (error) {
  console.error('Error scraping website:', error);
}
```

For more information about Jina, visit: https://jina.ai/, https://r.jina.ai/docs

### Disclaimer

Ensure you have proper API credentials and respect Jina's usage terms and rate limits. The service offers flexible pricing plans, including a free tier for small-scale use. When scraping websites, make sure to comply with the target website's terms of service and robots.txt directives.
