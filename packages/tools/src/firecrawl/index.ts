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
 * For more information about Firecrawl, visit: https://www.firecrawl.dev/
 */

import { StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import ky, { HTTPError } from 'ky';

/**
 * Configuration options for initializing the Firecrawl tool
 * @example
 * {
 *   apiKey: "your-api-key",
 *   format: "markdown"
 * }
 */
interface FirecrawlToolFields {
  apiKey: string;
  format?: string;
}

/**
 * Parameters for making a scraping request
 * @example
 * {
 *   url: "https://example.com/article",
 *   format: "markdown",
 *   mode: "scrape"
 * }
 */
interface FirecrawlToolParams {
  url: string;
  format?: string;
  mode?: string;
}

/** The scraped content returned as a string */
type FirecrawlToolResponse = string;

/** Error message returned when the scraping fails */
type FirecrawlToolError = string;

/**
 * Firecrawl tool for scraping web content and converting it to LLM-ready formats
 *
 * @example
 * ```typescript
 * const firecrawl = new Firecrawl({
 *   apiKey: 'your-api-key',
 *   format: 'markdown'
 * });
 *
 * const content = await firecrawl.call({
 *   url: 'https://example.com/article'
 * });
 * ```
 */
export class Firecrawl extends StructuredTool {
  private apiKey: string;
  private format: string;
  private mode: string;
  private httpClient: typeof ky;
  name = 'firecrawl';
  description: string;
  schema = z.object({
    url: z.string().describe('The URL to scrape and retrieve content from.'),
  });

  /**
   * Creates a new instance of the Firecrawl tool
   *
   * @param fields - Configuration options for the scraping tool
   */
  constructor(fields: FirecrawlToolFields) {
    super();

    this.apiKey = fields.apiKey;
    this.format = fields.format || 'markdown';
    this.mode = 'scrape';
    this.description = `Fetches web content from a specified URL and returns it in ${this.format} format. Input should be a JSON object with a "url".`;
    this.httpClient = ky;
  }

  /**
   * Scrapes content from a URL using the Firecrawl API
   *
   * @param input - The parameters containing the URL to scrape
   * @returns A promise that resolves to either the scraped content or an error message
   *
   * @example
   * ```typescript
   * const content = await firecrawl._call({
   *   url: 'https://example.com/article'
   * });
   * ```
   */
  async _call(
    input: FirecrawlToolParams
  ): Promise<FirecrawlToolResponse | FirecrawlToolError> {
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
        .json<{ data?: { [key: string]: string } }>();

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
        return `An unexpected error occurred: ${
          error instanceof Error ? error.message : String(error)
        }`;
      }
    }
  }
}
