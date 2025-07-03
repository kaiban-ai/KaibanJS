// Mock the external dependencies before requiring the module
jest.mock('langchain/vectorstores/memory', () => ({
  MemoryVectorStore: jest.fn().mockImplementation(() => ({
    asRetriever: jest.fn(),
    addDocuments: jest.fn(),
  })),
}));

jest.mock('@langchain/openai', () => ({
  OpenAIEmbeddings: jest.fn().mockImplementation(() => ({
    apiKey: 'test-api-key',
  })),
  ChatOpenAI: jest.fn().mockImplementation(() => ({
    apiKey: 'test-api-key',
  })),
}));

jest.mock('../../dist/rag-toolkit/index.cjs.js', () => ({
  RAGToolkit: jest.fn().mockImplementation(() => ({
    addDocuments: jest.fn(),
    askQuestion: jest.fn(),
  })),
}));

const {
  SimpleRAGRetrieve,
} = require('../../dist/simple-rag-retrieve/index.cjs.js');
const { RAGToolkit } = require('../../dist/rag-toolkit/index.cjs.js');
const { MemoryVectorStore } = require('langchain/vectorstores/memory');

describe('SimpleRAGRetrieve', () => {
  let tool;
  let mockRagToolkit;
  let mockVectorStore;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Get mock instances
    mockVectorStore = new MemoryVectorStore();
    mockRagToolkit = new RAGToolkit();

    // Create tool instance
    tool = new SimpleRAGRetrieve({
      OPENAI_API_KEY: 'test-api-key',
      vectorStore: mockVectorStore,
    });
    tool.ragToolkit = mockRagToolkit;
  });

  test('should throw an error if vectorStore is not provided', () => {
    expect(() => {
      new SimpleRAGRetrieve({
        OPENAI_API_KEY: 'test-api-key',
        // vectorStore missing
      });
    }).toThrow('Vector store is required');
  });

  test('should throw an error if no query is provided', async () => {
    const result = await tool._call({ query: '' });
    expect(result).toContain('ERROR_MISSING_QUERY');
  });

  test('should throw an error if query is undefined', async () => {
    const result = await tool._call({ query: undefined });
    expect(result).toContain('ERROR_MISSING_QUERY');
  });

  test('should call askQuestion with correct parameters', async () => {
    mockRagToolkit.askQuestion.mockResolvedValueOnce('Test answer');

    const result = await tool._call({
      query: 'Test question',
    });

    expect(mockRagToolkit.askQuestion).toHaveBeenCalledWith('Test question');
    expect(result).toBe('Test answer');
  });

  test('should handle errors from RAGToolkit gracefully', async () => {
    mockRagToolkit.askQuestion.mockImplementationOnce(() => {
      throw new Error('Test askQuestion error');
    });

    const result = await tool._call({
      query: 'Test question',
    });

    expect(result).toContain('ERROR_RAG_PROCESSING');
    expect(result).toContain('Test askQuestion error');
  });

  test('should correctly instantiate with default values', () => {
    const toolInstance = new SimpleRAGRetrieve({
      OPENAI_API_KEY: 'test-api-key',
      vectorStore: mockVectorStore,
    });

    expect(toolInstance.name).toBe('simple-rag-retrieve');
    expect(toolInstance.description).toContain(
      'A simple tool for asking questions using the RAG approach'
    );
  });

  test('should have correct schema definition', () => {
    expect(tool.schema.shape.query).toBeDefined();
    expect(tool.schema.shape.query.description).toBe('The question to ask.');
  });

  test('SimpleRAGRetrieve is exported correctly in both paths', () => {
    const {
      SimpleRAGRetrieve,
    } = require('../../dist/simple-rag-retrieve/index.cjs.js');
    const {
      SimpleRAGRetrieve: SimpleRAGRetrieveMain,
    } = require('../../dist/index.cjs.js');

    // Check that both imports are constructor functions
    expect(typeof SimpleRAGRetrieve).toBe('function');
    expect(typeof SimpleRAGRetrieveMain).toBe('function');

    // Check they have the same name and properties
    expect(SimpleRAGRetrieve.name).toBe(SimpleRAGRetrieveMain.name);
    expect(Object.keys(SimpleRAGRetrieve.prototype)).toEqual(
      Object.keys(SimpleRAGRetrieveMain.prototype)
    );
  });

  test('should work with complex queries', async () => {
    const complexQuery =
      'What are the main features of KaibanJS and how does it relate to Kanban methodology?';
    mockRagToolkit.askQuestion.mockResolvedValueOnce(
      'KaibanJS is a framework that adapts Kanban methodology for AI agent management...'
    );

    const result = await tool._call({
      query: complexQuery,
    });

    expect(mockRagToolkit.askQuestion).toHaveBeenCalledWith(complexQuery);
    expect(result).toContain('KaibanJS');
  });

  test('should handle non-string error types', async () => {
    mockRagToolkit.askQuestion.mockImplementationOnce(() => {
      throw { customError: 'Non-standard error object' };
    });

    const result = await tool._call({
      query: 'Test question',
    });

    expect(result).toContain('ERROR_RAG_PROCESSING');
    expect(result).toContain('[object Object]');
  });
});
