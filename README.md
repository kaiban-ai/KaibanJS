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

## Why AgenticJS?

There are about 20 million JavaScript developers worldwide, yet most AI frameworks are originally written in Python. Others are mere adaptations for JavaScript. 

This puts all of us **JavaScript developers at a disadvantage in the AI race**. But not anymore...

AgenticJS changes the game by aiming to offer a robust, easy-to-use AI multi-agent framework designed specifically for the JavaScript ecosystem.

```js
const writtenBy = `Another JS Dev Who Doesn't Want to Learn Python to do meaningful AI Stuff.`;
console.log(writtenBy);
```


### Key Features

- **Role-Based Agent Design:** Design agents with specific roles and goals.
- **Flexible Task Management:** Define and assign tasks dynamically to agents.
- **Redux-Inspired Architecture:** This architecture offers a unified approach to managing the states of all AI agents. As a big plus, it integrates effortlessly into your React applications.
- **Real-Time Visualizer:** Built-in UI visualizer for development and debugging.
- **Browser and Server Compatibility:** Works seamlessly across client and server environments.
- **Multi-Model Support:** Integrates with various AI models including OpenAI, Gemini, Claude, and Mistral, enhancing versatility and adaptability.

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

Define agents, tasks, and a team to manage them:

```js
import { Agent, Task, Team } from 'agenticjs';

// NodeJS
// const { Agent, Task, Team } = require('agenticjs');

// ╔══════════════════════════════════════════════════════╗
// ║ How to Use AgenticJS:                                ║
// ║ 1. Define your Agents with specific roles and goals  ║
// ║ 2. Define the Tasks each Agent will perform          ║ 
// ║ 3. Create the Team and assign Agents and their Tasks ║
// ║ 4. Start the Team to execute the defined tasks       ║
// ╚══════════════════════════════════════════════════════╝

// ──── Agents ────────────────────────────────────────────
// ─ Agents are autonomous entities designed to perform
// ─ specific roles and achieve goals based on the
// ─ tasks assigned to them.
// ────────────────────────────────────────────────────────

const profileAnalyst = new Agent({
    name: 'Ivy', 
    role: 'Profile Analyst', 
    goal: 'Extract structured information from conversational user input.', 
    background: 'Data Processor',
    tools: [],  // Tools are omitted for now  
});

const formatter = new Agent({
    name: 'Formy', 
    role: 'Formatter', 
    goal: 'Format structured information into a professional resume.', 
    background: 'Document Formatter',
    tools: [],  
});

const reviewer = new Agent({
    name: 'Revy', 
    role: 'Reviewer', 
    goal: 'Review and polish the final resume.', 
    background: 'Quality Assurance Specialist',
    tools: [],  
});

// ──── Tasks ─────────────────────────────────────────────
// ─ Tasks define the specific actions each agent must
// ─ take, their expected outputs, and mark critical
// ─ outputs as deliverables if they are the final
// ─ products.
// ────────────────────────────────────────────────────────

const processingTask = new Task({ 
    description: `Extract relevant details such as name, experience, skills, and job history from the user's 'aboutMe' input. 
    aboutMe: {aboutMe}`,
    expectedOutput: 'Structured data ready for formatting.', 
    agent: profileAnalyst
});

const formattingTask = new Task({ 
    description: `Use the extracted information to create a clean, professional resume layout tailored for a JavaScript Developer.`,
    expectedOutput: 'A well-formatted resume in PDF format.', 
    agent: formatter 
});

const reviewTask = new Task({ 
    description: `Ensure the resume is error-free, engaging, and meets professional standards.`,
    expectedOutput: 'A polished, final resume ready for job applications. Please do not give any feedback on the resume. Just the final resume.', 
    agent: reviewer 
});

// ──── Team ────────────────────────────────────────────
// ─ The Team coordinates the agents and their tasks.
// ─ It starts with an initial input and manages the
// ─ flow of information between tasks.
// ──────────────────────────────────────────────────────

const team = new Team({
    name: 'Resume Creation Team',
    agents: [profileAnalyst, formatter, reviewer],
    tasks: [processingTask, formattingTask, reviewTask],
    inputs: { aboutMe: 'My name is Will, I have been a Javascript Developer for 3 years. I know React, NextJS, and REDUX. My latest job was as a Junior Developer at Disney creating UIs for the main landing page.' },  // Initial input for the first task
    env: {OPENAI_API_KEY: 'your-open-ai-api-key'}  // Environment variables for the team
});

// Note: Avoid hardcoding API keys; retrieve them from environment variables instead.

// ──── Listening to Changes────────────────────────────────────────────
// 
// Listening to changes in the team's state is crucial for dynamic updates.
// Yup...AgenticJS utilizes a store similar to Redux for state management.
//──────────────────────────────────────────────────────────────────────

const unsubscribe = team.subscribeToChanges((updatedFields) => {
    console.log("Workflow Status Updated:", updatedFields);
}, ['teamWorkflowStatus']);

// ──── Start Team Workflow ───────────────────────────────────────
// 
// Begins the predefined team process, producing the final result.
//─────────────────────────────────────────────────────────────────
const result = await team.start();
console.log("Final Output:", result);
```

## Documentation

- [Official Documentation](https://agenticjs.com)
- [Join Our Discord](https://bit.ly/JoinAIChamps)

### Compatibility

AgenticJS aims to be compatible with major front-end frameworks like React, Vue, Angular, and NextJS, making it a versatile choice for developers. The JavaScript ecosystem is a "bit complex...". If you have any problems, please tell us and we'll help you fix them.

### Community and Support

Join our [Discord community](https://bit.ly/JoinAIChamps) to connect with other developers and get support. [Follow us](https://x.com/dariel_noel) on Twitter for the latest updates.

### Contributing

We welcome contributions from the community. Please read our contributing guidelines before submitting pull requests.

### License

AgenticJS is MIT licensed.