/**
 * Pdf Search Tool
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
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { RAGToolkit } from './rag/ragToolkit';
import { z } from 'zod';
import ky, { HTTPError } from 'ky';
import { BrowserPDFLoader } from './rag/loaders/browserPDFLoader';

/**
 * Input parameters for the PdfSearch tool
 * @typedef {Object} PdfSearchParams
 * @property {string} query - The question to ask
 * @property {string | File} [file] - The pdf file path or file object to process
 */
type PdfSearchParams = {
  query: string;
  file?: string | File;
};

/**
 * Response type for the PdfSearch tool
 * @typedef {string} RagToolkitAnswerResponse
 * @example
 * "The answer to your question is: [answer]"
 */
type RagToolkitAnswerResponse = string;

/**
 * Error type for the PdfSearch tool
 * @typedef {string} PdfSearchError
 * @example
 * "ERROR_MISSING_FILE: No pdf file was provided for analysis. Agent should provide valid pdf file in the 'file' field."
 */
type PdfSearchError = string;

/**
 * Response type for the PdfSearch tool
 * @typedef {RagToolkitAnswerResponse | PdfSearchError} PdfSearchResponse
 */
type PdfSearchResponse = RagToolkitAnswerResponse | PdfSearchError;

/**
 * Configuration options for the PdfSearch tool
 * @interface PdfSearchFields
 * @property {string} OPENAI_API_KEY - The OpenAI API key for authentication
 * @property {string | File} [file] - The pdf file path or file object to process
 * @property {any} [chunkOptions] - Chunking options for the RAG model
 * @property {any} [embeddings] - Embeddings instance for the RAG model
 * @property {any} [vectorStore] - Vector store instance for the RAG model
 * @property {any} [llmInstance] - LLM instance for the RAG model
 * @property {string} [promptQuestionTemplate] - Prompt question template for the RAG model
 */
interface PdfSearchFields {
  OPENAI_API_KEY: string;
  file?: string | File;
  chunkOptions?: any;
  embeddings?: any;
  vectorStore?: any;
  llmInstance?: any;
  promptQuestionTemplate?: string;
}

/**
 * PdfSearch tool for performing semantic search within a PDF file
 *
 * This tool allows for semantic searching of a query within the content of a text file.
 * It uses the RAGToolkit to perform the search, which includes a Chunker, Embeddings,
 * VectorStore, and LLM instance. The tool also supports loading a PDF file from a URL.
 *
 * The tool supports the following components:
 * - A Chunker options, which chunks and processes text for the RAG model
 * - An Embeddings instance, which handles embeddings for the RAG model
 * - A VectorStore instance, which stores vectors for the RAG model
 * - An LLM instance, which handles the language model for the RAG model
 * - A promptQuestionTemplate, which defines the template for asking questions
 * - An OpenAI API key, which is used for interacting with the OpenAI API
 */

export class PdfSearch extends StructuredTool {
  private OPENAI_API_KEY: string;
  private file?: string | File;
  private chunkOptions: any;
  private embeddings: any;
  private vectorStore: any;
  private llmInstance: any;
  private promptQuestionTemplate: string;
  private ragToolkit: any; // typeof RAGToolkit;
  private httpClient: typeof ky;
  name = 'pdf-search';
  description =
    'A tool that can be used to semantic search a query from a pdf file content.';
  schema = z.object({
    file: z.string().describe('The pdf file path to process.'),
    query: z.string().describe('The question to ask.'),
  });

  /**
   * Constructor for the PdfSearch tool
   * @param {PdfSearchFields} fields - The configuration fields for the tool
   */
  constructor(fields: PdfSearchFields) {
    super();
    this.OPENAI_API_KEY = fields.OPENAI_API_KEY;
    this.file = fields.file;
    this.chunkOptions = fields.chunkOptions;
    this.embeddings = fields.embeddings;
    this.vectorStore = fields.vectorStore;
    this.llmInstance = fields.llmInstance;
    this.promptQuestionTemplate = fields.promptQuestionTemplate || '';

    this.ragToolkit = new RAGToolkit({
      chunkOptions: this.chunkOptions,
      embeddings: this.embeddings,
      vectorStore: this.vectorStore,
      llmInstance: this.llmInstance,
      promptQuestionTemplate: this.promptQuestionTemplate,
      env: { OPENAI_API_KEY: this.OPENAI_API_KEY },
    });

    this.ragToolkit.registerLoader('pdf', (source: string | File) =>
      typeof window !== 'undefined'
        ? new BrowserPDFLoader(source)
        : new PDFLoader(source)
    );

    this.httpClient = ky;
  }

  /**
   * Call the PdfSearch tool
   * @param {PdfSearchParams} input - The input parameters for the tool
   * @returns {Promise<PdfSearchResponse>} The response from the tool
   */
  async _call(input: PdfSearchParams): Promise<PdfSearchResponse> {
    const { file, query } = input;
    if (file && file !== '') {
      this.file = file;
    }
    if (!this.file || this.file === '') {
      return "ERROR_MISSING_FILE: No pdf file was provided for analysis. Agent should provide valid pdf file in the 'file' field.";
    }
    if (!query || query === '') {
      return "ERROR_MISSING_QUERY: No question was provided. Agent should provide a question in the 'query' field.";
    }

    try {
      const ragToolkit = this.ragToolkit;

      if (typeof this.file === 'string' && typeof window !== 'undefined') {
        const response = await this.httpClient.get(this.file);
        const blob = await response.blob();
        this.file = new File([blob], 'file.pdf', { type: 'application/pdf' });
      }

      await ragToolkit.addDocuments([
        {
          source: this.file,
          type: 'pdf',
        },
      ]);

      const response = await ragToolkit.askQuestion(query);
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
        return `ERROR_PDF_SEARCH_PROCESSING: An unexpected error occurred: in PDFSearch tool. Details: ${
          error instanceof Error ? error.message : String(error)
        }. Agent should verify content format and query validity.`;
      }
    }
  }
}
