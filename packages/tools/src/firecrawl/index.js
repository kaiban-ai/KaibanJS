/**
 * Firecrawl
 *
 * This tool integrates with Firecrawl (https://www.firecrawl.dev/), a web scraping
 * and crawling service designed to turn websites into LLM-ready data.
 *
 * Firecrawl allows you to extract clean, well-formatted markdown or structured data
 * from websites, making it ideal for AI applications, particularly those using
 * Large Language Models (LLMs).
 *
 * Key features of Firecrawl:
 * - Scrapes and crawls websites, even those with dynamic content
 * - Converts web content into clean, LLM-ready markdown
 * - Handles challenges like rate limits, JavaScript rendering, and anti-bot mechanisms
 * - Offers flexible pricing plans, including a free tier for small-scale use
 *
 * Usage:
 * const tool = new Firecrawl({ apiKey: 'your-api-key' });
 * const result = await tool._call({ url: 'https://example.com' });
 *
 * For more information about Firecrawl, visit: https://www.firecrawl.dev/
 */

import { Tool } from '@langchain/core/tools';
import { z } from 'zod';
import ky from 'ky';
import { HTTPError } from 'ky';

export class Firecrawl extends Tool {
  constructor(fields) {
    super(fields);
    this.name = 'firecrawl';
    this.apiKey = fields.apiKey;
    this.format = fields.format || 'markdown';
    this.mode = 'scrape';
    this.description = `Fetches web content from a specified URL and returns it in ${this.format} format. Input should be a JSON object with a "url".`;

    // Define the input schema using Zod
    this.schema = z.object({
      url: z.string().describe('The URL to scrape and retrieve content from.'),
    });

    this.httpClient = ky;
  }

  async _call(input) {
    try {
      const response = await this.httpClient
        .post('https://api.firecrawl.dev/v1/scrape', {
          json: {
            url: input.url,
            formats: [this.format],
          },
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        })
        .json();

      return (
        response?.data?.[this.format] || 'The API returned an empty response.'
      );
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
}
