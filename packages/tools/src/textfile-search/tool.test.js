const { TextFileSearch } = require('../../dist/textfile-search/index.cjs.js');
const RagToolkit = require('../../dist/rag-toolkit/index.cjs.js');

jest.mock('../../dist/rag-toolkit/index.cjs.js', () => {
  return jest.fn().mockImplementation(() => ({
    addDocuments: jest.fn(),
    askQuestion: jest.fn(),
  }));
});

describe('TextFileSearch', () => {
  let tool;
  let mockRagToolkit;

  beforeEach(() => {
    mockRagToolkit = new RagToolkit();
    tool = new TextFileSearch({
      OPENAI_API_KEY: 'test-api-key',
      file: '/path/to/textfile.txt',
    });
    tool.ragToolkit = mockRagToolkit;
  });

  test('should throw an error if no file is provided', async () => {
    tool.file = '';
    const result = await tool._call({ query: 'Test question' });
    expect(result).toContain('ERROR_MISSING_FILE');
  });

  test('should throw an error if no query is provided', async () => {
    const result = await tool._call({
      file: '/path/to/textfile.txt',
      query: '',
    });
    expect(result).toContain('ERROR_MISSING_QUERY');
  });

  test('should call addDocuments and askQuestion with correct parameters', async () => {
    mockRagToolkit.addDocuments.mockResolvedValueOnce();
    mockRagToolkit.askQuestion.mockResolvedValueOnce('Test answer');

    const result = await tool._call({
      file: '/path/to/textfile.txt',
      query: 'Test question',
    });

    // Check mockRagToolkit calls
    expect(mockRagToolkit.addDocuments).toHaveBeenCalledWith([
      { source: '/path/to/textfile.txt', type: 'text' },
    ]);
    expect(mockRagToolkit.askQuestion).toHaveBeenCalledWith('Test question');
    expect(result).toBe('Test answer');
  });

  test('should handle errors from RAGToolkit gracefully', async () => {
    mockRagToolkit.addDocuments.mockImplementationOnce(() => {
      throw new Error('Test addDocuments error');
    });

    const result = await tool._call({
      file: '/path/to/textfile.txt',
      query: 'Test question',
    });

    await expect(result).toContain('ERROR_TEXTFILE_SEARCH_PROCESSING');
  });

  test('should correctly instantiate with default values', () => {
    const toolInstance = new TextFileSearch({
      OPENAI_API_KEY: 'test-api-key',
      url: 'https://example.com',
    });
    expect(toolInstance.name).toBe('textfile-search');
    expect(toolInstance.description).toContain(
      'A tool that can be used to semantic search a query from a (txt) file content'
    );
  });

  test('TextFileSearch is exported correctly in both paths', () => {
    const {
      TextFileSearch,
    } = require('../../dist/textfile-search/index.cjs.js');
    const {
      TextFileSearch: TextFileSearchMain,
    } = require('../../dist/index.cjs.js');

    // Check that both imports are constructor functions
    expect(typeof TextFileSearch).toBe('function');
    expect(typeof TextFileSearchMain).toBe('function');

    // Check they have the same name and properties
    expect(TextFileSearch.name).toBe(TextFileSearchMain.name);
    expect(Object.keys(TextFileSearch.prototype)).toEqual(
      Object.keys(TextFileSearchMain.prototype)
    );
  });
});
