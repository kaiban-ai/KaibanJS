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
 * - The input should be a JSON object with a "text" field containing the text to process and a "query" field containing the question to ask.
 * - The output is the answer to the question, generated using the RAG approach.
 * - For more information about the RAG Toolkit, visit:
 *
 * @example
 * const tool = new SimpleRAG({
 *  OPENAI_API_KEY: 'your-openai-api-key',
 *  content: 'content to process',
 * });
 * const result = await tool._call({ query: 'question to ask' });
 *
 */

import { Tool } from '@langchain/core/tools';
import RagToolkit from '../../dist/rag-toolkit/index.esm';
import { z } from 'zod';

export class SimpleRAG extends Tool {
  constructor(fields) {
    super(fields);
    this.OPENAI_API_KEY = fields.OPENAI_API_KEY;
    this.content = fields.content;
    this.loaderOptions = fields.loaderOptions;
    this.chunkOptions = fields.chunkOptions;
    this.embeddings = fields.embeddings;
    this.vectorStore = fields.vectorStore;
    this.llm = fields.llm;
    this.promptQuestionTemplate = fields.promptQuestionTemplate;
    this.name = 'simple-rag';
    this.description =
      'A simple tool for asking questions using the RAG approach. Input should be a string text content such as a knowledge base and a question string.';

    // Define the input schema using Zod
    this.schema = z.object({
      content: z.string().describe('The content text to process.'),
      query: z.string().describe('The question to ask.'),
    });
    this.ragToolkit = new RagToolkit({
      loaderOptions: this.loaderOptions,
      chunkOptions: this.chunkOptions,
      embeddings: this.embeddings,
      vectorStore: this.vectorStore,
      llm: this.llm,
      promptQuestionTemplate: this.promptQuestionTemplate,
      env: { OPENAI_API_KEY: this.OPENAI_API_KEY },
    });
  }

  async _call(input) {
    const { content, query } = input;
    if (content && content !== '') {
      this.content = content;
    }
    if (!this.content || this.content === '') {
      throw new Error('Please provide content to process.');
    }
    if (!query || query === '') {
      throw new Error('Please provide a question to ask.');
    }

    try {
      const ragToolkit = this.ragToolkit;
      await ragToolkit.addDocuments([{ source: this.content, type: 'string' }]);
      const response = await ragToolkit.askQuestion(query);
      return response;
    } catch (error) {
      console.error(error);
      throw new Error('An unexpected error occurred: in SimpleRAG');
    }
  }
}
