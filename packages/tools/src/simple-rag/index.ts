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

/**
 * Type for the parameters in SimpleRAG
 * @typedef {string} SimpleRAGParams
 * @example
 * {
 *   content: "content text"
 */
type SimpleRAGParams = {
  query: string;
  content?: string;
};

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
type SimpleRAGResponse = RagToolkitAnswerResponse | SimpleRAGError;

/**
/**
 * Configuration options for the SimpleRAG tool
 * @interface SimpleRAGFields
 * @property {string} OPENAI_API_KEY - The OpenAI API key for authentication
 * @property {string} [content] - The content text to process
 * @property {any} [chunkOptions] - Chunking options for the RAG model
 * @property {any} [embeddings] - Embeddings instance for the RAG model
 */
interface SimpleRAGFields {
  OPENAI_API_KEY: string;
  content?: string;
  //   loaderOptions?: any;
  chunkOptions?: {
    chunkSize: number;
    chunkOverlap: number;
  };
  embeddings?: OpenAIEmbeddings;
  vectorStore?: MemoryVectorStore;
  llmInstance?: ChatOpenAI;
  promptQuestionTemplate?: string;
}

/**
 * SimpleRAG tool class
 * @extends StructuredTool
 */
export class SimpleRAG extends StructuredTool {
  private OPENAI_API_KEY: string;
  private content?: string;
  //   private loaderOptions: any;
  private chunkOptions?: any;
  private embeddings?: OpenAIEmbeddings;
  private vectorStore?: MemoryVectorStore;
  private llmInstance?: ChatOpenAI;
  private promptQuestionTemplate?: string;
  private ragToolkit: RAGToolkit;
  name = 'simple-rag';
  description =
    'A simple tool for asking questions using the RAG approach. Input should be a string text content such as a knowledge base and a question string.';
  schema = z.object({
    content: z.string().describe('The content text to process.'),
    query: z.string().describe('The question to ask.'),
  });

  /**
   * Constructor for the SimpleRAG tool
   * @param {SimpleRAGFields} fields - The configuration fields for the tool
   */
  constructor(fields: SimpleRAGFields) {
    super();
    this.OPENAI_API_KEY = fields.OPENAI_API_KEY;
    this.content = fields.content;
    // this.loaderOptions = fields.loaderOptions;
    this.chunkOptions = fields.chunkOptions;
    this.embeddings = fields.embeddings;
    this.vectorStore = fields.vectorStore;
    this.llmInstance = fields.llmInstance;
    this.promptQuestionTemplate = fields.promptQuestionTemplate;

    this.ragToolkit = new RAGToolkit({
      // loaderOptions: this.loaderOptions,
      chunkOptions: this.chunkOptions,
      embeddings: this.embeddings,
      vectorStore: this.vectorStore,
      llmInstance: this.llmInstance,
      promptQuestionTemplate: this.promptQuestionTemplate,
      env: { OPENAI_API_KEY: this.OPENAI_API_KEY },
    });
  }

  /**
   * Call the SimpleRAG tool
   * @param {SimpleRAGParams} input - The input parameters for the tool
   * @returns {Promise<SimpleRAGResponse>} The response from the tool
   */
  async _call(input: SimpleRAGParams): Promise<SimpleRAGResponse> {
    const { content, query } = input;
    if (content && content !== '') {
      this.content = content;
    }
    if (!this.content || this.content === '') {
      return "ERROR_MISSING_CONTENT: No text content was provided for analysis. Agent should provide content in the 'content' field.";
    }
    if (!query || query === '') {
      return "ERROR_MISSING_QUERY: No question was provided. Agent should provide a question in the 'query' field.";
    }

    try {
      await this.ragToolkit.addDocuments([
        { source: this.content, type: 'string' },
      ]);
      const response = await this.ragToolkit.askQuestion(query);
      return response;
    } catch (error) {
      return `ERROR_RAG_PROCESSING: RAG processing failed. Details: ${
        error instanceof Error ? error.message : String(error)
      }. Agent should verify content format and query validity.`;
    }
  }
}
