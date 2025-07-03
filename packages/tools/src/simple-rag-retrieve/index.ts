/**
 * Simple RAG Tool
 *
 * This tool integrates with various components from the langchain library to provide
 * a simple interface for asking questions and retrieving answers using the Retrieval-Augmented Generation (RAG) approach.
 *
 * The tool uses the following components:
 * - A RAG Toolkit instance, which handles the RAG process
 * - A Loader instance, which loads and processes documents for the RAG model
 * - A Chunker instance, which chunks and processes text for the RAG model
 * - An Embeddings instance, which handles embeddings for the RAG model
 * - A VectorStore instance, which stores vectors for the RAG model
 * - An LLM instance, which handles the language model for the RAG model
 * - A promptQuestionTemplate, which defines the template for asking questions
 * - An OpenAI API key, which is used for interacting with the OpenAI API
 */

import { StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { OpenAIEmbeddings } from '@langchain/openai';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { ChatOpenAI } from '@langchain/openai';
import { RAGToolkit } from './rag/ragToolkit';
import { VectorStoreRetrieverInput } from '@langchain/core/vectorstores';

const SimpleRAGRetrieveSchema = z.object({
  query: z.string().describe('The question to ask.'),
});

/**
 * Type for the response in SimpleRAG
 * @typedef {string} RagToolkitAnswerResponse
 * @example
 * "The answer to your question is: [answer]"
 */
type RagToolkitAnswerResponse = string;

/**
 * Type for the error in SimpleRAG
 * @typedef {string} SimpleRAGError
 * @example
 * "ERROR_MISSING_CONTENT: No text content was provided for analysis. Agent should provide content in the 'content' field."
 */
type SimpleRAGError = string;

/**
 * Type for the response in SimpleRAG
 * @typedef {RagToolkitAnswerResponse | SimpleRAGError} SimpleRAGResponse
 * @example
 * "The answer to your question is: [answer]"
 */
type SimpleRAGRetrieveResponse = RagToolkitAnswerResponse | SimpleRAGError;

/**
 * Configuration options for the SimpleRAG tool
 * @interface SimpleRAGFields
 * @property {string} OPENAI_API_KEY - The OpenAI API key for authentication
 * @property {string} [content] - The content text to process
 * @property {any} [chunkOptions] - Chunking options for the RAG model
 * @property {any} [embeddings] - Embeddings instance for the RAG model
 */
interface SimpleRAGRetrieveFields {
  OPENAI_API_KEY: string;
  //   loaderOptions?: any;
  chunkOptions?: {
    chunkSize: number;
    chunkOverlap: number;
  };
  embeddings?: OpenAIEmbeddings;
  vectorStore: MemoryVectorStore;
  llmInstance?: ChatOpenAI;
  retrieverOptions?: VectorStoreRetrieverInput<MemoryVectorStore>;
  promptQuestionTemplate?: string;
}

/**
 * SimpleRAG tool class
 * @extends StructuredTool
 */
export class SimpleRAGRetrieve extends StructuredTool {
  private OPENAI_API_KEY: string;
  private chunkOptions?: {
    chunkSize: number;
    chunkOverlap: number;
  };
  private embeddings?: OpenAIEmbeddings;
  private vectorStore: MemoryVectorStore;
  private llmInstance?: ChatOpenAI;
  private retrieverOptions?: VectorStoreRetrieverInput<MemoryVectorStore>;
  private promptQuestionTemplate?: string;
  private ragToolkit: RAGToolkit;
  name = 'simple-rag-retrieve';
  description =
    'A simple tool for asking questions using the RAG approach. Must be configure vector store with content such as a knowledge base and accept query question string.';
  schema = SimpleRAGRetrieveSchema;

  /**
   * Constructor for the SimpleRAG tool
   * @param {SimpleRAGFields} fields - The configuration fields for the tool
   */
  constructor(fields: SimpleRAGRetrieveFields) {
    super();
    this.OPENAI_API_KEY = fields.OPENAI_API_KEY;
    if (!fields.vectorStore) {
      throw new Error('Vector store is required');
    }
    this.vectorStore = fields.vectorStore;
    // this.loaderOptions = fields.loaderOptions;
    this.chunkOptions = fields.chunkOptions;
    this.embeddings = fields.embeddings;
    this.llmInstance = fields.llmInstance;
    this.promptQuestionTemplate = fields.promptQuestionTemplate;
    this.retrieverOptions = fields.retrieverOptions;
    this.ragToolkit = new RAGToolkit({
      // loaderOptions: this.loaderOptions,
      chunkOptions: this.chunkOptions,
      embeddings: this.embeddings,
      vectorStore: this.vectorStore,
      llmInstance: this.llmInstance,
      promptQuestionTemplate: this.promptQuestionTemplate,
      env: { OPENAI_API_KEY: this.OPENAI_API_KEY },
      retrieverOptions: this.retrieverOptions,
    });
  }

  /**
   * Call the SimpleRAG tool
   * @param {SimpleRAGRetrieveSchema} input - The input parameters for the tool
   * @returns {Promise<SimpleRAGResponse>} The response from the tool
   */
  async _call(
    input: z.infer<typeof SimpleRAGRetrieveSchema>
  ): Promise<SimpleRAGRetrieveResponse> {
    const { query } = input;
    if (!query || query === '') {
      return "ERROR_MISSING_QUERY: No question was provided. Agent should provide a question in the 'query' field.";
    }

    try {
      const response = await this.ragToolkit.askQuestion(query);
      return response;
    } catch (error) {
      return `ERROR_RAG_PROCESSING: RAG processing failed. Details: ${
        error instanceof Error ? error.message : String(error)
      }. Agent should verify content format and query validity.`;
    }
  }
}
