const { ExaSearch } = require('../../dist/exa/index.cjs.js');

describe('ExaSearch', () => {
  test('ExaSearch sends correct default parameters and receives results', async () => {
    const tool = new ExaSearch({ apiKey: 'test-api-key' });

    let capturedRequest;
    tool.httpClient = tool.httpClient.extend({
      hooks: {
        beforeRequest: [
          (request) => {
            capturedRequest = request;
            return new Response(
              JSON.stringify({
                requestId: 'f9408c9f21d64c78bdf26144f3932dc4',
                resolvedSearchType: 'neural',
                results: [
                  {
                    score: 0.19242912530899048,
                    title: 'Why Rust?',
                    id: 'https://www.rerun.io/blog/why-rust',
                    url: 'https://www.rerun.io/blog/why-rust',
                    publishedDate: '2022-10-18T00:00:00.000Z',
                    author: 'Emil Ernerfeldt',
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

    const result = await tool._call({ query: 'blog post about Rust' });

    // Check request
    expect(capturedRequest.url).toBe('https://api.exa.ai/search');
    expect(capturedRequest.method).toBe('POST');
    expect(capturedRequest.headers.get('x-api-key')).toBe('test-api-key');
    expect(capturedRequest.headers.get('content-type')).toBe(
      'application/json'
    );
    expect(capturedRequest.headers.get('accept')).toBe('application/json');

    const body = await capturedRequest.json();
    expect(body).toMatchObject({
      query: 'blog post about Rust',
      type: 'neural',
      useAutoprompt: false,
    });

    // Check response structure
    expect(result).toHaveProperty('requestId');
    expect(result).toHaveProperty('resolvedSearchType');
    expect(result).toHaveProperty('results');
    expect(result.results[0]).toMatchObject({
      score: expect.any(Number),
      title: expect.any(String),
      id: expect.any(String),
      url: expect.any(String),
      publishedDate: expect.any(String),
      author: expect.any(String),
    });
  });

  test('ExaSearch handles autoprompt correctly', async () => {
    const tool = new ExaSearch({
      apiKey: 'test-api-key',
      useAutoprompt: true,
    });

    let capturedRequest;
    tool.httpClient = tool.httpClient.extend({
      hooks: {
        beforeRequest: [
          (request) => {
            capturedRequest = request;
            return new Response(
              JSON.stringify({
                requestId: 'f9408c9f21d64c78bdf26144f3932dc4',
                autopromptString: 'Here is a cool blog post about Rust:',
                resolvedSearchType: 'neural',
                results: [
                  {
                    score: 0.19242912530899048,
                    title: 'Why Rust?',
                    id: 'https://www.rerun.io/blog/why-rust',
                    url: 'https://www.rerun.io/blog/why-rust',
                    publishedDate: '2022-10-18T00:00:00.000Z',
                    author: 'Emil Ernerfeldt',
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

    const result = await tool._call({ query: 'blog post about Rust' });

    const body = await capturedRequest.json();
    expect(body).toMatchObject({
      query: 'blog post about Rust',
      type: 'neural',
      useAutoprompt: true,
    });

    expect(result).toHaveProperty('autopromptString');
  });

  test('ExaSearch handles category filter correctly', async () => {
    const tool = new ExaSearch({
      apiKey: 'test-api-key',
      category: 'blog',
    });

    let capturedRequest;
    tool.httpClient = tool.httpClient.extend({
      hooks: {
        beforeRequest: [
          (request) => {
            capturedRequest = request;
            return new Response(
              JSON.stringify({
                requestId: 'f9408c9f21d64c78bdf26144f3932dc4',
                resolvedSearchType: 'neural',
                results: [],
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

    await tool._call({ query: 'blog post about Rust' });

    const body = await capturedRequest.json();
    expect(body).toMatchObject({
      query: 'blog post about Rust',
      type: 'neural',
      useAutoprompt: false,
      category: 'blog',
    });
  });

  test('ExaSearch handles date filters correctly', async () => {
    const tool = new ExaSearch({
      apiKey: 'test-api-key',
      startPublishedDate: '2024-01-01T00:00:00.000Z',
      endPublishedDate: '2024-03-20T00:00:00.000Z',
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
                    title: 'Recent Development',
                    url: 'https://example.com/recent',
                    publishedDate: '2024-02-15T00:00:00.000Z',
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

    await tool._call({ query: 'recent developments' });

    const body = await capturedRequest.json();
    expect(body).toHaveProperty(
      'startPublishedDate',
      '2024-01-01T00:00:00.000Z'
    );
    expect(body).toHaveProperty('endPublishedDate', '2024-03-20T00:00:00.000Z');
  });

  test('ExaSearch handles text filters correctly', async () => {
    const tool = new ExaSearch({
      apiKey: 'test-api-key',
      includeText: ['machine learning'],
      excludeText: ['cryptocurrency'],
    });

    let capturedRequest;
    tool.httpClient = tool.httpClient.extend({
      hooks: {
        beforeRequest: [
          (request) => {
            capturedRequest = request;
            return new Response(JSON.stringify({ results: [] }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
          },
        ],
      },
    });

    await tool._call({ query: 'AI research' });

    const body = await capturedRequest.json();
    expect(body).toHaveProperty('includeText', ['machine learning']);
    expect(body).toHaveProperty('excludeText', ['cryptocurrency']);
  });

  test('ExaSearch handles client error (4xx)', async () => {
    const tool = new ExaSearch({ apiKey: 'invalid-api-key' });

    tool.httpClient = tool.httpClient.extend({
      hooks: {
        beforeRequest: [
          () => {
            return new Response(
              JSON.stringify({
                error: 'Invalid API Key',
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

    const result = await tool._call({ query: 'test query' });
    expect(result).toBe('API request failed: Client Error (401)');
  });

  test('ExaSearch handles server error (5xx)', async () => {
    const tool = new ExaSearch({ apiKey: 'test-api-key' });

    tool.httpClient = tool.httpClient.extend({
      hooks: {
        beforeRequest: [
          () => {
            return new Response(
              JSON.stringify({
                error: 'Internal Server Error',
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

    const result = await tool._call({ query: 'test query' });
    expect(result).toBe('API request failed: Server Error (500)');
  });

  test('ExaSearch handles unexpected errors', async () => {
    const tool = new ExaSearch({ apiKey: 'test-api-key' });

    tool.httpClient = tool.httpClient.extend({
      hooks: {
        beforeRequest: [
          () => {
            throw new Error('Network Error');
          },
        ],
      },
    });

    const result = await tool._call({ query: 'test query' });
    expect(result).toBe('An unexpected error occurred: Network Error');
  });

  test('ExaSearch is exported correctly in both paths', () => {
    const { ExaSearch } = require('../../dist/exa/index.cjs.js');
    const { ExaSearch: ExaSearchMain } = require('../../dist/index.cjs.js');

    // Check that both imports are constructor functions
    expect(typeof ExaSearch).toBe('function');
    expect(typeof ExaSearchMain).toBe('function');

    // Check they have the same name and properties
    expect(ExaSearch.name).toBe(ExaSearchMain.name);
    expect(Object.keys(ExaSearch.prototype)).toEqual(
      Object.keys(ExaSearchMain.prototype)
    );
  });
});
