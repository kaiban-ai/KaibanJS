/**
 * Text File (txt) Search Tool
 *
 * This tool is used to perform a RAG (Retrieval-Augmented Generation) search within the content of a text file.
 * It allows for semantic searching of a query within a specified text file's content, making it an invaluable resource
 * for quickly extracting information or finding specific sections of text based on the query provided.
 *
 * The tool uses the following components:
 * - A Chunker options, which chunks and processes text for the RAG model
 * - An Embeddings instance, which handles embeddings for the RAG model
 * - A VectorStore instance, which stores vectors for the RAG model
 * - An LLM instance, which handles the language model for the RAG model
 * - A promptQuestionTemplate, which defines the template for asking questions
 * - An OpenAI API key, which is used for interacting with the OpenAI API
 */

import { StructuredTool } from '@langchain/core/tools';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import { z } from 'zod';
import ky, { HTTPError } from 'ky';
import { OpenAIEmbeddings } from '@langchain/openai';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { ChatOpenAI } from '@langchain/openai';
import { RAGToolkit } from './rag/ragToolkit';

/**
 * Type for the parameters in TextFileSearch
 * @typedef {string} TextFileSearchParams
 * @example
 * {
 *   query: "What is the main idea of the document?"
 *   file: "path/to/file.txt",
 * }
 */
type TextFileSearchParams = {
  query: string;
  file?: string;
};

/**
 * Response type for the PdfSearch tool
 * @typedef {string} RagToolkitAnswerResponse
 * @example
 * "The answer to your question is: [answer]"
 */
type RagToolkitAnswerResponse = string;

/**
 * Error type for the TextFileSearch tool
 * @typedef {string} TextFileSearchError
 * @example
 * "ERROR_MISSING_FILE: No file was provided for analysis. Agent should provide valid file in the 'file' field."
 */
type TextFileSearchError = string;

/**
 * Type for the response from the TextFileSearch tool
 * @typedef {RagToolkitAnswerResponse | TextFileSearchError} TextFileSearchResponse
 * @example
 * "The answer to your question is: [answer]"
 */
type TextFileSearchResponse = RagToolkitAnswerResponse | TextFileSearchError;

/**
 * Interface for the TextFileSearch tool
 * @typedef {Object} TextFileSearchFields
 * @property {string} OPENAI_API_KEY - The OpenAI API key
 * @property {string} [file] - The text file (txt) path to process
 * @property {Object} [chunkOptions] - The chunk options for the RAG model
 */
interface TextFileSearchFields {
  OPENAI_API_KEY: string;
  file?: string | File;
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
 * TextFileSearch tool class
 * @extends StructuredTool
 */
export class TextFileSearch extends StructuredTool {
  private OPENAI_API_KEY: string;
  private file?: string | File;
  private chunkOptions?: any;
  private embeddings?: OpenAIEmbeddings;
  private vectorStore?: MemoryVectorStore;
  private llmInstance?: ChatOpenAI;
  private promptQuestionTemplate?: string;
  private ragToolkit: RAGToolkit;
  private httpClient: typeof ky;
  name = 'textfile-search';
  description =
    'A tool that can be used to semantic search a query from a (txt) file content.';
  schema = z.object({
    file: z.string().describe('The text file (txt) path to process.'),
    query: z.string().describe('The question to ask.'),
  });

  /**
   * @param {TextFileSearchFields} fields - The fields for the TextFileSearch tool
   */
  constructor(fields: TextFileSearchFields) {
    super();
    this.OPENAI_API_KEY = fields.OPENAI_API_KEY;
    this.file = fields.file;
    this.chunkOptions = fields.chunkOptions;
    this.embeddings = fields.embeddings;
    this.vectorStore = fields.vectorStore;
    this.llmInstance = fields.llmInstance;
    this.promptQuestionTemplate = fields.promptQuestionTemplate;

    this.ragToolkit = new RAGToolkit({
      chunkOptions: this.chunkOptions,
      embeddings: this.embeddings,
      vectorStore: this.vectorStore,
      llmInstance: this.llmInstance,
      promptQuestionTemplate: this.promptQuestionTemplate,
      env: { OPENAI_API_KEY: this.OPENAI_API_KEY },
    });

    this.ragToolkit.registerLoader(
      'text',
      (source: string | File) => new TextLoader(source as string) as any
    );
    this.httpClient = ky;
  }

  /**
   * @param {TextFileSearchParams} input - The input for the TextFileSearch tool
   * @returns {Promise<TextFileSearchResponse>} The response from the TextFileSearch tool
   */
  async _call(input: TextFileSearchParams): Promise<TextFileSearchResponse> {
    const { file, query } = input;
    if (file && file !== '') {
      this.file = file;
    }
    if (!this.file || this.file === '') {
      return "ERROR_MISSING_FILE: No file was provided for analysis. Agent should provide valid file in the 'file' field.";
    }
    if (!query || query === '') {
      return "ERROR_MISSING_QUERY: No question was provided. Agent should provide a question in the 'query' field.";
    }

    try {
      if (typeof this.file === 'string' && typeof window !== 'undefined') {
        const response = await this.httpClient.get(this.file);
        const blob = await response.blob();
        this.file = new File([blob], 'file.txt', { type: 'text/plain' });
      }

      await this.ragToolkit.addDocuments([{ source: this.file, type: 'text' }]);
      const response = await this.ragToolkit.askQuestion(query);
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
        return `Fetch file failed: ${errorType} (${statusCode})`;
      } else {
        return `ERROR_TEXTFILE_SEARCH_PROCESSING: An unexpected error occurred: in TextFileSearch tool. Details: ${
          error instanceof Error ? error.message : String(error)
        }. Agent should verify content format and query validity.`;
      }
    }
  }
}
