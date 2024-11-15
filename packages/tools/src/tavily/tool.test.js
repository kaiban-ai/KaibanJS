const { TavilySearchResults } = require('../../dist/tavily/index.cjs.js');

describe('TavilySearchResults', () => {
  test('TavilySearchResults sends correct default parameters and receives results', async () => {
    const tool = new TavilySearchResults({ apiKey: 'test-api-key' });

    let capturedRequest;
    tool.httpClient = tool.httpClient.extend({
      hooks: {
        beforeRequest: [
          (request) => {
            capturedRequest = request;
            return new Response(
              JSON.stringify({
                results: [
                  {
                    title: 'Latest AI News',
                    url: 'https://example.com/ai-news',
                    content:
                      'Recent developments in artificial intelligence...',
                    score: 0.8,
                    published_date: '2024-03-20',
                  },
                ],
              }),
              {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
              }
            );
          },
        ],
      },
    });

    const result = await tool._call({ searchQuery: 'latest AI developments' });

    // Check request
    expect(capturedRequest.url).toBe('https://api.tavily.com/search');
    expect(capturedRequest.method).toBe('POST');
    expect(capturedRequest.headers.get('Content-Type')).toBe(
      'application/json'
    );
    const body = await capturedRequest.json();
    expect(body).toEqual({
      query: 'latest AI developments',
      max_results: 5,
      api_key: 'test-api-key',
    });

    // Check response
    expect(result).toBe(
      JSON.stringify([
        {
          title: 'Latest AI News',
          url: 'https://example.com/ai-news',
          content: 'Recent developments in artificial intelligence...',
          score: 0.8,
          published_date: '2024-03-20',
        },
      ])
    );
  });

  test('TavilySearchResults sends correct parameters with custom maxResults', async () => {
    const tool = new TavilySearchResults({
      apiKey: 'test-api-key',
      maxResults: 3,
    });

    let capturedRequest;
    tool.httpClient = tool.httpClient.extend({
      hooks: {
        beforeRequest: [
          (request) => {
            capturedRequest = request;
            return new Response(
              JSON.stringify({
                results: [
                  {
                    title: 'Latest AI News',
                    url: 'https://example.com/ai-news',
                    content:
                      'Recent developments in artificial intelligence...',
                    score: 0.8,
                    published_date: '2024-03-20',
                  },
                ],
              }),
              {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
              }
            );
          },
        ],
      },
    });

    await tool._call({ searchQuery: 'latest AI developments' });

    // Check request
    expect(capturedRequest.url).toBe('https://api.tavily.com/search');
    expect(capturedRequest.method).toBe('POST');
    const body = await capturedRequest.json();
    expect(body).toEqual({
      query: 'latest AI developments',
      max_results: 3,
      api_key: 'test-api-key',
    });
  });

  test('TavilySearchResults handles client error (4xx)', async () => {
    const tool = new TavilySearchResults({ apiKey: 'test-api-key' });

    tool.httpClient = tool.httpClient.extend({
      hooks: {
        beforeRequest: [
          () => {
            return new Response(
              JSON.stringify({
                status: 'error',
                message: 'Invalid API key',
              }),
              {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
              }
            );
          },
        ],
      },
    });

    const result = await tool._call({ searchQuery: 'latest AI developments' });

    expect(result).toBe('API request failed: Client Error (401)');
  });

  test('TavilySearchResults handles server error (5xx)', async () => {
    const tool = new TavilySearchResults({ apiKey: 'test-api-key' });

    tool.httpClient = tool.httpClient.extend({
      hooks: {
        beforeRequest: [
          () => {
            return new Response(
              JSON.stringify({
                status: 'error',
                message: 'Internal Server Error',
              }),
              {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
              }
            );
          },
        ],
      },
    });

    const result = await tool._call({ searchQuery: 'latest AI developments' });

    expect(result).toBe('API request failed: Server Error (500)');
  });

  test('TavilySearchResults handles unexpected errors', async () => {
    const tool = new TavilySearchResults({ apiKey: 'test-api-key' });

    tool.httpClient = tool.httpClient.extend({
      hooks: {
        beforeRequest: [
          () => {
            throw new Error('Network Error');
          },
        ],
      },
    });

    const result = await tool._call({ searchQuery: 'latest AI developments' });

    expect(result).toBe('An unexpected error occurred: Network Error');
  });

  test('TavilySearchResults is exported correctly in both paths', () => {
    const { TavilySearchResults } = require('../../dist/tavily/index.cjs.js');
    const {
      TavilySearchResults: TavilySearchResultsMain,
    } = require('../../dist/index.cjs.js');

    // Check that both imports are constructor functions
    expect(typeof TavilySearchResults).toBe('function');
    expect(typeof TavilySearchResultsMain).toBe('function');

    // Check they have the same name and properties
    expect(TavilySearchResults.name).toBe(TavilySearchResultsMain.name);
    expect(Object.keys(TavilySearchResults.prototype)).toEqual(
      Object.keys(TavilySearchResultsMain.prototype)
    );
  });
});
