/**
 * Website Search Tool
 *
 * This tool is specifically crafted for conducting semantic searches within the content of a particular website.
 * Leveraging a Retrieval-Augmented Generation (RAG) model, it navigates through the information provided on a given URL.
 * Users have the flexibility to either initiate a search across any website known or discovered during its usage or to
 * concentrate the search on a predefined, specific website.
 *
 * The tool uses the following components:
 * - A RAG Toolkit instance, which handles the RAG process
 * - A Chunker instance, which chunks and processes text for the RAG model
 * - An Embeddings instance, which handles embeddings for the RAG model
 * - A VectorStore instance, which stores vectors for the RAG model
 * - An LLM instance, which handles the language model for the RAG model
 * - A promptQuestionTemplate, which defines the template for asking questions
 * - An OpenAI API key, which is used for interacting with the OpenAI API
 */

import { StructuredTool } from '@langchain/core/tools';
import { CheerioWebBaseLoader } from '@langchain/community/document_loaders/web/cheerio';
import { z } from 'zod';
import { OpenAIEmbeddings } from '@langchain/openai';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { ChatOpenAI } from '@langchain/openai';
import { RAGToolkit } from './rag/ragToolkit';
interface WebsiteSearchFields {
  OPENAI_API_KEY: string;
  url?: string;
  chunkOptions?: {
    chunkSize: number;
    chunkOverlap: number;
  };
  embeddings?: OpenAIEmbeddings;
  vectorStore?: MemoryVectorStore;
  llmInstance?: ChatOpenAI;
  promptQuestionTemplate?: string;
}

export class WebsiteSearch extends StructuredTool {
  private OPENAI_API_KEY: string;
  private url?: string;
  private chunkOptions?: any;
  private embeddings?: OpenAIEmbeddings;
  private vectorStore?: MemoryVectorStore;
  private llmInstance?: ChatOpenAI;
  private promptQuestionTemplate?: string;
  private ragToolkit: RAGToolkit;
  name = 'website-search';
  description =
    'A tool for conducting semantic searches within the content of a particular website using the RAG approach. Input should be a URL and a question string.';
  schema = z.object({
    url: z.string().describe('The URL to process.'),
    query: z.string().describe('The question to ask.'),
  });

  constructor(fields: WebsiteSearchFields) {
    super();
    this.OPENAI_API_KEY = fields.OPENAI_API_KEY;
    this.url = fields.url;
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
      'web',
      (source: string | File) =>
        new CheerioWebBaseLoader(source as string) as any
    );
  }

  async _call(input: z.infer<typeof this.schema>): Promise<string> {
    const { url, query } = input;
    if (url && url !== '') {
      this.url = url;
    }
    if (!this.url || this.url === '') {
      return "ERROR_MISSING_URL: No url was provided for analysis. Agent should provide valid url in the 'url' field.";
    }
    if (!query || query === '') {
      return "ERROR_MISSING_QUERY: No question was provided. Agent should provide a question in the 'query' field.";
    }

    try {
      await this.ragToolkit.addDocuments([{ source: this.url, type: 'web' }]);
      const response = await this.ragToolkit.askQuestion(query);
      return response;
    } catch (error) {
      return `ERROR_WEBSITE_SEARCH_PROCESSING: An unexpected error occurred: in WebsiteSearch tool. Details: ${
        error instanceof Error ? error.message : String(error)
      }. Agent should verify content format and query validity.`;
    }
  }
}
