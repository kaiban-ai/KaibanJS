/**
 * Tavily Search Results
 *
 * This tool integrates with Tavily (https://tavily.com/), an advanced search engine
 * optimized for comprehensive, accurate, and trusted results. It's particularly
 * useful for retrieving current information and answering questions about recent events.
 *
 * Tavily provides AI-optimized search capabilities that deliver high-quality,
 * relevant results, making it ideal for AI applications and Large Language
 * Models (LLMs).
 *
 * Key features of Tavily:
 * - Delivers accurate and trusted search results
 * - Optimized for current events and real-time information
 * - Returns well-structured JSON data ready for LLM consumption
 * - Includes content relevance scoring and filtering
 *
 * For more information about Tavily, visit: https://tavily.com/
 */

import { StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import ky, { HTTPError } from 'ky';

/**
 * Type for the parameters in TavilySearchResults
 * @typedef {string} TavilySearchParams
 * @example
 * {
 *   searchQuery: "search query"
 */
type TavilySearchParams = {
  searchQuery: string;
};

/**
 * Configuration options for the TavilySearchResults tool
 * @interface TavilySearchFields
 * @property {string} apiKey - The API key for the Tavily search engine
 * @property {number} [maxResults] - The maximum number of results to return
 */
interface TavilySearchFields {
  apiKey: string;
  maxResults?: number;
}

/**
 * Type for the results from the Tavily search engine
 * @typedef {Object} TavilyResult
 * @property {string} title - The title of the result
 * @property {string} url - The URL of the result
 * @property {string} content - The content of the result
 * @property {number} score - The score of the result
 * @property {Object} [key: string]: any - Additional properties of the result
 */
type TavilyResult = {
  title: string;
  url: string;
  content: string;
  score: number;
  [key: string]: any;
};

/**
 * Type for the error response from the Tavily search engine
 * @typedef {string} TavilyError
 * @example
 * "Invalid API key"
 */
type TavilyError = string;

/**
 * Type for the response from the Tavily search engine
 * @typedef {TavilyResult[] | TavilyError} TavilyResponse
 * @example
 * [
 *   {
 *     title: "Tavily Search Results",
 *     url: "https://tavily.com",
 *     content: "Tavily is a search engine that provides AI-optimized search capabilities.",
 *     score: 0.95
 *   }
 * ]
 */
type TavilyResponse = TavilyResult[] | TavilyError;

/**
 * TavilySearchResults tool class
 * @extends StructuredTool
 */
export class TavilySearchResults extends StructuredTool {
  private apiKey: string;
  private maxResults: number;
  private httpClient: typeof ky;
  name = 'tavily_search_results_json';
  description =
    'A search engine optimized for comprehensive, accurate, and trusted results. Useful for when you need to answer questions about current events. Input should be a search query.';
  schema = z.object({
    searchQuery: z
      .string()
      .describe('The search query to find relevant information.'),
  });

  /**
   * @param {TavilySearchFields} fields - The fields for the Tavily search engine
   */
  constructor(fields: TavilySearchFields) {
    super();
    this.apiKey = fields.apiKey;
    this.maxResults = fields.maxResults ?? 5;
    this.httpClient = ky;
  }

  /**
   * @param {TavilySearchParams} input - The input for the Tavily search engine
   * @returns {Promise<TavilyResponse>} The response from the Tavily search engine
   */
  async _call(input: TavilySearchParams): Promise<TavilyResponse> {
    try {
      const jsonData = await this.httpClient
        .post('https://api.tavily.com/search', {
          json: {
            query: input.searchQuery,
            max_results: this.maxResults,
            api_key: this.apiKey,
          },
          headers: {
            'Content-Type': 'application/json',
          },
        })
        .json<{ results?: TavilyResult[] }>();

      // Extract and validate the results from the response
      const results = jsonData?.results;
      if (!Array.isArray(results)) {
        return 'Could not parse Tavily results. Please try again.';
      }

      return JSON.stringify(results);
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
