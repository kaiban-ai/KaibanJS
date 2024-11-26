// import { TextLoader } from "langchain/document_loaders/fs/text";
// import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
// import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { PromptTemplate } from '@langchain/core/prompts';
import { createStuffDocumentsChain } from 'langchain/chains/combine_documents';
import { StringOutputParser } from '@langchain/core/output_parsers';
// import { BrowserPDFLoader } from "./utils/loaders/BrowserPDFLoader";
import { TextInputLoader } from './loaders/textInputLoader';

class RAGToolkit {
  constructor(options = {}) {
    this.embeddings =
      options.embeddings ||
      new OpenAIEmbeddings({ apiKey: options?.env?.OPENAI_API_KEY });
    this.vectorStore =
      options.vectorStore || new MemoryVectorStore(this.embeddings);
    this.llm =
      options.llm ||
      new ChatOpenAI({
        model: 'gpt-4',
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
      string: (source) => new TextInputLoader(source),
      // text: source => new TextLoader(source),
      // pdf: source =>
      //   typeof window !== "undefined" && typeof window.document !== "undefined"
      //     ? new BrowserPDFLoader(new File([source as any], "document.pdf"))
      //     : new PDFLoader(source),
      // web: source => new CheerioWebBaseLoader(source),
      // browserPdf: source =>
      //   new BrowserPDFLoader(new File([source as any], "document.pdf"))
    };
  }

  registerLoader(type, loaderFunction) {
    if (this.loaders[type]) {
      throw new Error(`Loader type '${type}' is already registered.`);
    }
    this.loaders[type] = loaderFunction;
  }

  async addDocuments(sources) {
    const documents = await this.loadDocuments(sources);
    const chunks = await this.chunkDocuments(documents);
    await this.vectorStore.addDocuments(chunks, this.embeddings);
  }

  async loadDocuments(sources) {
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

  async chunkDocuments(documents) {
    const splitter = new RecursiveCharacterTextSplitter(this.chunkOptions);
    return splitter.splitDocuments(documents);
  }

  async search(query) {
    const retriever = this.vectorStore.asRetriever();
    return retriever.invoke(query);
  }

  async askQuestion(query) {
    const retriever = this.vectorStore.asRetriever();
    const context = await retriever.invoke(query);

    const promptTemplate = PromptTemplate.fromTemplate(
      this.promptQuestionTemplate
    );

    const chain = await createStuffDocumentsChain({
      llm: this.llm,
      prompt: promptTemplate,
      outputParser: new StringOutputParser(),
    });

    return chain.invoke({ question: query, context });
  }
}

export default RAGToolkit;
