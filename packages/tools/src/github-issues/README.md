# GitHub Issues Tool

This tool integrates with GitHub's API to fetch issues from specified repositories. It provides a clean, structured way to retrieve open issues, making it ideal for monitoring and analysis purposes in AI applications and automation workflows.

## Components

The tool uses the following components:

- A GitHub API client instance
- Optional GitHub Personal Access Token for authentication
- A custom HTTP client (ky) for making API requests
- Input validation using Zod schema
- Configurable issue limit parameter
- Automatic pagination handling

## Key Features

- Fetches open issues from any public GitHub repository
- Handles pagination automatically
- Returns structured data with issue details
- Includes metadata like issue numbers, titles, labels, and descriptions
- Configurable limit for number of issues to fetch
- Built-in error handling and validation
- Support for both authenticated and unauthenticated requests

## Authentication

The tool supports two authentication modes:

- Unauthenticated: Works with public repositories (60 requests/hour limit)
- Authenticated: Uses GitHub Personal Access Token (5,000 requests/hour limit)

## Input

The input should be a JSON object with a "repoUrl" field containing the GitHub repository URL (e.g., https://github.com/owner/repo).

## Output

The output is a structured JSON object containing:

- Repository information (name, URL, owner)
- Metadata (total issues, last updated date, limit)
- Array of issues with details (number, title, URL, labels, description)

## Example

```javascript
// Basic usage
const tool = new GithubIssues({
  token: 'github_pat_...', // Optional: GitHub personal access token
  limit: 20, // Optional: number of issues to fetch (default: 10)
});

const result = await tool._call({
  repoUrl: 'https://github.com/owner/repo',
});
```

## Advanced Example with Error Handling

```javascript
const tool = new GithubIssues({
  token: process.env.GITHUB_TOKEN,
  limit: 50,
});

try {
  const result = await tool._call({
    repoUrl: 'https://github.com/facebook/react',
  });

  // Access structured data
  console.log('Repository:', result.repository.name);
  console.log('Total Issues:', result.metadata.totalIssues);

  // Process issues
  result.issues.forEach((issue) => {
    console.log(`#${issue.number}: ${issue.title}`);
    console.log(`Labels: ${issue.labels.join(', ')}`);
    console.log(`URL: ${issue.url}\n`);
  });
} catch (error) {
  console.error('Error fetching GitHub issues:', error);
}
```

### Rate Limits

- Authenticated requests: 5,000 requests per hour
- Unauthenticated requests: 60 requests per hour

### Disclaimer

Ensure you have proper API credentials if needed and respect GitHub's API rate limits and terms of service. For private repositories, authentication is required.
