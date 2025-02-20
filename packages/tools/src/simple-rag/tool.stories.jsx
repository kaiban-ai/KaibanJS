import { ToolPreviewer } from '../_utils/ToolPreviewer.jsx';
import { AgentWithToolPreviewer } from '../_utils/AgentWithToolPreviewer.jsx';
import { SimpleRAG } from './index.ts';
import { Agent, Task, Team } from '../../../../src/index';
import React from 'react';

export default {
  title: 'Tools/SimpleRAG',
  component: ToolPreviewer,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};
const content = `From Kanban to Kaiban: Evolving Workflow Management for AI
The Kaiban Board draws inspiration from the time-tested Kanban methodology, adapting it for the unique challenges of AI agent management.

But what exactly is Kanban, and how does it translate to the world of AI?

The Kanban Methodology: A Brief Overview
Kanban, Japanese for "visual signal" or "card," originated in Toyota's manufacturing processes in the late 1940s. It's a visual system for managing work as it moves through a process, emphasizing continuous delivery without overburdening the development team.

Key principles of Kanban include:

Visualizing workflow
Limiting work in progress
Managing flow
Making process policies explicit
Implementing feedback loops
If you have worked with a team chances are you have seen a kanban board in action. Popular tools like Trello, ClickUp, and Jira use kanban to help teams manage their work.

KaibanJS: Kanban for AI Agents
KaibanJS takes the core principles of Kanban and applies them to the complex world of AI agent management. Just as Kanban uses cards to represent work items, KaibanJS uses powerful, state management techniques to represent AI agents, their tasks, and their current states.

With KaibanJS, you can:

Create, visualize, and manage AI agents, tasks, and teams
Orchestrate your AI agents' workflows
Visualize your AI agents' workflows in real-time
Track the progress of tasks as they move through various stages
Identify bottlenecks and optimize your AI processes
Collaborate more effectively with your team on AI projects
By representing agentic processes in a familiar Kanban-style board, KaibanJS makes it easier for both technical and non-technical team members to understand and manage complex AI workflows.

The Kaiban Board: Your AI Workflow Visualization Center
The Kaiban Board serves as a visual representation of your AI agent workflows powered by the KaibanJS framework. It provides an intuitive interface that allows you to:

Visualize AI agents created and configured through KaibanJS
Monitor agent tasks and interactions in real-time
Track progress across different stages of your AI workflow
Identify issues quickly for efficient troubleshooting
The KaibanJS framework itself enables you to:

Create and configure AI agents programmatically
Deploy your AI solutions with a simple command
Whether you're a seasoned AI developer or just getting started with multi-agent systems, the combination of the Kaiban Board for visualization and KaibanJS for development offers a powerful yet accessible way to manage your AI projects.

Experience the Kaiban Board for yourself and see how it can streamline your AI development process. Visit our playground to get started today!`;

const simpleRAGTool = new SimpleRAG({
  OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY,
  //   /* Use just if want to customize the tool with different options instead default values */
  //   chunkOptions: { chunkSize: 1000, chunkOverlap: 200 },
  //   embeddings: new OpenAIEmbeddings({ apiKey: import.meta.env.VITE_OPENAI_API_KEY }),
  //   vectorStore: new MemoryVectorStore(new OpenAIEmbeddings({ apiKey: import.meta.env.VITE_OPENAI_API_KEY })),
  //   llmInstance: new ChatOpenAI({ apiKey: import.meta.env.VITE_OPENAI_API_KEY }),
  //   promptQuestionTemplate: 'Your custom prompt template',
});

// Create an agent with the simpleRAG tool
const questionAnswerer = new Agent({
  name: 'Q&A',
  role: 'Question Answerer',
  goal: 'Answer questions using the simple-rag tools',
  tools: [simpleRAGTool],
});

// Create a question answering task
const qaTask = new Task({
  description: 'Answer the following question: {query}',
  expectedOutput: 'A detailed answer to the question.',
  agent: questionAnswerer,
});

// Create the team
const team = new Team({
  name: 'QA Team',
  agents: [questionAnswerer],
  tasks: [qaTask],
  inputs: {
    query: 'What is Kaiban?',
    content,
  },
  env: {
    OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY,
  },
});

export const Default = {
  args: {
    toolInstance: simpleRAGTool,
    callParams: {
      query: 'What is Kaiban?',
      content,
    },
  },
};

export const withAgent = {
  render: (args) => <AgentWithToolPreviewer {...args} />,
  args: {
    team: team,
  },
};
