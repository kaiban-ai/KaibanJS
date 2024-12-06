const { PdfSearch } = require('../../dist/pdf-search/index.cjs.js');
const RagToolkit = require('../../dist/rag-toolkit/index.cjs.js');

jest.mock('../../dist/rag-toolkit/index.cjs.js', () => {
  return jest.fn().mockImplementation(() => ({
    addDocuments: jest.fn(),
    askQuestion: jest.fn(),
  }));
});

describe('PdfSearch', () => {
  let tool;
  let mockRagToolkit;

  beforeEach(() => {
    mockRagToolkit = new RagToolkit();
    tool = new PdfSearch({
      OPENAI_API_KEY: 'test-api-key',
      file: '/path/to/file.pdf',
    });
    tool.ragToolkit = mockRagToolkit;
  });

  test('should throw an error if no File is provided', async () => {
    tool.file = '';
    const result = await tool._call({ query: 'Test question' });
    expect(result).toContain('ERROR_MISSING_FILE');
  });

  test('should throw an error if no query is provided', async () => {
    const result = await tool._call({ file: '/path/to/file.pdf', query: '' });
    expect(result).toContain('ERROR_MISSING_QUERY');
  });

  test('should call addDocuments and askQuestion with correct parameters', async () => {
    mockRagToolkit.addDocuments.mockResolvedValueOnce();
    mockRagToolkit.askQuestion.mockResolvedValueOnce('Test answer');

    const result = await tool._call({
      file: '/path/to/file.pdf',
      query: 'Test question',
    });

    expect(mockRagToolkit.addDocuments).toHaveBeenCalledWith([
      { source: '/path/to/file.pdf', type: 'pdf' },
    ]);
    expect(mockRagToolkit.askQuestion).toHaveBeenCalledWith('Test question');
    expect(result).toBe('Test answer');
  });

  test('should handle errors from RAGToolkit gracefully', async () => {
    mockRagToolkit.addDocuments.mockImplementationOnce(() => {
      throw new Error('Test addDocuments error');
    });
    const result = await tool._call({
      file: '/path/to/file.pdf',
      query: 'Test question',
    });
    await expect(result).toContain('ERROR_PDF_SEARCH_PROCESSING');
  });

  test('should correctly instantiate with default values', () => {
    const toolInstance = new PdfSearch({
      OPENAI_API_KEY: 'test-api-key',
      file: '/path/to/file.pdf',
    });
    expect(toolInstance.name).toBe('pdf-search');
    expect(toolInstance.description).toContain(
      'A tool that can be used to semantic search a query from a pdf file content'
    );
  });

  test('WebsiteSearch is exported correctly in both paths', () => {
    const { PdfSearch } = require('../../dist/pdf-search/index.cjs.js');
    const { PdfSearch: PdfSearchMain } = require('../../dist/index.cjs.js');

    // Check that both imports are constructor functions
    expect(typeof PdfSearch).toBe('function');
    expect(typeof PdfSearchMain).toBe('function');

    // Check they have the same name and properties
    expect(PdfSearch.name).toBe(PdfSearchMain.name);
    expect(Object.keys(PdfSearch.prototype)).toEqual(
      Object.keys(PdfSearchMain.prototype)
    );
  });
});
