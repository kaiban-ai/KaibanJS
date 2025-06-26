import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { PromptTemplate } from '@langchain/core/prompts';
import { createStuffDocumentsChain } from 'langchain/chains/combine_documents';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { BaseDocumentLoader } from '@langchain/core/document_loaders/base';
import { Document } from 'langchain/document';
import { TextInputLoader } from './loaders/textInputLoader';
import { VectorStoreRetrieverInput } from '@langchain/core/vectorstores';

interface RAGToolkitOptions {
  embeddings?: OpenAIEmbeddings;
  vectorStore?: MemoryVectorStore;
  llmInstance?: ChatOpenAI;
  promptQuestionTemplate?: string;
  chunkOptions?: {
    chunkSize: number;
    chunkOverlap: number;
  };
  retrieverOptions?: VectorStoreRetrieverInput<MemoryVectorStore>;
  env?: {
    OPENAI_API_KEY: string;
  };
}

interface DocumentSource {
  source: string | File;
  type: string;
}

type LoaderFunction = (source: string | File) => BaseDocumentLoader;

export class RAGToolkit {
  private embeddings: OpenAIEmbeddings;
  private vectorStore: MemoryVectorStore;
  private llmInstance: ChatOpenAI;
  private promptQuestionTemplate: string;
  private chunkOptions: { chunkSize: number; chunkOverlap: number };
  private loaders: Record<string, LoaderFunction>;
  private retrieverOptions?: VectorStoreRetrieverInput<MemoryVectorStore>;

  constructor(options: RAGToolkitOptions = {}) {
    this.embeddings =
      options.embeddings ||
      new OpenAIEmbeddings({ apiKey: options?.env?.OPENAI_API_KEY });
    this.vectorStore =
      options.vectorStore || new MemoryVectorStore(this.embeddings);
    this.llmInstance =
      options.llmInstance ||
      new ChatOpenAI({
        model: 'gpt-4o-mini',
        temperature: 0,
        apiKey: options?.env?.OPENAI_API_KEY,
      });
    this.promptQuestionTemplate =
      options.promptQuestionTemplate ||
      `
      Use the following pieces of context to answer the question at the end.
      If you don't know the answer, just say that you don't know.
      Context: {context}
      Question: {question}
    `;
    this.chunkOptions = options.chunkOptions || {
      chunkSize: 1000,
      chunkOverlap: 200,
    };

    this.loaders = {
      string: (source: string | File) => new TextInputLoader(source as string),
    };
    this.retrieverOptions = options.retrieverOptions || undefined;
  }

  registerLoader(type: string, loaderFunction: LoaderFunction): void {
    if (this.loaders[type]) {
      throw new Error(`Loader type '${type}' is already registered.`);
    }
    this.loaders[type] = loaderFunction;
  }

  async addDocuments(sources: DocumentSource[]): Promise<void> {
    const documents = await this.loadDocuments(sources);
    const chunks = await this.chunkDocuments(documents);
    if (this.vectorStore instanceof MemoryVectorStore) {
      await this.vectorStore.addDocuments(chunks);
    } else {
      // Used for vector stores like Pinecone or Supabase
      // Convert to vector store type
      const vectorStore = this.vectorStore as any;
      await vectorStore.addDocuments(chunks, this.embeddings);
    }
  }

  async loadDocuments(sources: DocumentSource[]): Promise<Document[]> {
    const promises = sources.map(({ source, type }) => {
      const loaderFn = this.loaders[type];
      if (!loaderFn) {
        throw new Error(`Unsupported loader type: ${type}`);
      }
      return loaderFn(source).load();
    });
    const results = await Promise.all(promises);
    return results.flat();
  }

  async chunkDocuments(documents: Document[]): Promise<Document[]> {
    const splitter = new RecursiveCharacterTextSplitter(this.chunkOptions);
    return splitter.splitDocuments(documents);
  }

  async search(query: string): Promise<Document[]> {
    const retriever = this.vectorStore.asRetriever(this.retrieverOptions);
    return retriever.invoke(query);
  }

  async askQuestion(query: string): Promise<string> {
    const retriever = this.vectorStore.asRetriever(this.retrieverOptions);
    const context = await retriever.invoke(query);

    const promptTemplate = PromptTemplate.fromTemplate(
      this.promptQuestionTemplate
    );

    const chain = await createStuffDocumentsChain({
      llm: this.llmInstance,
      prompt: promptTemplate as any,
      outputParser: new StringOutputParser() as any,
    });

    return chain.invoke({ question: query, context });
  }
}
