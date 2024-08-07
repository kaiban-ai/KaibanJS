![AgenticJS Logo](https://www.agenticjs.com/logo.svg)

[![Star on GitHub](https://img.shields.io/github/stars/AI-Champions/agenticjs.svg?style=social)](https://github.com/AI-Champions/AgenticJS)
[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/AI-Champions/agenticjs/blob/main/LICENSE) [![npm version](https://img.shields.io/npm/v/agenticjs.svg?style=flat)](https://www.npmjs.com/package/agenticjs)
[![stability-alpha](https://img.shields.io/badge/stability-alpha-f4d03f.svg)](https://github.com/mkenney/software-guides/blob/master/STABILITY-BADGES.md#alpha)
[![Tests](https://github.com/AI-Champions/AgenticJS/actions/workflows/stable-main-check-workflow.yml/badge.svg)](https://github.com/AI-Champions/AgenticJS/actions/workflows/stable-main-check-workflow.yml)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/AI-Champions/AgenticJS/pulls)

# AgenticJS
AgenticJS is a JavaScript-native framework for building multi-agent AI systems.

## Try It Out

[Explore the Playground](https://agenticjs.com) — *it's like Trello or Asana, but for AI Agents and humans.*

## Getting Started

### Install AgenticJS via npm:

```bash
npm install agenticjs --save
```

### Import AgenticJS in your JavaScript file:

```js
// Using ES6 import syntax for NextJS, React, etc.
import { Agent, Task, Team } from 'agenticjs';
```

```js
// Using CommonJS syntax for NodeJS
const { Agent, Task, Team } = require("agenticjs");
```

## Example Usage

In this example, we use AgenticJS to build a resume generation team. If you're looking to create or update your resume, this setup utilizes specialized AI agents to automatically process your information and produce a polished, professional resume tailored to your career goals.

```js

// Define agents with specific roles and goals
const profileAnalyst = new Agent({
    name: 'Mary', 
    role: 'Profile Analyst', 
    goal: 'Extract structured information from conversational user input.', 
    background: 'Data Processor',
    tools: []  // Tools are omitted for now
});

const resumeWriter = new Agent({
    name: 'Alex Mercer', 
    role: 'Resume Writer', 
    goal: `Craft compelling, well-structured resumes 
    that effectively showcase job seekers qualifications and achievements.`,
    background: `Extensive experience in recruiting, 
    copywriting, and human resources, enabling 
    effective resume design that stands out to employers.`,
    tools: []
});

// Define the tasks for each agent
const processingTask = new Task({ 
  description: `Extract relevant details such as name, 
  experience, skills, and job history from the user's 'aboutMe' input. 
  aboutMe: {aboutMe}`,
  expectedOutput: 'Structured data ready to be used for a resume creation.', 
  agent: profileAnalyst
});

const resumeCreationTask = new Task({ 
    description: `Utilize the structured data to create 
    a detailed and attractive resume. 
    Enrich the resume content by inferring additional details from the provided information.
    Include sections such as a personal summary, detailed work experience, skills, and educational background.`,
    expectedOutput: `A professionally formatted resume in markdown format, 
    ready for submission to potential employers.`, 
    agent: resumeWriter 
});

// Create and start the team
const team = new Team({
  name: 'Resume Creation Team',
  agents: [profileAnalyst, resumeWriter],
  tasks: [processingTask, resumeCreationTask],
  inputs: { aboutMe: `My name is David Llaca. 
    JavaScript Developer for 5 years. 
    I worked for three years at Disney, 
    where I developed user interfaces for their primary landing pages
     using React, NextJS, and Redux. Before Disney, 
     I was a Junior Front-End Developer at American Airlines, 
     where I worked with Vue and Tailwind. 
     I earned a Bachelor of Science in Computer Science from FIU in 2018, 
     and I completed a JavaScript bootcamp that same year.` },  // Initial input for the first task
    env: {OPENAI_API_KEY: 'your-open-ai-api-key'}  // Environment variables for the team
});

const result = await team.start();
console.log("Final Output:", result);
```

## Basic Concepts

**Agents** 
Agents are autonomous entities designed to perform specific roles and achieve goals based on the tasks assigned to them. They are like super-powered LLMs that can execute tasks in a loop until they arrive at the final answer.

**Tasks**
Tasks define the specific actions each agent must take, their expected outputs, and mark critical outputs as deliverables if they are the final products.

**Team**
The Team coordinates the agents and their tasks. It starts with an initial input and manages the flow of information between tasks.

## Key Features

- **Role-Based Agent Design:** Design agents with specific roles and goals.
- **Flexible Task Management:** Define and assign tasks dynamically to agents.
- **Redux-Inspired Architecture:** This architecture offers a unified approach to managing the states of all AI agents. As a big plus, it integrates effortlessly into your React applications.
- **Real-Time Visualizer:** Built-in UI visualizer for development and debugging.
- **Browser and Server Compatibility:** Works seamlessly across client and server environments.
- **Multi-Model Support:** Integrates with various AI models including OpenAI, Gemini, Claude, and Mistral, enhancing versatility and adaptability.

## Documentation

- [Official Documentation](https://agenticjs.com)
- [Join Our Discord](https://bit.ly/JoinAIChamps)

### Compatibility

AgenticJS aims to be compatible with major front-end frameworks like React, Vue, Angular, and NextJS, making it a versatile choice for developers. The JavaScript ecosystem is a "bit complex...". If you have any problems, please tell us and we'll help you fix them.

## Why AgenticJS?

There are about 20 million JavaScript developers worldwide, yet most AI frameworks are originally written in Python. Others are mere adaptations for JavaScript. 

This puts all of us **JavaScript developers at a disadvantage in the AI race**. But not anymore...

AgenticJS changes the game by aiming to offer a robust, easy-to-use AI multi-agent framework designed specifically for the JavaScript ecosystem.

```js
const writtenBy = `Another JS Dev Who Doesn't Want to Learn Python to do meaningful AI Stuff.`;
console.log(writtenBy);
```

### Community and Support

Join our [Discord community](https://bit.ly/JoinAIChamps) to connect with other developers and get support. [Follow us](https://x.com/dariel_noel) on Twitter for the latest updates.

### Contributing

We welcome contributions from the community. Please read our contributing guidelines before submitting pull requests.

### License

AgenticJS is MIT licensed.