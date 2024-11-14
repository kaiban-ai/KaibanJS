const { WolframAlphaTool } = require('../../dist/wolframalpha/index.cjs.js');

describe('WolframAlphaTool', () => {
  test('WolframAlphaTool sends correct parameters and receives results', async () => {
    const tool = new WolframAlphaTool({ appId: 'test-app-id' });

    let capturedRequest;
    tool.httpClient = tool.httpClient.extend({
      hooks: {
        beforeRequest: [
          (request) => {
            capturedRequest = request;
            return new Response(
              JSON.stringify({
                queryresult: {
                  success: true,
                  pods: [
                    {
                      title: 'Result',
                      subpods: [
                        {
                          plaintext: '1.7 astronomical units (approximately)',
                        },
                      ],
                    },
                  ],
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

    const result = await tool._call({
      query: 'average distance of Mars from the Sun',
    });

    // Check request
    expect(capturedRequest.url).toBe(
      'https://www.kaibanjs.com/proxy/wolframalpha'
    );
    expect(capturedRequest.method).toBe('POST');
    expect(capturedRequest.headers.get('X-APP-ID')).toBe('test-app-id');
    expect(capturedRequest.headers.get('Content-Type')).toBe(
      'application/json'
    );

    // Check request body
    const body = await capturedRequest.json();
    expect(body).toEqual({
      query: 'average distance of Mars from the Sun',
    });

    // Check response structure
    expect(result).toHaveProperty('queryresult');
    expect(result.queryresult).toHaveProperty('success', true);
    expect(result.queryresult).toHaveProperty('pods');
  });

  test('WolframAlphaTool handles non-JSON responses', async () => {
    const tool = new WolframAlphaTool({ appId: 'test-app-id' });

    tool.httpClient = tool.httpClient.extend({
      hooks: {
        beforeRequest: [
          () => {
            return new Response(
              'Query:\n"average distance of Mars from the Sun"\n\nResult:\n1.7 au',
              {
                status: 200,
                headers: { 'Content-Type': 'text/plain' },
              }
            );
          },
        ],
      },
    });

    const result = await tool._call({
      query: 'average distance of Mars from the Sun',
    });
    expect(typeof result).toBe('string');
  });

  test('WolframAlphaTool handles empty queries', async () => {
    const tool = new WolframAlphaTool({ appId: 'test-app-id' });

    expect(() => {
      tool.schema.parse({ query: '' });
    }).toThrow();
  });

  test('WolframAlphaTool handles client error (4xx)', async () => {
    const tool = new WolframAlphaTool({ appId: 'invalid-app-id' });

    tool.httpClient = tool.httpClient.extend({
      hooks: {
        beforeRequest: [
          () => {
            return new Response(
              JSON.stringify({
                error: 'Invalid AppID',
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

  test('WolframAlphaTool handles server error (5xx)', async () => {
    const tool = new WolframAlphaTool({ appId: 'test-app-id' });

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

  test('WolframAlphaTool handles unexpected errors', async () => {
    const tool = new WolframAlphaTool({ appId: 'test-app-id' });

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

  test('WolframAlphaTool validates required appId', () => {
    expect(() => {
      new WolframAlphaTool();
    }).toThrow();
  });
});
