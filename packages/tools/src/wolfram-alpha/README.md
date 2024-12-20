# WolframAlpha Tool

This tool integrates with WolframAlpha (https://www.wolframalpha.com/), a computational intelligence engine that provides robust and detailed answers to complex queries across various domains. It leverages WolframAlpha's powerful computational capabilities to handle advanced calculations, data analysis, and domain-specific queries.

## Components

The tool uses the following components:

- A WolframAlpha API client instance
- An App ID for authentication
- A custom HTTP client (ky) for making API requests
- Input validation using Zod schema

## Key Features

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

## Input

The input should be a JSON object with a "query" field containing the question or computation to process.

## Output

The output is the response from WolframAlpha's computational engine, providing detailed answers and calculations based on the input query.

## Example

```javascript
const tool = new WolframAlphaTool({
  appId: 'your-app-id'
});

const result = await tool._call({ 
  query: 'solve x^2 + 2x + 1 = 0' 
});
```

## Prerequisites

- WolframAlpha API credentials (App ID)
- Sign up for API access at: https://developer.wolframalpha.com/

## Advanced Example with Error Handling

```javascript
const tool = new WolframAlphaTool({
  appId: process.env.WOLFRAM_APP_ID
});

try {
  const result = await tool._call({ 
    query: 'calculate the orbital period of Mars' 
  });
  console.log(result);
} catch (error) {
  console.error('Error processing WolframAlpha query:', error);
}
```

### Disclaimer

Ensure you have proper API credentials and respect WolframAlpha's usage terms and rate limits. 