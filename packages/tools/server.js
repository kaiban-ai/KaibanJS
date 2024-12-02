const http = require('http');
const { PdfSearch } = require('./dist/pdf-search/index.cjs');
// const { TextFileSearch } = require('./dist/textfile-search/index.cjs');
// src/index.js or main entry file

// const RAGToolkit = require('./dist/rag-toolkit/index.cjs');
// const { PDFLoader } = require('@langchain/community/document_loaders/fs/pdf');

// const { PineconeStore } = require('@langchain/pinecone');
// const { Pinecone: PineconeClient } = require('@pinecone-database/pinecone');
// const { OpenAIEmbeddings } = require('@langchain/openai');

require('dotenv').config();

const hostname = '127.0.0.1';
const port = 3000;
// const largeText = `From Kanban to Kaiban: Evolving Workflow Management for AI
// The Kaiban Board draws inspiration from the time-tested Kanban methodology, adapting it for the unique challenges of AI agent management.

// But what exactly is Kanban, and how does it translate to the world of AI?

// The Kanban Methodology: A Brief Overview
// Kanban, Japanese for "visual signal" or "card," originated in Toyota's manufacturing processes in the late 1940s. It's a visual system for managing work as it moves through a process, emphasizing continuous delivery without overburdening the development team.

// Key principles of Kanban include:

// Visualizing workflow
// Limiting work in progress
// Managing flow
// Making process policies explicit
// Implementing feedback loops
// If you have worked with a team chances are you have seen a kanban board in action. Popular tools like Trello, ClickUp, and Jira use kanban to help teams manage their work.

// KaibanJS: Kanban for AI Agents
// KaibanJS takes the core principles of Kanban and applies them to the complex world of AI agent management. Just as Kanban uses cards to represent work items, KaibanJS uses powerful, state management techniques to represent AI agents, their tasks, and their current states.

// With KaibanJS, you can:

// Create, visualize, and manage AI agents, tasks, and teams
// Orchestrate your AI agents' workflows
// Visualize your AI agents' workflows in real-time
// Track the progress of tasks as they move through various stages
// Identify bottlenecks and optimize your AI processes
// Collaborate more effectively with your team on AI projects
// By representing agentic processes in a familiar Kanban-style board, KaibanJS makes it easier for both technical and non-technical team members to understand and manage complex AI workflows.

// The Kaiban Board: Your AI Workflow Visualization Center
// The Kaiban Board serves as a visual representation of your AI agent workflows powered by the KaibanJS framework. It provides an intuitive interface that allows you to:

// Visualize AI agents created and configured through KaibanJS
// Monitor agent tasks and interactions in real-time
// Track progress across different stages of your AI workflow
// Identify issues quickly for efficient troubleshooting
// The KaibanJS framework itself enables you to:

// Create and configure AI agents programmatically
// Deploy your AI solutions with a simple command
// Whether you're a seasoned AI developer or just getting started with multi-agent systems, the combination of the Kaiban Board for visualization and KaibanJS for development offers a powerful yet accessible way to manage your AI projects.

// Experience the Kaiban Board for yourself and see how it can streamline your AI development process. Visit our playground to get started today!`;
// const pineconeStoreInstance = async (embeddings) => {
//   const pineconeKey = process.env.VITE_PINECONE_API_KEY;
//   console.log({ pineconeKey });

//   const pinecone = new PineconeClient({
//     apiKey: pineconeKey,
//   });

//   const pineconeIndex = pinecone.Index('test');
//   const vectorStore = PineconeStore.fromExistingIndex(embeddings, {
//     pineconeIndex,
//   });
//   return vectorStore;
// };

const server = http.createServer(async (req, res) => {
  console.log(PdfSearch);

  // const ragToolkit = new RAGToolkit({
  //   env: { OPENAI_API_KEY: process.env.VITE_OPENAI_API_KEY },
  // });

  // const sources = [
  //   {
  //     source: './public/KaibanJS.pdf',
  //     type: 'pdf',
  //   },
  // ];

  // ragToolkit.registerLoader('pdf', (source) => new PDFLoader(source));

  try {
    // ragToolkit.embeddings = new OpenAIEmbeddings({
    //   apiKey: process.env.VITE_OPENAI_API_KEY,
    //   model: 'text-embedding-3-small',
    // });
    // ragToolkit.vectorStore = await pineconeStoreInstance(ragToolkit.embeddings);

    // console.log('add document');
    // await ragToolkit.addDocuments(sources);
    // console.log('finish add document');

    // console.log('retrieve ');

    // const documents = await ragToolkit.search('What is Agent in kaiban?');
    // console.log({ documents });

    // console.log('finish retrieve ');
    // console.log('ask ');

    // const result = await ragToolkit.askQuestion('What is Agent in kaiban?');
    // console.log({ result });

    // const tool = new TextFileSearch({
    //   OPENAI_API_KEY: process.env.VITE_OPENAI_API_KEY,
    //   file: './public/kaiban.txt',
    // });
    // const result = await tool._call({ query: 'What is Kaiban Board?' });
    const tool = new PdfSearch({
      OPENAI_API_KEY: process.env.VITE_OPENAI_API_KEY,
      file: './public/KaibanJS.pdf',
    });
    const result = await tool._call({ query: 'What is Agent in Kaiban?' });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html');
    return res.end(result);
  } catch (error) {
    console.log({ error });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html');
    return res.end(error.message);
  }
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
