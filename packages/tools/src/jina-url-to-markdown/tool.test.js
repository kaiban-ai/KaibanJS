const {
  JinaUrlToMarkdown,
} = require('../../dist/jina-url-to-markdown/index.cjs.js');

describe('JinaUrlToMarkdown', () => {
  test('JinaUrlToMarkdown sends correct default parameters and receives markdown', async () => {
    const tool = new JinaUrlToMarkdown({ apiKey: 'test-api-key' });

    let capturedRequest;
    tool.httpClient = tool.httpClient.extend({
      hooks: {
        beforeRequest: [
          (request) => {
            capturedRequest = request;
            return new Response(
              JSON.stringify({
                data: {
                  content: '# Test Content\n\nThis is a test.',
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
    expect(capturedRequest.url).toBe('https://r.jina.ai/');
    expect(capturedRequest.method).toBe('POST');
    expect(capturedRequest.headers.get('Authorization')).toBe(
      'Bearer test-api-key'
    );
    const body = await capturedRequest.json();
    expect(body).toEqual({
      url: 'https://example.com',
    });

    // Check response
    expect(result.content).toBe('# Test Content\n\nThis is a test.');
  });

  test('JinaUrlToMarkdown handles client error (4xx)', async () => {
    const tool = new JinaUrlToMarkdown({ apiKey: 'test-api-key' });

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

  test('JinaUrlToMarkdown handles server error (5xx)', async () => {
    const tool = new JinaUrlToMarkdown({ apiKey: 'test-api-key' });

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

  test('JinaUrlToMarkdown handles unexpected errors', async () => {
    const tool = new JinaUrlToMarkdown({ apiKey: 'test-api-key' });

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

  test('JinaUrlToMarkdown is exported correctly in both paths', () => {
    const {
      JinaUrlToMarkdown,
    } = require('../../dist/jina-url-to-markdown/index.cjs.js');
    const {
      JinaUrlToMarkdown: JinaUrlToMarkdownMain,
    } = require('../../dist/index.cjs.js');

    // Check that both imports are constructor functions
    expect(typeof JinaUrlToMarkdown).toBe('function');
    expect(typeof JinaUrlToMarkdownMain).toBe('function');

    // Check they have the same name and properties
    expect(JinaUrlToMarkdown.name).toBe(JinaUrlToMarkdownMain.name);
    expect(Object.keys(JinaUrlToMarkdown.prototype)).toEqual(
      Object.keys(JinaUrlToMarkdownMain.prototype)
    );
  });
});
