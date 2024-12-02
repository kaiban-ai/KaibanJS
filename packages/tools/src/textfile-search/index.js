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
 * - The input should be a JSON object with a "file" field containing the text file path to process and a "query" field containing the question to ask.
 * - The output is the answer to the question, generated using the RAG approach.
 * - For more information about the RAG Toolkit, visit:
 *
 * @example
 * const tool = new TextFileSearch({
 *  OPENAI_API_KEY: 'your-openai-api-key',
 *  file: '/path/to/textfile.txt',
 * });
 * const result = await tool._call({ query: 'question to ask' });
 *
 */

import { Tool } from '@langchain/core/tools';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import RagToolkit from '../../dist/rag-toolkit/index.esm';
import { z } from 'zod';
import ky, { HTTPError } from 'ky';

export class TextFileSearch extends Tool {
  constructor(fields) {
    super(fields);
    this.OPENAI_API_KEY = fields.OPENAI_API_KEY;
    this.file = fields.file;
    this.chunkOptions = fields.chunkOptions;
    this.embeddings = fields.embeddings;
    this.vectorStore = fields.vectorStore;
    this.llmInstance = fields.llmInstance;
    this.promptQuestionTemplate = fields.promptQuestionTemplate;
    this.name = 'textfile-search';
    this.description =
      'A tool that can be used to semantic search a query from a (txt) file content.';

    // Define the input schema using Zod
    this.schema = z.object({
      file: z.string().describe('The text file (txt) path to process.'),
      query: z.string().describe('The question to ask.'),
    });
    this.ragToolkit = new RagToolkit({
      chunkOptions: this.chunkOptions,
      embeddings: this.embeddings,
      vectorStore: this.vectorStore,
      llmInstance: this.llmInstance,
      promptQuestionTemplate: this.promptQuestionTemplate,
      env: { OPENAI_API_KEY: this.OPENAI_API_KEY },
    });
    this.ragToolkit.registerLoader('text', (source) => new TextLoader(source));
    this.httpClient = ky;
  }

  async _call(input) {
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
      const ragToolkit = this.ragToolkit;

      if (typeof this.file === 'string' && typeof window !== 'undefined') {
        const response = await this.httpClient.get(this.file);

        const blob = await response.blob();
        this.file = new File([blob], 'file.txt', { type: 'text/plain' });
      }

      await ragToolkit.addDocuments([{ source: this.file, type: 'text' }]);
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
        return `ERROR_TEXTFILE_SEARCH_PROCESSING: An unexpected error occurred: in TextFileSearch tool. Details: ${error.message}. Agent should verify content format and query validity.`;
      }
    }
  }
}
