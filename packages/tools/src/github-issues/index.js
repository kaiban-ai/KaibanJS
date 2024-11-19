/**
 * GitHub Issues
 *
 * This tool integrates with GitHub's API to fetch issues from specified repositories.
 * It provides a clean, structured way to retrieve open issues, making it ideal for
 * monitoring and analysis purposes.
 *
 * Key features:
 * - Fetches open issues from any public GitHub repository
 * - Handles pagination automatically
 * - Returns structured data with issue details
 * - Includes metadata like issue numbers, titles, labels, and descriptions
 *
 * Authentication:
 * - Works without authentication for public repositories (60 requests/hour limit)
 * - Optional GitHub token for higher rate limits (5,000 requests/hour)
 *
 * Usage:
 * const tool = new GithubIssues({
 *   token: 'github_pat_...', // optional: GitHub personal access token
 *   limit: 20 // optional: number of issues to fetch (default: 10)
 * });
 * const result = await tool._call({
 *   repoUrl: 'https://github.com/owner/repo'
 * });
 *
 * Rate Limits:
 * - Authenticated: 5,000 requests per hour
 * - Unauthenticated: 60 requests per hour
 *
 * For more information about GitHub's API, visit: https://docs.github.com/en/rest
 */

import { Tool } from '@langchain/core/tools';
import { z } from 'zod';
import ky from 'ky';
import { HTTPError } from 'ky';

export class GithubIssues extends Tool {
  constructor(fields = {}) {
    super(fields);
    this.name = 'github-issues';
    this.token = fields.token;
    this.limit = fields.limit || 10;
    this.description =
      'Fetches open issues from a specified GitHub repository. Input should include the repository URL.';

    this.schema = z.object({
      repoUrl: z
        .string()
        .url()
        .describe(
          'The GitHub repository URL (e.g., https://github.com/owner/repo)'
        ),
    });

    this.httpClient = ky;
  }

  async _call(input) {
    try {
      const { owner, repo } = this._parseRepoUrl(input.repoUrl);
      const issues = await this._fetchIssues({ owner, repo });
      return this._formatResponse(issues, { owner, repo });
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

  async _fetchIssues({ owner, repo }) {
    let page = 1;
    let allIssues = [];
    const headers = {
      Accept: 'application/vnd.github.v3+json',
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    let hasMorePages = true;
    while (hasMorePages) {
      const issues = await this.httpClient
        .get(`https://api.github.com/repos/${owner}/${repo}/issues`, {
          searchParams: {
            page: String(page),
            per_page: '100',
            state: 'open',
          },
          headers,
          timeout: 10000,
        })
        .json();

      if (!Array.isArray(issues) || issues.length === 0) {
        hasMorePages = false;
        break;
      }

      allIssues = allIssues.concat(issues);
      if (allIssues.length >= this.limit) {
        allIssues = allIssues.slice(0, this.limit);
        hasMorePages = false;
        break;
      }
      page++;
    }

    return allIssues;
  }

  _formatResponse(issues, input) {
    const { owner, repo } = input;
    const repoUrl = `https://github.com/${owner}/${repo}`;
    const today = new Date().toISOString().split('T')[0];

    return {
      repository: {
        name: repo,
        url: repoUrl,
        owner: owner,
      },
      metadata: {
        totalIssues: issues.length,
        lastUpdated: today,
        limit: this.limit,
      },
      issues: issues.map((issue) => ({
        number: issue.number,
        title: issue.title,
        url: issue.html_url,
        labels: issue.labels.map((label) => label.name),
        description: issue.body || 'No description provided',
      })),
    };
  }

  _parseRepoUrl(url) {
    try {
      const path = new URL(url).pathname.split('/').filter(Boolean);
      if (path.length < 2) {
        throw new Error('Invalid GitHub repository URL');
      }
      return { owner: path[0], repo: path[1] };
    } catch (_error) {
      throw new Error('Invalid GitHub repository URL');
    }
  }
}
