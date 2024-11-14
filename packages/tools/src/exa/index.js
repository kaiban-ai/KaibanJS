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
 *
 * Usage:
 * const tool = new ExaSearch({
 *   apiKey: 'your-api-key',
 *   type: 'neural',         // Optional: 'neural' | 'keyword' | 'auto'
 *   useAutoprompt: false,   // Optional: use query enhancement. Only used if type is 'neural'
 *   numResults: 10,         // Optional: number of results to return
 *   category: 'company',    // Optional: focus on specific category (company, research paper, news, github, tweet, movie, song, personal site, and pdf)
 *   startPublishedDate: '', // Optional: ISO 8601 date for earliest publish date
 *   endPublishedDate: '',   // Optional: ISO 8601 date for latest publish date
 *   includeDomains : [],    // Optional: list of domains to include. If includeDomains is used, excludeDomains is ignored
 *   excludeDomains: [],     // Optional: list of domains to exclude. If excludeDomains is used, includeDomains is ignored
 *   includeText: [],        // Optional: list of strings for return results that include the specified text/phrase. Support only one phrase of up to 5 words.
 *   excludeText: [],        // Optional: list of strings for return results that exclude the specified text/phrase. Support only one phrase of up to 5 words.
 *   startCrawlDate: '',     // Optional: ISO 8601 date for earliest crawl date
 *   endCrawlDate: '',       // Optional: ISO 8601 date for latest crawl date
 *   contents: {             // Optional: configuration for content retrieval
 *     text: { maxCharacters: 0, includeHtmlTags: true },
 *     highlights: { numSentences: 0, highlightsPerUrl: 0, query: 'string' },
 *     summary: { query: 'string' },
 *     subpages: Number of subpages,
 *     subpageTarget: Number of subpages to target,
 *     livecrawl: 'never',
 *     livecrawlTimeout: 0
 *   }
 * });
 *
 * For more information about Exa, visit: https://exa.ai/
 */

import { Tool } from '@langchain/core/tools';
import { z } from 'zod';
import ky from 'ky';
import { HTTPError } from 'ky';

const API_BASE_URL = 'https://api.exa.ai';

export class ExaSearch extends Tool {
  constructor(fields) {
    super(fields);

    if (fields.type && !['neural', 'keyword', 'auto'].includes(fields.type)) {
      throw new Error(
        'Invalid search type. Must be one of: neural, keyword, auto'
      );
    }

    this.name = 'exa-search';
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

    this.description =
      'A powerful AI-optimized search engine that provides high-quality web data using embeddings-based search.';

    this.schema = z.object({
      query: z.string().describe('The search query to look up'),
    });
  }

  async _call(input) {
    try {
      const searchParams = {
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
