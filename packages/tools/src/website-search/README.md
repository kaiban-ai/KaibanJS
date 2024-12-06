# Website Search Tool

This tool is specifically crafted for conducting semantic searches within the content of a particular website. Leveraging a Retrieval-Augmented Generation (RAG) model, it navigates through the information provided on a given URL. Users have the flexibility to either initiate a search across any website known or discovered during its usage or to concentrate the search on a predefined, specific website.

## Components

The tool uses the following components:

- A RAG Toolkit instance, which handles the RAG process
- A Chunker instance, which chunks and processes text for the RAG model
- An Embeddings instance, which handles embeddings for the RAG model
- A VectorStore instance, which stores vectors for the RAG model
- An LLM instance, which handles the language model for the RAG model
- A promptQuestionTemplate, which defines the template for asking questions
- An OpenAI API key, which is used for interacting with the OpenAI API

## Input

The input should be a JSON object with a "url" field containing the URL to process and a "query" field containing the question to ask.

## Output

The output is the answer to the question, generated using the RAG approach.

## More Information

For more information about the RAG Toolkit, visit:

## Example

```javascript
const tool = new WebsiteSearch({
  OPENAI_API_KEY: 'your-openai-api-key',
  url: 'https://example.com',
});
const result = await tool._call({ query: 'question to ask' });
```

## Advanced Example with Pinecone Vector Store

To use a different vector store like Pinecone, you need to configure the `WebsiteSearch` tool accordingly. Below is an example of how to set up and use Pinecone as the vector store.

### Prerequisites

- Ensure you have a Pinecone account and API key.
- Install the Pinecone client library.

```bash
npm install @pinecone-database/pinecone
```

### Example

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

// Initialize the WebsiteSearch tool with Pinecone as the vector store
const tool = new WebsiteSearch({
  OPENAI_API_KEY: 'your-openai-api-key',
  embeddings: embeddings,
  vectorStore: pineconeVectorStore,
  url: 'https://example.com',
});

const result = await tool._call({ query: 'question to ask' });
console.log(result);
```

In this example, the `WebsiteSearch` tool is configured to use Pinecone as the vector store, allowing for efficient and scalable vector operations.

### Disclaimer

Ensure your environment supports server-side execution when using integrations with some `langchain` library.
