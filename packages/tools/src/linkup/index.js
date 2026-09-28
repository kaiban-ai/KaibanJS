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
 *
 * Usage:
 * const tool = new LinkupSearch({
 *   apiKey: 'your-api-key',
 *   depth: 'standard',             // Optional: 'fast' | 'standard' | 'deep'
 *   outputType: 'searchResults',   // Optional: 'searchResults' | 'sourcedAnswer'
 *   maxResults: 10,                // Optional: maximum number of results to return
 *   includeDomains: [],            // Optional: list of domains to search within
 *   excludeDomains: [],            // Optional: list of domains to exclude
 *   fromDate: '',                  // Optional: YYYY-MM-DD, earliest date of results
 *   toDate: '',                    // Optional: YYYY-MM-DD, latest date of results
 * });
 *
 * For more information about Linkup, visit: https://docs.linkup.so/
 */

import { Tool } from '@langchain/core/tools';
import { z } from 'zod';
import ky from 'ky';
import { HTTPError } from 'ky';

const API_BASE_URL = 'https://api.linkup.so/v1';

export class LinkupSearch extends Tool {
  constructor(fields) {
    super(fields);

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

    this.name = 'linkup-search';
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
      timeout: 120000,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    this.description =
      "Search the web in real time with Linkup and return relevant, citable sources (title, URL, content). Use for current events, facts that may have changed, and anything that needs a verifiable source. depth='standard' for most queries, 'deep' for complex multi-step questions.";

    this.schema = z.object({
      query: z.string().describe('The search query to look up'),
    });
  }

  async _call(input) {
    try {
      const searchParams = {
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
        if (
          searchParams[key] === undefined ||
          (Array.isArray(searchParams[key]) && searchParams[key].length === 0)
        ) {
          delete searchParams[key];
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
        return `An unexpected error occurred: ${error.message}`;
      }
    }
  }
}
