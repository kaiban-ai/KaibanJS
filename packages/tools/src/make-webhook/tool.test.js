const { MakeWebhook } = require('../../dist/Make-webhook/index.cjs.js');

describe('MakeWebhook', () => {
  test('MakeWebhook sends correct parameters and receives response', async () => {
    const tool = new MakeWebhook({
      url: 'https://hook.us2.make.com/fwxq61cn8k5f6143rsomlk3plcupsypp',
      schema: {
        data: {
          type: 'object',
          properties: {
            issues: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  url: { type: 'string' },
                },
              },
            },
          },
        },
      },
    });

    let capturedRequest;
    tool.httpClient = tool.httpClient.extend({
      hooks: {
        beforeRequest: [
          (request) => {
            capturedRequest = request;
            return new Response(
              JSON.stringify({
                status: 'success',
                message: 'Webhook received',
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
      data: {
        issues: [
          { title: 'Issue 1', url: 'https://github.com/owner/repo/issues/1' },
          { title: 'Issue 2', url: 'https://github.com/owner/repo/issues/2' },
        ],
      },
    });

    // Check request
    expect(capturedRequest.url).toBe(
      'https://hook.us2.make.com/fwxq61cn8k5f6143rsomlk3plcupsypp'
    );
    expect(capturedRequest.method).toBe('POST');
    expect(capturedRequest.headers.get('Content-Type')).toBe(
      'application/json'
    );
    const body = await capturedRequest.json();
    expect(body).toEqual({
      data: {
        issues: [
          { title: 'Issue 1', url: 'https://github.com/owner/repo/issues/1' },
          { title: 'Issue 2', url: 'https://github.com/owner/repo/issues/2' },
        ],
      },
    });

    // Check response
    expect(result).toBe('Webhook response success');
  });

  test('MakeWebhook handles client error (4xx)', async () => {
    const tool = new MakeWebhook({
      url: 'https://hook.us2.make.com/fwxq61cn8k5f6143rsomlk3plcupsypp',
      schema: {
        data: {
          type: 'object',
          properties: {
            issues: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  url: { type: 'string' },
                },
              },
            },
          },
        },
      },
    });

    tool.httpClient = tool.httpClient.extend({
      hooks: {
        beforeRequest: [
          () => {
            return new Response(
              JSON.stringify({
                status: 'error',
                message: 'Invalid request',
              }),
              {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
              }
            );
          },
        ],
      },
    });

    const result = await tool._call({
      data: {
        issues: [
          { title: 'Issue 1', url: 'https://github.com/owner/repo/issues/1' },
          { title: 'Issue 2', url: 'https://github.com/owner/repo/issues/2' },
        ],
      },
    });

    expect(result).toBe('API request failed: Client Error (400)');
  });

  test('MakeWebhook handles server error (5xx)', async () => {
    const tool = new MakeWebhook({
      url: 'https://hook.us2.make.com/fwxq61cn8k5f6143rsomlk3plcupsypp',
      schema: {
        data: {
          type: 'object',
          properties: {
            issues: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  url: { type: 'string' },
                },
              },
            },
          },
        },
      },
    });

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

    const result = await tool._call({
      data: {
        issues: [
          { title: 'Issue 1', url: 'https://github.com/owner/repo/issues/1' },
          { title: 'Issue 2', url: 'https://github.com/owner/repo/issues/2' },
        ],
      },
    });

    expect(result).toBe('API request failed: Server Error (500)');
  });

  test('MakeWebhook handles unexpected errors', async () => {
    const tool = new MakeWebhook({
      url: 'https://hook.us2.make.com/fwxq61cn8k5f6143rsomlk3plcupsypp',
      schema: {
        data: {
          type: 'object',
          properties: {
            issues: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  url: { type: 'string' },
                },
              },
            },
          },
        },
      },
    });

    tool.httpClient = tool.httpClient.extend({
      hooks: {
        beforeRequest: [
          () => {
            throw new Error('Network Error');
          },
        ],
      },
    });

    const result = await tool._call({
      data: {
        issues: [
          { title: 'Issue 1', url: 'https://github.com/owner/repo/issues/1' },
          { title: 'Issue 2', url: 'https://github.com/owner/repo/issues/2' },
        ],
      },
    });

    expect(result).toBe('An unexpected error occurred: Network Error');
  });

  test('MakeWebhook is exported correctly in both paths', () => {
    const { MakeWebhook } = require('../../dist/make-webhook/index.cjs.js');
    const { MakeWebhook: MakeWebhookMain } = require('../../dist/index.cjs.js');

    // Check that both imports are constructor functions
    expect(typeof MakeWebhook).toBe('function');
    expect(typeof MakeWebhookMain).toBe('function');

    // Check they have the same name and properties
    expect(MakeWebhook.name).toBe(MakeWebhookMain.name);
    expect(Object.keys(MakeWebhook.prototype)).toEqual(
      Object.keys(MakeWebhookMain.prototype)
    );
  });
});
