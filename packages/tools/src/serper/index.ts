/**
 * Serper
 *
 * This tool integrates with Serper (https://serper.dev/), a Google Search API service
 * that provides access to Google Search results programmatically.
 *
 * Serper allows you to perform various types of Google searches including web search,
 * image search, news search, and more, making it ideal for AI applications that need
 * real-time information from the web.
 *
 * Available search types:
 *  - "search" (default): For general search queries
 *  - "images": For image search
 *  - "videos": For video search
 *  - "places": For location-based search
 *  - "maps": For map search
 *  - "news": For news search
 *  - "shopping": For shopping search
 *  - "scholar": For academic publications search
 *  - "patents": For patents search
 *  - "webpage": For scraping webpages
 *     Note: The Scraper option is in Beta and may be subject to changes
 *
 * Key features:
 * - Multiple search types
 * - Clean, structured JSON responses
 * - High-performance API with good uptime
 * - Webpage scraping capability (Beta)
 *
 * For more information about Serper, visit: https://serper.dev/
 */

import { StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import ky, { HTTPError } from 'ky';

type SearchType =
  | 'search'
  | 'images'
  | 'videos'
  | 'places'
  | 'maps'
  | 'news'
  | 'shopping'
  | 'scholar'
  | 'patents'
  | 'webpage';

// Pre-defined types for Serper
const VALID_TYPES: readonly SearchType[] = [
  'search',
  'images',
  'videos',
  'places',
  'maps',
  'news',
  'shopping',
  'scholar',
  'patents',
  'webpage',
] as const;

interface SerperFields {
  apiKey: string;
  type?: SearchType;
  params?: Record<string, any>;
}

export class Serper extends StructuredTool {
  private apiKey: string;
  private params: Record<string, any>;
  private type: SearchType;
  private httpClient: typeof ky;
  name = 'serper';
  description: string;
  schema: z.ZodObject<any>;

  constructor(fields: SerperFields) {
    super();

    if (fields.type && !VALID_TYPES.includes(fields.type)) {
      throw new Error(
        `Invalid search type: ${
          fields.type
        }. Valid types are: ${VALID_TYPES.join(', ')}`
      );
    }

    this.apiKey = fields.apiKey;
    this.params = fields.params || {};
    this.type = fields.type || 'search';
    this.httpClient = ky;

    this.description = `A powerful search engine tool for retrieving real-time information using ${
      this.type
    } search type. ${
      this.type === 'webpage'
        ? 'Provide a URL to scrape.'
        : 'Provide a search query to look up information.'
    }`;

    // Define the input schema using Zod based on search type
    this.schema =
      this.type === 'webpage'
        ? z.object({
            url: z.string().describe('The URL to scrape'),
          })
        : z.object({
            query: z.string().describe('The search query to look up'),
          });
  }

  async _call(
    input: z.infer<typeof this.schema>
  ): Promise<Record<string, any> | string> {
    try {
      const url =
        this.type === 'webpage'
          ? 'https://scrape.serper.dev'
          : `https://google.serper.dev/${this.type}`;

      const bodyData =
        this.type === 'webpage'
          ? { url: (input as { url: string }).url }
          : { q: (input as { query: string }).query, ...this.params };

      const response = await this.httpClient
        .post(url, {
          json: bodyData,
          headers: {
            'X-API-KEY': this.apiKey,
            'Content-Type': 'application/json',
          },
        })
        .json<Record<string, any>>();

      return response;
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
