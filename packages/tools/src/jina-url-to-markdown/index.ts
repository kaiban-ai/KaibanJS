/**
 * Jina URL to Markdown
 *
 * This tool integrates with Jina (https://jina.ai/), a web scraping
 * and crawling service designed to turn websites into LLM-ready data.
 *
 * Jina allows you to extract clean, well-formatted markdown or structured data
 * from websites, making it ideal for AI applications, particularly those using
 * Large Language Models (LLMs).
 *
 * Key features of Jina:
 * - Scrapes and crawls websites, even those with dynamic content
 * - Converts web content into clean, LLM-ready markdown
 * - Handles challenges like rate limits, JavaScript rendering, and anti-bot mechanisms
 * - Offers flexible pricing plans, including a free tier for small-scale use
 *
 * Usage:
 * const tool = new JinaUrlToMarkdown();
 * const result = await tool._call({ url: 'https://example.com' });
 * or
 * const tool = new JinaUrlToMarkdown({ apiKey: 'your-api-key', options: { 'targetSelector': ['body', '.class', '#id'], 'retainImages': 'none' } });
 * const result = await tool._call({ url: 'https://example.com' });
 *
 * For more information about Jina, visit: https://jina.ai/, https://r.jina.ai/docs
 */

import { StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import ky, { HTTPError } from 'ky';

/**
 * Configuration options for the Jina URL to Markdown conversion
 * @interface JinaUrlToMarkdownOptions
 * @property {string[]} [targetSelector] - CSS selectors to target specific elements for extraction
 * @property {string} [retainImages] - Image handling strategy ('all', 'none', or specific selectors)
 * @example
 * {
 *   targetSelector: ['article', '.content', '#main'],
 *   retainImages: 'none'
 * }
 */
type JinaUrlToMarkdownOptions = {
  targetSelector?: string[];
  retainImages?: string;
};

/**
 * Input parameters for the Jina URL to Markdown tool
 * @interface JinaUrlToMarkdownInput
 * @property {string} url - The URL of the webpage to convert to markdown
 * @example
 * {
 *   url: "https://example.com/blog/post"
 * }
 */
type JinaUrlToMarkdownInput = {
  url: string;
};

/**
 * Constructor parameters for the JinaUrlToMarkdown tool
 * @interface JinaUrlToMarkdownFields
 * @property {string} [apiKey] - Jina API key for authentication
 * @property {JinaUrlToMarkdownOptions} [options] - Configuration options for the conversion
 */
interface JinaUrlToMarkdownFields {
  apiKey?: string;
  options?: JinaUrlToMarkdownOptions;
}

/**
 * Successful response containing markdown content
 * @typedef {string} JinaUrlToMarkdownResult
 * @example
 * "# Article Title\n\nThis is the content of the article..."
 */
type JinaUrlToMarkdownResult = string;

/**
 * Error message returned when the conversion fails
 * @typedef {string} JinaUrlToMarkdownError
 * @example
 * "API request failed: Client Error (404)"
 */
type JinaUrlToMarkdownError = string;

/**
 * Response type that can either be markdown content or an error message
 * @typedef {JinaUrlToMarkdownResult | JinaUrlToMarkdownError} JinaUrlToMarkdownResponse
 */
type JinaUrlToMarkdownResponse =
  | JinaUrlToMarkdownResult
  | JinaUrlToMarkdownError;

export class JinaUrlToMarkdown extends StructuredTool {
  name = 'jina-url-to-markdown';
  description = `Fetches web content from a specified URL and returns it in Markdown format. Input should be a JSON object with a "url".`;
  apiKey?: string;
  options: JinaUrlToMarkdownOptions;
  headers: Record<string, string>;
  schema = z.object({
    url: z.string().describe('The URL to scrape and retrieve content from.'),
  });
  httpClient: typeof ky;

  constructor(fields?: JinaUrlToMarkdownFields) {
    super();
    this.apiKey = fields?.apiKey;
    this.options = fields?.options || {};
    this.headers = { 'Content-Type': 'application/json' };

    if (this.apiKey) {
      this.headers.Authorization = `Bearer ${this.apiKey}`;
    }

    this.httpClient = ky;
  }

  async _call(
    input: JinaUrlToMarkdownInput
  ): Promise<JinaUrlToMarkdownResponse> {
    try {
      const response = await this.httpClient
        .post(`https://r.jina.ai/`, {
          json: {
            url: input.url,
            ...this.options,
          },
          headers: this.headers,
        })
        .json<{ data?: JinaUrlToMarkdownResult }>();

      return response?.data || 'The API returned an empty response.';
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
        return `An unexpected error occurred: ${(error as Error).message}`;
      }
    }
  }
}
