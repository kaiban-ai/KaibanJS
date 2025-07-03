# Simple RAG Retrieve Tool

This tool integrates with various components from the langchain library to provide a simple interface for asking questions and retrieving answers using the Retrieval-Augmented Generation (RAG) approach.

The difference between this tool and the `SimpleRAG` tool is that this tool uses a VectorStore instance with preloaded data as a required parameter, and allows asking questions about information previously stored in the vector store.

By default, the RAGToolkit instance uses the following langchain components:

- `OpenAIEmbeddings` for generating embeddings.
- `MemoryVectorStore` for storing and retrieving vectors.
- `ChatOpenAI` as the language model.
- `RecursiveCharacterTextSplitter` for chunking documents.
- `TextInputLoader` for loading text input.
- `RetrieverOptions` for overriding retrieval options.

These components can be customized by passing different instances or options when creating the tool instance.

## Components

The tool uses the following components:

- Chunker options, which chunk and process text for the RAG model
- An Embeddings instance, which handles embeddings for the RAG model
- A VectorStore instance, which stores vectors for the RAG model
- An LLM instance, which handles the language model for the RAG model
- A promptQuestionTemplate, which defines the template for asking questions
- An OpenAI API key, which is used for interacting with the OpenAI API
- A RetrieverOptions instance, which handles the retriever options for the RAG model

## Input

The input should be a JSON object with a "query" field containing the question to ask.

## Output

The output is the answer to the question, generated using the RAG approach.

## More Information

For more information about the RAG Toolkit, visit:

## Example

```javascript
import { SimpleRAGRetrieve } from './index';

const vectorStore = new MemoryVectorStore();

const tool = new SimpleRAGRetrieve({
  OPENAI_API_KEY: 'your-openai-api-key',
  vectorStore: vectorStore,
});
const result = await tool._call({ query: 'question to ask' });
```

## Example with Pinecone Vector Store

Here is an example of how to create a `SimpleRAGRetrieve` instance with a custom Pinecone vector store and embedding instances:

```javascript
import { PineconeStore } from '@langchain/pinecone';
import { Pinecone as PineconeClient } from '@pinecone-database/pinecone';
import { OpenAIEmbeddings } from '@langchain/openai';

const embeddings = new OpenAIEmbeddings({
  apiKey: process.env.VITE_OPENAI_API_KEY,
  model: 'text-embedding-3-small',
});

const pineconeKey = process.env.VITE_PINECONE_API_KEY;

const pinecone = new PineconeClient({
  apiKey: pineconeKey,
});

const pineconeIndex = pinecone.Index('test');
const pineconeVectorStore = PineconeStore.fromExistingIndex(embeddings, {
  pineconeIndex,
});

const tool = new SimpleRAGRetrieve({
  OPENAI_API_KEY: 'your-openai-api-key',
  chunkOptions: { chunkSize: 1000, chunkOverlap: 200 },
  embeddings: embeddings,
  vectorStore: pineconeVectorStore,
  retrieverOptions: {
    k: 4,
    searchType: 'similarity',
    scoreThreshold: 0.7,
    filter: undefined, // Can be used for metadata filtering
  },
});

const result = await tool._call({ query: 'question to ask' });
console.log(result);
```

### Disclaimer

Many integrations with the `langchain` library, including Pinecone, only work server-side. Ensure your environment supports server-side execution when using these integrations.
