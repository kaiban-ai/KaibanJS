const { SimpleRAG } = require('../../dist/simple-rag/index.cjs.js');
const RagToolkit = require('../../dist/rag-toolkit/index.cjs.js');

jest.mock('../../dist/rag-toolkit/index.cjs.js', () => {
  return jest.fn().mockImplementation(() => ({
    addDocuments: jest.fn(),
    askQuestion: jest.fn(),
  }));
});

describe('SimpleRAG', () => {
  let tool;
  let mockRagToolkit;

  beforeEach(() => {
    mockRagToolkit = new RagToolkit();
    tool = new SimpleRAG({
      OPENAI_API_KEY: 'test-api-key',
    });
    tool.ragToolkit = mockRagToolkit;
  });

  test('should throw an error if no content is provided', async () => {
    tool.content = '';
    const result = await tool._call({ query: 'Test question' });
    expect(result).toContain('ERROR_MISSING_CONTENT');
  });

  test('should throw an error if no query is provided', async () => {
    const result = await tool._call({ content: 'Test content', query: '' });
    expect(result).toContain('ERROR_MISSING_QUERY');
  });

  test('should call addDocuments and askQuestion with correct parameters', async () => {
    mockRagToolkit.addDocuments.mockResolvedValueOnce();
    mockRagToolkit.askQuestion.mockResolvedValueOnce('Test answer');

    const result = await tool._call({
      content: 'Test content',
      query: 'Test question',
    });

    expect(mockRagToolkit.addDocuments).toHaveBeenCalledWith([
      { source: 'Test content', type: 'string' },
    ]);
    expect(mockRagToolkit.askQuestion).toHaveBeenCalledWith('Test question');
    expect(result).toBe('Test answer');
  });

  test('should handle errors from RAGToolkit gracefully', async () => {
    mockRagToolkit.addDocuments.mockImplementationOnce(() => {
      throw new Error('Test addDocuments error');
    });
    const result = await tool._call({
      content: 'Test content',
      query: 'Test question',
    });
    expect(result).toContain('ERROR_RAG_PROCESSING');
  });

  test('should correctly instantiate with default values', () => {
    const toolInstance = new SimpleRAG({
      OPENAI_API_KEY: 'test-api-key',
      content: 'Test content',
    });
    expect(toolInstance.name).toBe('simple-rag');
    expect(toolInstance.description).toContain(
      'A simple tool for asking questions'
    );
  });

  test('SimpleRAG is exported correctly in both paths', () => {
    const { SimpleRAG } = require('../../dist/simple-rag/index.cjs.js');
    const { SimpleRAG: SimpleRAGMain } = require('../../dist/index.cjs.js');

    // Check that both imports are constructor functions
    expect(typeof SimpleRAG).toBe('function');
    expect(typeof SimpleRAGMain).toBe('function');

    // Check they have the same name and properties
    expect(SimpleRAG.name).toBe(SimpleRAGMain.name);
    expect(Object.keys(SimpleRAG.prototype)).toEqual(
      Object.keys(SimpleRAGMain.prototype)
    );
  });
});
