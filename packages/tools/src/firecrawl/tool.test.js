const { Firecrawl } = require('../../dist/firecrawl/index.cjs.js');

describe('Firecrawl', () => {
  test('Firecrawl sends correct default parameters and receives markdown', async () => {
    const tool = new Firecrawl({ apiKey: 'test-api-key' });

    let capturedRequest;
    tool.httpClient = tool.httpClient.extend({
      hooks: {
        beforeRequest: [
          (request) => {
            capturedRequest = request;
            return new Response(
              JSON.stringify({
                data: {
                  markdown: '# Test Content\n\nThis is a test.',
                },
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

    const result = await tool._call({ url: 'https://example.com' });

    // Check request
    expect(capturedRequest.url).toBe('https://api.firecrawl.dev/v1/scrape');
    expect(capturedRequest.method).toBe('POST');
    expect(capturedRequest.headers.get('Authorization')).toBe(
      'Bearer test-api-key'
    );
    const body = await capturedRequest.json();
    expect(body).toEqual({
      url: 'https://example.com',
      formats: ['markdown'],
    });

    // Check response
    expect(result).toBe('# Test Content\n\nThis is a test.');
  });

  test('Firecrawl sends correct parameters with custom format and receives HTML', async () => {
    const tool = new Firecrawl({ apiKey: 'test-api-key', format: 'html' });

    let capturedRequest;
    tool.httpClient = tool.httpClient.extend({
      hooks: {
        beforeRequest: [
          (request) => {
            capturedRequest = request;
            return new Response(
              JSON.stringify({
                data: {
                  html: '<h1>Test Content</h1><p>This is a test.</p>',
                },
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

    const result = await tool._call({ url: 'https://example.com' });

    // Check request
    expect(capturedRequest.url).toBe('https://api.firecrawl.dev/v1/scrape');
    expect(capturedRequest.method).toBe('POST');
    expect(capturedRequest.headers.get('Authorization')).toBe(
      'Bearer test-api-key'
    );
    const body = await capturedRequest.json();
    expect(body).toEqual({
      url: 'https://example.com',
      formats: ['html'],
    });

    // Check response
    expect(result).toBe('<h1>Test Content</h1><p>This is a test.</p>');
  });

  test('Firecrawl handles client error (4xx)', async () => {
    const tool = new Firecrawl({ apiKey: 'test-api-key' });

    tool.httpClient = tool.httpClient.extend({
      hooks: {
        beforeRequest: [
          () => {
            return new Response(JSON.stringify({ error: 'Not Found' }), {
              status: 404,
              headers: { 'Content-Type': 'application/json' },
            });
          },
        ],
      },
    });

    const result = await tool._call({ url: 'https://example.com' });

    expect(result).toBe('API request failed: Client Error (404)');
  });

  test('Firecrawl handles server error (5xx)', async () => {
    const tool = new Firecrawl({ apiKey: 'test-api-key' });

    tool.httpClient = tool.httpClient.extend({
      hooks: {
        beforeRequest: [
          () => {
            return new Response(
              JSON.stringify({ error: 'Internal Server Error' }),
              {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
              }
            );
          },
        ],
      },
    });

    const result = await tool._call({ url: 'https://example.com' });

    expect(result).toBe('API request failed: Server Error (500)');
  });

  test('Firecrawl handles unexpected errors', async () => {
    const tool = new Firecrawl({ apiKey: 'test-api-key' });

    tool.httpClient = tool.httpClient.extend({
      hooks: {
        beforeRequest: [
          () => {
            throw new Error('Network Error');
          },
        ],
      },
    });

    const result = await tool._call({ url: 'https://example.com' });

    expect(result).toBe('An unexpected error occurred: Network Error');
  });

  test('Firecrawl is exported correctly in both paths', () => {
    const { Firecrawl } = require('../../dist/firecrawl/index.cjs.js');
    const { Firecrawl: FirecrawlMain } = require('../../dist/index.cjs.js');

    // Check that both imports are constructor functions
    expect(typeof Firecrawl).toBe('function');
    expect(typeof FirecrawlMain).toBe('function');

    // Check they have the same name and properties
    expect(Firecrawl.name).toBe(FirecrawlMain.name);
    expect(Object.keys(Firecrawl.prototype)).toEqual(
      Object.keys(FirecrawlMain.prototype)
    );
  });
});
