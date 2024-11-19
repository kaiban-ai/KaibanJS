import { Tool } from '@langchain/core/tools';
import { z } from 'zod';
import ky from 'ky';
import { HTTPError } from 'ky';
import { getSubtitles } from 'youtube-captions-scraper';

export class YouTubeCaptionsScraper extends Tool {
  constructor(fields) {
    super(fields);
    this.token = fields.token;
    this.name = 'youtube-captions-scraper';
    this.description = 'Tools to extract video caption from youtube';
    this.httpClient = ky;

    // Define the input schema using Zod
    this.schema = z.object({
      videoUrl: z
        .string()
        .url()
        .describe('The URL of the YouTube video to extract captions from.'),
    });
  }

  async _call(input) {
    try {
      const videoId = this.extractVideoId(input.videoUrl);
      if (!videoId) {
        return 'Invalid video URL: Unable to extract video ID';
      }

      const headers = {
        Authorization: `Bearer ${this.token}`,
      };
      // Make an API request to the YouTube Data API
      const jsonData = await this.httpClient
        .get(
          `https://www.googleapis.com/youtube/v3/captions?videoId=${videoId}&part=id,snippet`,
          { headers }
        )
        .json();
      // Extract and validate the results from the response
      const captions = jsonData?.items[0]?.snippet;
      if (!captions) {
        return 'No captions found';
      }
      const captionContent = await downloadAutoGeneratedCaptions(
        videoId,
        captions.language
      );

      return captionContent;
    } catch (error) {
      if (error instanceof HTTPError) {
        const statusCode = error.response.status;
        let errorType = 'Unknown';
        if (statusCode >= 400 && statusCode < 500) {
          errorType = 'Client Error';
        } else if (statusCode >= 500) {
          errorType = 'Server Error';
        }
        return `API request failed: ${errorType} (${statusCode})`;
      } else {
        return `An unexpected error occurred: ${error.message}`;
      }
    }
  }

  extractVideoId(videoUrl) {
    try {
      const url = new URL(videoUrl);
      const urlParams = new URLSearchParams(url.search);
      return urlParams.get('v');
    } catch {
      throw new Error('Invalid URL');
    }
  }
}

const downloadAutoGeneratedCaptions = async (videoId, lang = 'en') => {
  try {
    const captions = await getSubtitles({
      videoID: videoId, // YouTube video ID
      lang, // Language code for captions, change as needed
    });

    // Process and display the captions
    let captionContent = `Video Id: ${videoId}\n\n`;

    for (let index = 0; index < captions.length; index++) {
      const caption = captions[index];
      captionContent += `[${caption.start}]: ${caption.text}\n`;
    }

    return captionContent;
  } catch (error) {
    console.error('Error downloading captions:', error);
  }
};