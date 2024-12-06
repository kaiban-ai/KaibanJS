# Text File (txt) Search Tool

This tool is specifically crafted for conducting semantic searches within the content of a text file. Leveraging a Retrieval-Augmented Generation (RAG) model, it navigates through the information provided in a given text file. Users have the flexibility to either initiate a search across any text file known or discovered during its usage or to concentrate the search on a predefined, specific text file.

## Components

The tool uses the following components:

- A Chunker options, which chunks and processes text for the RAG model
- An Embeddings instance, which handles embeddings for the RAG model
- A VectorStore instance, which stores vectors for the RAG model
- An LLM instance, which handles the language model for the RAG model
- A promptQuestionTemplate, which defines the template for asking questions
- An OpenAI API key, which is used for interacting with the OpenAI API

## Input

The input should be a JSON object with a "file" field containing the text file path to process and a "query" field containing the question to ask.

## Output

The output is the answer to the question, generated using the RAG approach.

## More Information

For more information about the RAG Toolkit, visit:

## Example

```javascript
const tool = new TextFileSearch({
  OPENAI_API_KEY: 'your-openai-api-key',
  file: '/path/to/textfile.txt',
});
const result = await tool._call({ query: 'question to ask' });
```

## Advanced Example with Pinecone Vector Store

To use a different vector store like Pinecone, you need to configure the `TextFileSearch` tool accordingly. Below is an example of how to set up and use Pinecone as the vector store.

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

// Initialize the TextFileSearch tool with Pinecone as the vector store
const tool = new TextFileSearch({
  OPENAI_API_KEY: 'your-openai-api-key',
  embeddings: embeddings,
  vectorStore: pineconeVectorStore,
  file: '/path/to/textfile.txt',
});

const result = await tool._call({ query: 'question to ask' });
console.log(result);
```

In this example, the `TextFileSearch` tool is configured to use Pinecone as the vector store, allowing for efficient and scalable vector operations.

### Disclaimer

Many integrations with the `langchain` library, including Pinecone, only work server-side. Ensure your environment supports server-side execution when using these integrations.
