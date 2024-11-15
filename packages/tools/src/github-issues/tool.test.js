const { GithubIssues } = require('../../dist/github-issues/index.cjs.js');

describe('GithubIssues', () => {
  let tool;

  beforeEach(() => {
    tool = new GithubIssues({ limit: 2 });
  });

  test('constructor sets default values correctly', () => {
    expect(tool.name).toBe('github-issues');
    expect(tool.limit).toBe(2);
    expect(tool.token).toBeUndefined();
  });

  test('constructor accepts token and custom limit', () => {
    const customTool = new GithubIssues({
      token: 'test-token',
      limit: 5,
    });
    expect(customTool.token).toBe('test-token');
    expect(customTool.limit).toBe(5);
  });

  test('successfully fetches and formats issues from public repo', async () => {
    let capturedRequest;
    tool.httpClient = tool.httpClient.extend({
      hooks: {
        beforeRequest: [
          (request) => {
            capturedRequest = request;
            return new Response(
              JSON.stringify([
                {
                  number: 1,
                  title: 'Test Issue',
                  html_url: 'https://github.com/owner/repo/issues/1',
                  labels: [{ name: 'bug' }],
                  body: 'Test description',
                },
                {
                  number: 2,
                  title: 'Another Issue',
                  html_url: 'https://github.com/owner/repo/issues/2',
                  labels: [{ name: 'feature' }],
                  body: null,
                },
              ]),
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
      repoUrl: 'https://github.com/owner/repo',
    });

    // Verify request
    expect(capturedRequest.url).toContain(
      'api.github.com/repos/owner/repo/issues'
    );
    expect(capturedRequest.method).toBe('GET');

    // Verify response structure
    expect(result).toEqual({
      repository: {
        name: 'repo',
        url: 'https://github.com/owner/repo',
        owner: 'owner',
      },
      metadata: {
        totalIssues: 2,
        lastUpdated: expect.any(String),
        limit: 2,
      },
      issues: [
        {
          number: 1,
          title: 'Test Issue',
          url: 'https://github.com/owner/repo/issues/1',
          labels: ['bug'],
          description: 'Test description',
        },
        {
          number: 2,
          title: 'Another Issue',
          url: 'https://github.com/owner/repo/issues/2',
          labels: ['feature'],
          description: 'No description provided',
        },
      ],
    });
  });

  test('handles invalid GitHub URLs', async () => {
    const result = await tool._call({
      repoUrl: 'https://invalid-url.com',
    });
    expect(result).toBe(
      'An unexpected error occurred: Invalid GitHub repository URL'
    );
  });

  test('handles GitHub API errors', async () => {
    tool.httpClient = tool.httpClient.extend({
      hooks: {
        beforeRequest: [
          () => {
            return new Response(
              JSON.stringify({
                message: 'Not Found',
              }),
              {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
              }
            );
          },
        ],
      },
    });

    const result = await tool._call({
      repoUrl: 'https://github.com/owner/nonexistent',
    });
    expect(result).toBe('API request failed: Client Error (404)');
  });

  test('handles rate limit errors', async () => {
    tool.httpClient = tool.httpClient.extend({
      hooks: {
        beforeRequest: [
          () => {
            return new Response(
              JSON.stringify({
                message: 'API rate limit exceeded',
              }),
              {
                status: 403,
                headers: { 'Content-Type': 'application/json' },
              }
            );
          },
        ],
      },
    });

    const result = await tool._call({
      repoUrl: 'https://github.com/owner/repo',
    });
    expect(result).toBe('API request failed: Client Error (403)');
  });

  test('extracts owner and repo correctly from different URL formats', async () => {
    const urls = [
      'https://github.com/owner/repo',
      'https://github.com/owner/repo/',
      'https://github.com/owner/repo/issues',
      'http://github.com/owner/repo',
    ];

    for (const url of urls) {
      const result = tool._parseRepoUrl(url);
      expect(result).toEqual({
        owner: 'owner',
        repo: 'repo',
      });
    }
  });
});
