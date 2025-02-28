/**
 * Exa Search Tool
 *
 * This tool integrates with Exa (https://exa.ai/), a search engine for AI that organizes
 * the web using embeddings. It provides high-quality web data specifically optimized
 * for AI applications.
 *
 * Key features:
 * - Neural Search: Meaning-based search using embeddings
 * - Keyword Search: Traditional search capabilities
 * - Auto Search: Dynamically chooses between neural and keyword
 * - Category-focused search
 * - Domain filtering
 * - Date filtering
 * - Text filtering
 */

import { StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import ky, { HTTPError } from 'ky';

const API_BASE_URL = 'https://api.exa.ai';

type SearchType = 'neural' | 'keyword' | 'auto';
type Category =
  | 'company'
  | 'research paper'
  | 'news'
  | 'github'
  | 'tweet'
  | 'movie'
  | 'song'
  | 'personal site'
  | 'pdf';
type LiveCrawl = 'never' | 'fallback' | 'always';

interface ContentConfig {
  text?: {
    maxCharacters: number;
    includeHtmlTags: boolean;
  };
  highlights?: {
    numSentences: number;
    highlightsPerUrl: number;
    query: string;
  };
  summary?: {
    query: string;
  };
  subpages?: number;
  subpageTarget?: number;
  livecrawl?: LiveCrawl;
  livecrawlTimeout?: number;
}

interface ExaSearchFields {
  apiKey: string;
  type?: SearchType;
  useAutoprompt?: boolean;
  numResults?: number;
  category?: Category;
  startPublishedDate?: string;
  endPublishedDate?: string;
  includeDomains?: string[];
  excludeDomains?: string[];
  includeText?: string[];
  excludeText?: string[];
  startCrawlDate?: string;
  endCrawlDate?: string;
  contents?: ContentConfig;
}

interface SearchParams {
  query: string;
  type: SearchType;
  useAutoprompt: boolean;
  category?: Category;
  numResults: number;
  includeDomains?: string[];
  excludeDomains?: string[];
  startCrawlDate?: string;
  endCrawlDate?: string;
  startPublishedDate?: string;
  endPublishedDate?: string;
  includeText?: string[];
  excludeText?: string[];
  contents?: ContentConfig;
}

export class ExaSearch extends StructuredTool {
  private apiKey: string;
  private type: SearchType;
  private useAutoprompt: boolean;
  private category?: Category;
  private numResults: number;
  private includeDomains: string[];
  private excludeDomains: string[];
  private startCrawlDate?: string;
  private endCrawlDate?: string;
  private startPublishedDate?: string;
  private endPublishedDate?: string;
  private includeText: string[];
  private excludeText: string[];
  private contents?: ContentConfig;
  private httpClient: typeof ky;
  name = 'exa-search';
  description =
    'A powerful AI-optimized search engine that provides high-quality web data using embeddings-based search.';

  schema = z.object({
    query: z.string().describe('The search query to look up'),
  });
  constructor(fields: ExaSearchFields) {
    super();

    if (fields.type && !['neural', 'keyword', 'auto'].includes(fields.type)) {
      throw new Error(
        'Invalid search type. Must be one of: neural, keyword, auto'
      );
    }

    this.apiKey = fields.apiKey;

    // Configuration parameters in order of API documentation
    this.type = fields.type || 'neural';
    this.useAutoprompt = fields.useAutoprompt || false;
    this.category = fields.category;
    this.numResults = fields.numResults || 10;
    this.includeDomains = fields.includeDomains || [];
    this.excludeDomains = fields.excludeDomains || [];
    this.startCrawlDate = fields.startCrawlDate;
    this.endCrawlDate = fields.endCrawlDate;
    this.startPublishedDate = fields.startPublishedDate;
    this.endPublishedDate = fields.endPublishedDate;
    this.includeText = fields.includeText || [];
    this.excludeText = fields.excludeText || [];
    this.contents = fields.contents;

    this.httpClient = ky.extend({
      prefixUrl: API_BASE_URL,
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json',
      },
    });
  }

  async _call(input: { query: string }): Promise<unknown> {
    try {
      const searchParams: SearchParams = {
        query: input.query,
        type: this.type,
        useAutoprompt: this.useAutoprompt,
        category: this.category,
        numResults: this.numResults,
        includeDomains: this.includeDomains,
        excludeDomains: this.excludeDomains,
        startCrawlDate: this.startCrawlDate,
        endCrawlDate: this.endCrawlDate,
        startPublishedDate: this.startPublishedDate,
        endPublishedDate: this.endPublishedDate,
        includeText: this.includeText,
        excludeText: this.excludeText,
        contents: this.contents,
      };

      // Remove undefined and empty values
      Object.keys(searchParams).forEach((key) => {
        if (
          searchParams[key as keyof SearchParams] === undefined ||
          (Array.isArray(searchParams[key as keyof SearchParams]) &&
            (searchParams[key as keyof SearchParams] as unknown[]).length === 0)
        ) {
          delete searchParams[key as keyof SearchParams];
        }
      });

      const response = await this.httpClient
        .post('search', {
          json: searchParams,
        })
        .json();

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
