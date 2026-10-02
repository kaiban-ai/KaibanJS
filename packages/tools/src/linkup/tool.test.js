const { LinkupSearch } = require('../../dist/linkup/index.cjs.js');

const mockResponse = (tool, body, status = 200) => {
  let captured = {};
  tool.httpClient = tool.httpClient.extend({
    hooks: {
      beforeRequest: [
        (request) => {
          captured.request = request;
          return new Response(JSON.stringify(body), {
            status,
            headers: { 'Content-Type': 'application/json' },
          });
        },
      ],
    },
  });
  return captured;
};

describe('LinkupSearch', () => {
  test('LinkupSearch sends correct default parameters and receives results', async () => {
    const tool = new LinkupSearch({ apiKey: 'test-api-key' });

    const captured = mockResponse(tool, {
      results: [
        {
          type: 'text',
          name: 'Why Rust?',
          url: 'https://www.rerun.io/blog/why-rust',
          content: 'Rust is a fast and safe language...',
        },
      ],
    });

    const result = await tool._call({ query: 'blog post about Rust' });

    // Check request
    expect(captured.request.url).toBe('https://api.linkup.so/v1/search');
    expect(captured.request.method).toBe('POST');
    expect(captured.request.headers.get('authorization')).toBe(
      'Bearer test-api-key'
    );
    expect(captured.request.headers.get('content-type')).toBe(
      'application/json'
    );

    const body = await captured.request.json();
    expect(body).toEqual({
      q: 'blog post about Rust',
      depth: 'standard',
      outputType: 'searchResults',
    });

    // Check response structure
    expect(result).toHaveProperty('results');
    expect(result.results[0]).toMatchObject({
      type: 'text',
      name: expect.any(String),
      url: expect.any(String),
      content: expect.any(String),
    });
  });

  test('LinkupSearch handles sourced answers correctly', async () => {
    const tool = new LinkupSearch({
      apiKey: 'test-api-key',
      depth: 'deep',
      outputType: 'sourcedAnswer',
    });

    const captured = mockResponse(tool, {
      answer: 'Rust is popular for its memory safety guarantees.',
      sources: [
        {
          name: 'Why Rust?',
          url: 'https://www.rerun.io/blog/why-rust',
          snippet: 'Rust is a fast and safe language...',
        },
      ],
    });

    const result = await tool._call({ query: 'Why is Rust popular?' });

    const body = await captured.request.json();
    expect(body).toMatchObject({
      q: 'Why is Rust popular?',
      depth: 'deep',
      outputType: 'sourcedAnswer',
    });

    expect(result).toHaveProperty('answer');
    expect(result.sources[0]).toMatchObject({
      name: expect.any(String),
      url: expect.any(String),
      snippet: expect.any(String),
    });
  });

  test('LinkupSearch handles domain filters and max results correctly', async () => {
    const tool = new LinkupSearch({
      apiKey: 'test-api-key',
      maxResults: 3,
      includeDomains: ['rust-lang.org'],
      excludeDomains: ['reddit.com'],
    });

    const captured = mockResponse(tool, { results: [] });

    await tool._call({ query: 'Rust release notes' });

    const body = await captured.request.json();
    expect(body).toHaveProperty('maxResults', 3);
    expect(body).toHaveProperty('includeDomains', ['rust-lang.org']);
    expect(body).toHaveProperty('excludeDomains', ['reddit.com']);
  });

  test('LinkupSearch handles date filters correctly', async () => {
    const tool = new LinkupSearch({
      apiKey: 'test-api-key',
      fromDate: '2024-01-01',
      toDate: '2024-03-20',
    });

    const captured = mockResponse(tool, { results: [] });

    await tool._call({ query: 'recent developments' });

    const body = await captured.request.json();
    expect(body).toHaveProperty('fromDate', '2024-01-01');
    expect(body).toHaveProperty('toDate', '2024-03-20');
  });

  test('LinkupSearch throws on invalid depth or output type', () => {
    expect(
      () => new LinkupSearch({ apiKey: 'test-api-key', depth: 'invalid' })
    ).toThrow('Invalid depth. Must be one of: fast, standard, deep');
    expect(
      () => new LinkupSearch({ apiKey: 'test-api-key', outputType: 'invalid' })
    ).toThrow(
      'Invalid output type. Must be one of: searchResults, sourcedAnswer'
    );
  });

  test('LinkupSearch handles client error (4xx)', async () => {
    const tool = new LinkupSearch({ apiKey: 'invalid-api-key' });

    mockResponse(tool, { error: 'Unauthorized' }, 401);

    const result = await tool._call({ query: 'test query' });
    expect(result).toBe('API request failed: Client Error (401)');
  });

  test('LinkupSearch handles server error (5xx)', async () => {
    const tool = new LinkupSearch({ apiKey: 'test-api-key' });

    mockResponse(tool, { error: 'Internal Server Error' }, 500);

    const result = await tool._call({ query: 'test query' });
    expect(result).toBe('API request failed: Server Error (500)');
  });

  test('LinkupSearch handles unexpected errors', async () => {
    const tool = new LinkupSearch({ apiKey: 'test-api-key' });

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

  test('LinkupSearch is exported correctly in both paths', () => {
    const { LinkupSearch } = require('../../dist/linkup/index.cjs.js');
    const {
      LinkupSearch: LinkupSearchMain,
    } = require('../../dist/index.cjs.js');

    // Check that both imports are constructor functions
    expect(typeof LinkupSearch).toBe('function');
    expect(typeof LinkupSearchMain).toBe('function');

    // Check they have the same name and properties
    expect(LinkupSearch.name).toBe(LinkupSearchMain.name);
    expect(Object.keys(LinkupSearch.prototype)).toEqual(
      Object.keys(LinkupSearchMain.prototype)
    );
  });
});
