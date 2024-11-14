const {
  YouTubeVideoCaption,
} = require('../../dist/youtube-video-caption/index.cjs.js');

describe('YouTubeVideoCaption', () => {
  test('should return captions for a valid video ID', async () => {
    const tool = new YouTubeVideoCaption({
      token: 'test-api-key',
    });
    tool.httpClient = tool.httpClient.extend({
      hooks: {
        beforeRequest: [
          () => {
            return new Response(
              JSON.stringify({
                items: [
                  {
                    id: 'caption_id',
                    snippet: {
                      language: 'en',
                      name: 'English',
                      videoId: 'NFpqFEl-URY',
                    },
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

    const input = { videoId: 'NFpqFEl-URY' };
    const result = await tool._call(input);
    expect(result).toContain(`Video Id: NFpqFEl-URY`);
  });
  test('should return captions no found for video ID', async () => {
    const tool = new YouTubeVideoCaption({
      token: 'test-api-key',
    });
    tool.httpClient = tool.httpClient.extend({
      hooks: {
        beforeRequest: [
          () => {
            return new Response(
              JSON.stringify({
                items: false,
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

    const input = { videoId: 'NFpqFEl-URY' };
    const result = await tool._call(input);
    expect(result).toBe(`No captions found`);
  });
  test('should return an error message for an invalid video ID', async () => {
    const tool = new YouTubeVideoCaption({
      token: 'test-api-key',
    });

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

    const input = { videoId: 'invalid_video_id' };
    const result = await tool._call(input);
    expect(result).toBe('API request failed: Client Error (404)');
  });

  test('should handle server error (5xx)', async () => {
    const tool = new YouTubeVideoCaption({
      token: 'test-api-key',
    });

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

    const input = { videoId: 'NFpqFEl-URY' };
    const result = await tool._call(input);
    expect(result).toBe('API request failed: Server Error (500)');
  });

  test('should handle unexpected errors', async () => {
    const tool = new YouTubeVideoCaption({
      token: 'test-api-key',
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

    const input = { videoId: 'NFpqFEl-URY' };
    const result = await tool._call(input);
    expect(result).toBe('An unexpected error occurred: Network Error');
  });
});
