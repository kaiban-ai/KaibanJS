/**
 * Linkup Search Tool
 *
 * This tool integrates with Linkup (https://www.linkup.so/), a web search API built
 * for AI applications. It retrieves real-time, citable sources from the web and can
 * either return raw search results or a synthesized answer with its sources.
 *
 * Key features:
 * - Configurable search depth (fast, standard, deep)
 * - Search results or sourced answers
 * - Domain filtering
 * - Date filtering
 */

import { StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import ky, { HTTPError } from 'ky';

const API_BASE_URL = 'https://api.linkup.so/v1';

/**
 * Structure of an individual search result from Linkup
 * @example
 * {
 *   type: "text",
 *   name: "Example Article",
 *   url: "https://example.com/article",
 *   content: "This is a sample search result..."
 * }
 */
type LinkupSearchToolResult = {
  type: 'text' | 'image';
  name: string;
  url: string;
  content?: string;
  favicon?: string;
};

/**
 * Structure of a source returned with a sourced answer
 * @example
 * {
 *   name: "Example Article",
 *   url: "https://example.com/article",
 *   snippet: "This is a sample snippet..."
 * }
 */
type LinkupSearchToolSource = {
  name: string;
  url: string;
  snippet: string;
  favicon?: string;
};

/** Error message returned when the search fails */
type LinkupSearchToolError = string;

/**
 * Response structure from the Linkup search API
 * - searchResults: `{ results: [...] }`
 * - sourcedAnswer: `{ answer: "...", sources: [...] }`
 */
type LinkupSearchToolResponse =
  | {
      results: LinkupSearchToolResult[];
    }
  | {
      answer: string;
      sources: LinkupSearchToolSource[];
    }
  | LinkupSearchToolError;

/**
 * Depth of the search
 * - fast: Quickest results, best for simple lookups
 * - standard: Balanced speed and quality, suitable for most queries
 * - deep: Slower, iterative search for complex questions
 */
type LinkupSearchToolDepth = 'fast' | 'standard' | 'deep';

/**
 * Type of output to return
 * - searchResults: A list of relevant sources with their content
 * - sourcedAnswer: A natural language answer with the sources used
 */
type LinkupSearchToolOutputType = 'searchResults' | 'sourcedAnswer';

/**
 * Configuration options for initializing the Linkup search tool
 * @example
 * {
 *   apiKey: "your-api-key",
 *   depth: "standard",
 *   outputType: "searchResults",
 *   maxResults: 5,
 *   includeDomains: ["example.com"]
 * }
 */
interface LinkupSearchToolFields {
  apiKey: string;
  depth?: LinkupSearchToolDepth;
  outputType?: LinkupSearchToolOutputType;
  maxResults?: number;
  includeDomains?: string[];
  excludeDomains?: string[];
  fromDate?: string;
  toDate?: string;
}

/**
 * Parameters for performing a search query
 * @example
 * {
 *   query: "Latest developments in artificial intelligence"
 * }
 */
interface LinkupSearchToolParams {
  query: string;
}

/** Request body sent to the Linkup search API */
type LinkupSearchToolRequest = {
  q: string;
  depth: LinkupSearchToolDepth;
  outputType: LinkupSearchToolOutputType;
  maxResults?: number;
  includeDomains?: string[];
  excludeDomains?: string[];
  fromDate?: string;
  toDate?: string;
};

/**
 * LinkupSearch tool for performing real-time web searches using the Linkup API
 *
 * @example
 * ```typescript
 * const linkupSearch = new LinkupSearch({
 *   apiKey: 'your-api-key',
 *   depth: 'standard',
 *   outputType: 'searchResults',
 *   maxResults: 5
 * });
 *
 * const results = await linkupSearch.call({ query: 'Latest AI developments' });
 * ```
 */
export class LinkupSearch extends StructuredTool {
  private apiKey: string;
  private depth: LinkupSearchToolDepth;
  private outputType: LinkupSearchToolOutputType;
  private maxResults?: number;
  private includeDomains: string[];
  private excludeDomains: string[];
  private fromDate?: string;
  private toDate?: string;
  private httpClient: typeof ky;

  name = 'linkup-search';
  description =
    "Search the web in real time with Linkup and return relevant, citable sources (title, URL, content). Use for current events, facts that may have changed, and anything that needs a verifiable source. depth='standard' for most queries, 'deep' for complex multi-step questions.";

  schema = z.object({
    query: z.string().describe('The search query to look up'),
  });

  /**
   * Creates a new instance of the LinkupSearch tool
   *
   * @param fields - Configuration options for the search tool
   * @throws {Error} If an invalid depth or output type is provided
   */
  constructor(fields: LinkupSearchToolFields) {
    super();

    if (fields.depth && !['fast', 'standard', 'deep'].includes(fields.depth)) {
      throw new Error('Invalid depth. Must be one of: fast, standard, deep');
    }

    if (
      fields.outputType &&
      !['searchResults', 'sourcedAnswer'].includes(fields.outputType)
    ) {
      throw new Error(
        'Invalid output type. Must be one of: searchResults, sourcedAnswer'
      );
    }

    this.apiKey = fields.apiKey;
    this.depth = fields.depth || 'standard';
    this.outputType = fields.outputType || 'searchResults';
    this.maxResults = fields.maxResults;
    this.includeDomains = fields.includeDomains || [];
    this.excludeDomains = fields.excludeDomains || [];
    this.fromDate = fields.fromDate;
    this.toDate = fields.toDate;

    this.httpClient = ky.extend({
      prefixUrl: API_BASE_URL,
      // Deep searches can take well over ky's default 10s timeout
      timeout: 120000,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Performs a search using the Linkup API
   *
   * @param input - The search parameters containing the query
   * @returns A promise that resolves to either search results, a sourced answer or an error message
   *
   * @example
   * ```typescript
   * const results = await linkupSearch._call({ query: 'AI technology trends' });
   * ```
   */
  async _call(
    input: LinkupSearchToolParams
  ): Promise<LinkupSearchToolResponse> {
    try {
      const searchParams: LinkupSearchToolRequest = {
        q: input.query,
        depth: this.depth,
        outputType: this.outputType,
        maxResults: this.maxResults,
        includeDomains: this.includeDomains,
        excludeDomains: this.excludeDomains,
        fromDate: this.fromDate,
        toDate: this.toDate,
      };

      // Remove undefined and empty values
      Object.keys(searchParams).forEach((key) => {
        const value = searchParams[key as keyof LinkupSearchToolRequest];
        if (
          value === undefined ||
          (Array.isArray(value) && value.length === 0)
        ) {
          delete searchParams[key as keyof LinkupSearchToolRequest];
        }
      });

      const response = await this.httpClient
        .post('search', {
          json: searchParams,
        })
        .json();

      return response as LinkupSearchToolResponse;
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
