const { Serper } = require('../../dist/serper/index.cjs.js');

describe('Serper', () => {
  test('Serper sends correct default parameters and receives results', async () => {
    const tool = new Serper({ apiKey: 'test-api-key' });

    let capturedRequest;
    tool.httpClient = tool.httpClient.extend({
      hooks: {
        beforeRequest: [
          (request) => {
            capturedRequest = request;
            return new Response(
              JSON.stringify({
                searchParameters: {
                  q: '2024 US Presidential Election',
                  type: 'search',
                  engine: 'google',
                },
                organic: [
                  {
                    title: '2024 United States presidential election',
                    link: 'https://example.com/news',
                    snippet:
                      'The 2024 United States presidential election was...',
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

    const result = await tool._call({ query: '2024 US Presidential Election' });

    // Check request
    expect(capturedRequest.url).toBe('https://google.serper.dev/search');
    expect(capturedRequest.method).toBe('POST');
    expect(capturedRequest.headers.get('X-API-KEY')).toBe('test-api-key');
    expect(capturedRequest.headers.get('Content-Type')).toBe(
      'application/json'
    );

    const body = await capturedRequest.json();
    expect(body).toEqual({
      q: '2024 US Presidential Election',
    });

    // Check response
    expect(result).toEqual({
      searchParameters: {
        q: '2024 US Presidential Election',
        type: 'search',
        engine: 'google',
      },
      organic: [
        {
          title: '2024 United States presidential election',
          link: 'https://example.com/news',
          snippet: 'The 2024 United States presidential election was...',
        },
      ],
    });
  });

  test('Serper handles news search type correctly', async () => {
    const tool = new Serper({
      apiKey: 'test-api-key',
      type: 'news',
    });

    let capturedRequest;
    tool.httpClient = tool.httpClient.extend({
      hooks: {
        beforeRequest: [
          (request) => {
            capturedRequest = request;
            return new Response(
              JSON.stringify({
                searchParameters: {
                  q: '2024 US Presidential Election',
                  type: 'news',
                  engine: 'google',
                },
                news: [
                  {
                    title: 'Breaking Election News',
                    link: 'https://example.com/breaking-news',
                    snippet: 'Latest updates on the presidential race...',
                    date: '2 hours ago',
                    source: 'Example News',
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

    const result = await tool._call({ query: '2024 US Presidential Election' });

    // Check request
    expect(capturedRequest.url).toBe('https://google.serper.dev/news');
    expect(capturedRequest.method).toBe('POST');
    expect(capturedRequest.headers.get('X-API-KEY')).toBe('test-api-key');
    expect(capturedRequest.headers.get('Content-Type')).toBe(
      'application/json'
    );

    const body = await capturedRequest.json();
    expect(body).toEqual({
      q: '2024 US Presidential Election',
    });

    // Check response
    expect(result).toEqual({
      searchParameters: {
        q: '2024 US Presidential Election',
        type: 'news',
        engine: 'google',
      },
      news: [
        {
          title: 'Breaking Election News',
          link: 'https://example.com/breaking-news',
          snippet: 'Latest updates on the presidential race...',
          date: '2 hours ago',
          source: 'Example News',
        },
      ],
    });
  });

  test('Serper handles client error (4xx)', async () => {
    const tool = new Serper({ apiKey: 'invalid-api-key' });

    tool.httpClient = tool.httpClient.extend({
      hooks: {
        beforeRequest: [
          () => {
            return new Response(
              JSON.stringify({
                error: 'Invalid API Key',
                message: 'The provided API key is not valid',
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

    const result = await tool._call({ query: '2024 US Presidential Election' });

    expect(result).toBe('API request failed: Client Error (401)');
  });

  test('Serper handles server error (5xx)', async () => {
    const tool = new Serper({ apiKey: 'test-api-key' });

    tool.httpClient = tool.httpClient.extend({
      hooks: {
        beforeRequest: [
          () => {
            return new Response(
              JSON.stringify({
                error: 'Internal Server Error',
                message: 'Something went wrong on our end',
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

    const result = await tool._call({ query: '2024 US Presidential Election' });

    expect(result).toBe('API request failed: Server Error (500)');
  });

  test('Serper handles unexpected errors', async () => {
    const tool = new Serper({ apiKey: 'test-api-key' });

    tool.httpClient = tool.httpClient.extend({
      hooks: {
        beforeRequest: [
          () => {
            throw new Error('Network Error');
          },
        ],
      },
    });

    const result = await tool._call({ query: '2024 US Presidential Election' });

    expect(result).toBe('An unexpected error occurred: Network Error');
  });
});
