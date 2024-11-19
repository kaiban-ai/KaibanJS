const {
  YouTubeCaptionsScraper,
} = require('../../dist/youtube-captions-scraper/index.cjs.js');
jest.setTimeout(30000);

describe('YouTubeCaptionsScraper', () => {
  test('should return captions for a valid video URL', async () => {
    const tool = new YouTubeCaptionsScraper({
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

    const input = { videoUrl: 'https://www.youtube.com/watch?v=NFpqFEl-URY' };
    const result = await tool._call(input);
    expect(result).toContain('Video Id: NFpqFEl-URY');
  });

  test('should return captions not found for video URL', async () => {
    const tool = new YouTubeCaptionsScraper({
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

    const input = { videoUrl: 'https://www.youtube.com/watch?v=NFpqFEl-URY' };
    const result = await tool._call(input);
    expect(result).toBe('No captions found');
  });

  test('should return an error message for an invalid video URL', async () => {
    const tool = new YouTubeCaptionsScraper({
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

    const input = {
      videoUrl: 'https://www.youtube.com/watch?v=invalid_video_id',
    };
    const result = await tool._call(input);
    expect(result).toBe('API request failed: Client Error (404)');
  });

  test('should handle server error (5xx)', async () => {
    const tool = new YouTubeCaptionsScraper({
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

    const input = { videoUrl: 'https://www.youtube.com/watch?v=NFpqFEl-URY' };
    const result = await tool._call(input);
    expect(result).toBe('API request failed: Server Error (500)');
  });

  test('should handle unexpected errors', async () => {
    const tool = new YouTubeCaptionsScraper({
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

    const input = { videoUrl: 'https://www.youtube.com/watch?v=NFpqFEl-URY' };
    const result = await tool._call(input);
    expect(result).toBe('An unexpected error occurred: Network Error');
  });

  test('should return an error for an invalid video URL', async () => {
    const tool = new YouTubeCaptionsScraper({
      token: 'test-api-key',
    });

    const input = { videoUrl: 'invalid-url' };
    const result = await tool._call(input);
    expect(result).toBe('An unexpected error occurred: Invalid URL');
  });

  test('should return an error for a valid URL without video ID', async () => {
    const tool = new YouTubeCaptionsScraper({
      token: 'test-api-key',
    });

    const input = { videoUrl: 'https://www.youtube.com/watch' };
    const result = await tool._call(input);
    expect(result).toBe('Invalid video URL: Unable to extract video ID');
  });

  test('YouTubeCaptionsScraper is exported correctly in both paths', () => {
    const {
      YouTubeCaptionsScraper,
    } = require('../../dist/youtube-captions-scraper/index.cjs.js');
    const {
      YouTubeCaptionsScraper: YouTubeCaptionsScraperMain,
    } = require('../../dist/index.cjs.js');

    // Check that both imports are constructor functions
    expect(typeof YouTubeCaptionsScraper).toBe('function');
    expect(typeof YouTubeCaptionsScraperMain).toBe('function');

    // Check they have the same name and properties
    expect(YouTubeCaptionsScraper.name).toBe(YouTubeCaptionsScraperMain.name);
    expect(Object.keys(YouTubeCaptionsScraper.prototype)).toEqual(
      Object.keys(YouTubeCaptionsScraperMain.prototype)
    );
  });
});
