const { WebsiteSearch } = require('../../dist/website-search/index.cjs.js');
const RagToolkit = require('../../dist/rag-toolkit/index.cjs.js');

jest.mock('../../dist/rag-toolkit/index.cjs.js', () => {
  return jest.fn().mockImplementation(() => ({
    addDocuments: jest.fn(),
    askQuestion: jest.fn(),
  }));
});

describe('WebsiteSearch', () => {
  let tool;
  let mockRagToolkit;

  beforeEach(() => {
    mockRagToolkit = new RagToolkit();
    tool = new WebsiteSearch({
      OPENAI_API_KEY: 'test-api-key',
      url: 'https://example.com',
    });
    tool.ragToolkit = mockRagToolkit;
  });

  test('should throw an error if no URL is provided', async () => {
    tool.url = '';
    const result = await tool._call({ query: 'Test question' });
    expect(result).toContain('ERROR_MISSING_URL');
  });

  test('should throw an error if no query is provided', async () => {
    const result = await tool._call({ url: 'https://example.com', query: '' });
    expect(result).toContain('ERROR_MISSING_QUERY');
  });

  test('should call addDocuments and askQuestion with correct parameters', async () => {
    mockRagToolkit.addDocuments.mockResolvedValueOnce();
    mockRagToolkit.askQuestion.mockResolvedValueOnce('Test answer');

    const result = await tool._call({
      url: 'https://example.com',
      query: 'Test question',
    });

    expect(mockRagToolkit.addDocuments).toHaveBeenCalledWith([
      { source: 'https://example.com', type: 'web' },
    ]);
    expect(mockRagToolkit.askQuestion).toHaveBeenCalledWith('Test question');
    expect(result).toBe('Test answer');
  });

  test('should handle errors from RAGToolkit gracefully', async () => {
    mockRagToolkit.addDocuments.mockImplementationOnce(() => {
      throw new Error('Test addDocuments error');
    });
    const result = await tool._call({
      url: 'https://example.com',
      query: 'Test question',
    });
    await expect(result).toContain('ERROR_WEBSITE_SEARCH_PROCESSING');
  });

  test('should correctly instantiate with default values', () => {
    const toolInstance = new WebsiteSearch({
      OPENAI_API_KEY: 'test-api-key',
      url: 'https://example.com',
    });
    expect(toolInstance.name).toBe('website-search');
    expect(toolInstance.description).toContain(
      'A tool for conducting semantic searches'
    );
  });

  test('WebsiteSearch is exported correctly in both paths', () => {
    const { WebsiteSearch } = require('../../dist/website-search/index.cjs.js');
    const {
      WebsiteSearch: WebsiteSearchMain,
    } = require('../../dist/index.cjs.js');

    // Check that both imports are constructor functions
    expect(typeof WebsiteSearch).toBe('function');
    expect(typeof WebsiteSearchMain).toBe('function');

    // Check they have the same name and properties
    expect(WebsiteSearch.name).toBe(WebsiteSearchMain.name);
    expect(Object.keys(WebsiteSearch.prototype)).toEqual(
      Object.keys(WebsiteSearchMain.prototype)
    );
  });
});
