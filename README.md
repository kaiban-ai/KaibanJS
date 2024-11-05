<p align="center">
  <a href="https://www.kaibanjs.com/">  
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://res.cloudinary.com/dnno8pxyy/image/upload/v1724533982/icon_htfer2.png">
      <img src="https://res.cloudinary.com/dnno8pxyy/image/upload/v1724533982/icon_htfer2.png" height="128">
    </picture>
    <h1 align="center">KaibanJS</h1>
    <h3 align="center">The JavaScript Framework for Building Multi-agent Systems.</h3>
  </a>
</p>

<p align="center">
  <a href="https://github.com/kaiban-ai/KaibanJS">
    <img src="https://img.shields.io/github/stars/kaiban-ai/kaibanjs.svg?style=social" alt="Star on GitHub">
  </a>
  <a href="https://github.com/kaiban-ai/kaibanjs/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="GitHub license">
  </a>
  <a href="https://www.npmjs.com/package/kaibanjs">
    <img src="https://img.shields.io/npm/v/kaibanjs.svg?style=flat" alt="npm version">
  </a>
  <a href="https://github.com/mkenney/software-guides/blob/master/STABILITY-BADGES.md#beta">
    <img src="https://img.shields.io/badge/stability-beta-33bbff.svg" alt="stability-beta">
  </a>
  <a href="https://github.com/kaiban-ai/KaibanJS/actions/workflows/stable-main-check-workflow.yml">
    <img src="https://github.com/kaiban-ai/KaibanJS/actions/workflows/stable-main-check-workflow.yml/badge.svg" alt="Tests">
  </a>
  <a href="https://github.com/kaiban-ai/KaibanJS/pulls">
    <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome">
  </a>
</p>

---

## Kanban for AI Agents? 🤖📋

**KaibanJS** is inspired by the tried-and-true [Kanban methodology](https://en.wikipedia.org/wiki/Kanban_(development)), which is well-known for helping teams organize and manage their work. We’ve adapted these concepts to meet the **unique challenges of AI agent management**.

If you've used tools like Trello, Jira, or ClickUp, you'll be familiar with how Kanban helps manage tasks. Now, KaibanJS uses that same system to help you manage AI agents and their tasks in real time.

**With KaibanJS, you can:**

- 🔨 Create, visualize, and manage AI agents, tasks, tools, and teams  
- 🎯 Orchestrate AI workflows seamlessly  
- 📊 Visualize workflows in real-time  
- 🔍 Track progress as tasks move through different stages  
- 🤝 Collaborate more effectively on AI projects

## Try It Out

[Explore the Kaiban Board](https://www.kaibanjs.com/playground) — *it's like Trello or Asana, but for AI Agents and humans.*

## Quick Start

Get started with KaibanJS in under a minute:

[![Quick Start Video](https://res.cloudinary.com/dnno8pxyy/image/upload/v1728039764/KaibanJS_QuickStart_Guide_2_asuyvu.jpg)](https://youtu.be/NFpqFEl-URY?si=_JCkJuprRxqD0Uo "Quick Start Video")

## Setup

**1. Run the KaibanJS initializer in your project directory:**
```bash
npx kaibanjs@latest init
```

**2. Add your AI service API key to the `.env` file:**
```
VITE_OPENAI_API_KEY=your-api-key-here
```

**3. Restart your Kaiban Board:**
```bash
npm run kaiban
```

### Using Your Kaiban Board

1. Click "Start Workflow" to run the default example.
2. Watch agents complete tasks in real-time on the Task Board.
3. View the final output in the Results Overview.

## Flexible Integration

> KaibanJS isn't limited to the Kaiban Board. You can integrate it directly into your projects, create custom UIs, or run agents without a UI. Explore our tutorials for [React](https://docs.kaibanjs.com/get-started/Tutorial:%20React%20+%20AI%20Agents) and [Node.js](https://docs.kaibanjs.com/get-started/Tutorial:%20Node.js%20+%20AI%20Agents) integration to unleash the full potential of KaibanJS in various development contexts.

## Manual Installation and Usage

If you prefer to set up KaibanJS manually follow these steps:

<details style="margin-bottom:10px;">
  <summary><b style="color:black;">1. Install KaibanJS via npm:</b></summary>

```bash
npm install kaibanjs
```
</details>  

<details style="margin-bottom:10px;">
  <summary><b style="color:black;">2. Import KaibanJS in your JavaScript file:</b></summary>

```js
// Using ES6 import syntax for NextJS, React, etc.
import { Agent, Task, Team } from 'kaibanjs';
```

```js
// Using CommonJS syntax for NodeJS
const { Agent, Task, Team } = require("kaibanjs");
```
</details>
<details style="margin-bottom:10px;">
  <summary><b style="color:black;">3. Basic Usage Example</b></summary>

```js
// Define an agent
const researchAgent = new Agent({
  name: 'Researcher',
  role: 'Information Gatherer',
  goal: 'Find relevant information on a given topic'
});

// Create a task
const researchTask = new Task({
  description: 'Research recent AI developments',
  agent: researchAgent
});

// Set up a team
const team = new Team({
  name: 'AI Research Team',
  agents: [researchAgent],
  tasks: [researchTask],
  env: {OPENAI_API_KEY: 'your-api-key-here'}
});

// Start the workflow
team.start()
  .then((output) => {
    console.log("Workflow completed:", output.result);
  })
  .catch((error) => {
    console.error("Workflow error:", error);
  });
```
</details>


## Basic Concepts

**Agents** 
Agents are autonomous entities designed to perform specific roles and achieve goals based on the tasks assigned to them. They are like super-powered LLMs that can execute tasks in a loop until they arrive at the final answer.

**Tasks**
Tasks define the specific actions each agent must take, their expected outputs, and mark critical outputs as deliverables if they are the final products.

**Team**
The Team coordinates the agents and their tasks. It starts with an initial input and manages the flow of information between tasks.

Watch this video to learn more about the concepts: [KaibanJS Concepts](https://youtu.be/VxfOIZLvBug?si=550uEiB3nriZ6trQ)

## Key Features

  <details style="margin-bottom:10px;">
  <summary><b style="color:black;">The Kaiban Board</b></summary>

Kanban boards are excellent tools for showcasing team workflows in real time, providing a clear and interactive snapshot of each member's progress. 

>We’ve adapted this concept for AI agents. 

Now, you can visualize the workflow of your AI agents as team members, with tasks moving from "To Do" to "Done" right before your eyes. This visual representation simplifies understanding and managing complex AI operations, making it accessible to anyone, anywhere.
</details> 

<details style="margin-bottom:10px;">
  <summary><b style="color:black;">Role-Based Agent Design</b></summary>

<p style="margin-top:10px;">
Harness the power of specialization by configuring AI agents to excel in distinct, critical functions within your projects. This approach enhances the effectiveness and efficiency of each task, moving beyond the limitations of generic AI.

In this example, our software development team is powered by three specialized AI agents: Dave, Ella, and Quinn. Each agent is expertly tailored to its specific role, ensuring efficient task handling and synergy that accelerates the development cycle.
</p>

```js
import { Agent } from 'kaibanjs';

const daveLoper = new Agent({
  name: 'Dave Loper',
  role: 'Developer',
  goal: 'Write and review code',
  background: 'Experienced in JavaScript, React, and Node.js'
});

const ella = new Agent({
  name: 'Ella',
  role: 'Product Manager',
  goal: 'Define product vision and manage roadmap',
  background: 'Skilled in market analysis and product strategy'
});

const quinn = new Agent({
  name: 'Quinn',
  role: 'QA Specialist',
  goal: 'Ensure quality and consistency',
  background: 'Expert in testing, automation, and bug tracking'
});

```
</details>


<details style="margin-bottom:10px;">
  <summary><b style="color:black;">Tool Integration</b></summary>

<p style="margin-top:10px;">
Just as professionals use specific tools to excel in their tasks, enable your AI agents to utilize tools like search engines, calculators, and more to perform specialized tasks with greater precision and efficiency.

In this example, one of the AI agents, Peter Atlas, leverages the Tavily Search Results tool to enhance his ability to select the best cities for travel. This tool allows Peter to analyze travel data considering weather, prices, and seasonality, ensuring the most suitable recommendations.
</p>

```js
import { Agent, Tool } from 'kaibanjs';

const tavilySearchResults = new Tool({
  name: 'Tavily Search Results',
  maxResults: 1,
  apiKey: 'ENV_TRAVILY_API_KEY',
});

const peterAtlas = new Agent({
  name: 'Peter Atlas',
  role: 'City Selector',
  goal: 'Choose the best city based on comprehensive travel data',
  background: 'Experienced in geographical data analysis and travel trends',
  tools: [tavilySearchResults]
});
```

*KaibanJS supports all LangchainJS-compatible tools, offering a versatile approach to tool integration. For further details, visit the [documentation](https://github.com/kaiban-ai/KaibanJS).*
</details>  


<details style="margin-bottom:10px;">
  <summary><b style="color:black;">Multiple LLMs Support</b></summary>

<p style="margin-top:10px;">
Optimize your AI solutions by integrating a range of specialized AI models, each tailored to excel in distinct aspects of your projects.

In this example, the agents—Emma, Lucas, and Mia—use diverse AI models to handle specific stages of feature specification development. This targeted use of AI models not only maximizes efficiency but also ensures that each task is aligned with the most cost-effective and appropriate AI resources.
</p>

```js
import { Agent } from 'kaibanjs';

const emma = new Agent({
  name: 'Emma',
  role: 'Initial Drafting',
  goal: 'Outline core functionalities',
  llmConfig: {
    provider: "google",
    model: "gemini-1.5-pro",
  }
});

const lucas = new Agent({
  name: 'Lucas',
  role: 'Technical Specification',
  goal: 'Draft detailed technical specifications',
  llmConfig: {
    provider: "anthropic",
    model: "claude-3-5-sonnet-20240620",
  }
});

const mia = new Agent({
  name: 'Mia',
  role: 'Final Review',
  goal: 'Ensure accuracy and completeness of the final document',
  llmConfig: {
    provider: "openai",
    model: "gpt-4o",
  }
});
```

*For further details on integrating diverse AI models with KaibanJS, please visit the [documentation](https://github.com/kaiban-ai/KaibanJS).*
  </details>

  <details style="margin-bottom:10px;">
  <summary><b style="color:black;">Robust State Management</b></summary>

<p style="margin-top:10px;">
KaibanJS employs a Redux-inspired architecture, enabling a unified approach to manage the states of AI agents, tasks, and overall flow within your applications. This method ensures consistent state management across complex agent interactions, providing enhanced clarity and control.

Here's a simplified example demonstrating how to integrate KaibanJS with state management in a React application:
</p>

```js
import myAgentsTeam from "./agenticTeam";

const KaibanJSComponent = () => {
  const useTeamStore = myAgentsTeam.useStore();

  const { agents, workflowResult } = useTeamStore(state => ({
    agents: state.agents,
    workflowResult: state.workflowResult,
  }));

  return (
    <div>
      <button onClick={myAgentsTeam.start}>Start Team Workflow</button>
      <p>Workflow Result: {workflowResult}</p>
      <div>
        <h2>🕵️‍♂️ Agents</h2>
        {agents.map(agent => (
          <p key={agent.id}>{agent.name} - {agent.role} - Status: ({agent.status})</p>
        ))}
      </div>
    </div>
  );
};

export default KaibanJSComponent;
```

*For a deeper dive into state management with KaibanJS, visit the [documentation](https://github.com/kaiban-ai/KaibanJS).*  
  </details>

  <details style="margin-bottom:10px;">
  <summary><b style="color:black;">Integrate with Your Preferred JavaScript Frameworks</b></summary>

<p style="margin-top:10px;">
Easily add AI capabilities to your NextJS, React, Vue, Angular, and Node.js projects.

KaibanJS is designed for seamless integration across a diverse range of JavaScript environments. Whether you’re enhancing user interfaces in React, Vue, or Angular, building scalable applications with NextJS, or implementing server-side solutions in Node.js, the framework integrates smoothly into your existing workflow. 
</p>

```js
import React from 'react';
import myAgentsTeam from "./agenticTeam";

const TaskStatusComponent = () => {
  const useTeamStore = myAgentsTeam.useStore();
  
  const { tasks } = useTeamStore(state => ({
    tasks: state.tasks.map(task => ({
      id: task.id,
      description: task.description,
      status: task.status
    }))
  }));

  return (
    <div>
      <h1>Task Statuses</h1>
      <ul>
        {tasks.map(task => (
          <li key={task.id}>{task.description}: Status - {task.status}</li>
        ))}
      </ul>
    </div>
  );
};

export default TaskStatusComponent;
```

*For a deeper dive visit the [documentation](https://github.com/kaiban-ai/KaibanJS).*  
  </details>

  </details>
  <details style="margin-bottom:10px;">
  <summary><b style="color:black;">Observability and Monitoring</b></summary>

<p style="margin-top:10px;">
Built into KaibanJS, the observability features enable you to track every state change with detailed stats and logs, ensuring full transparency and control. This functionality provides real-time insights into token usage, operational costs, and state changes, enhancing system reliability and enabling informed decision-making through comprehensive data visibility.

The following code snippet demonstrates how the state management approach is utilized to monitor and react to changes in workflow logs, providing granular control and deep insights into the operational dynamics of your AI agents:
</p>

```js

const useStore = myAgentsTeam.useStore();

useStore.subscribe(state => state.workflowLogs, (newLogs, previousLogs) => {
    if (newLogs.length > previousLogs.length) {
        const { task, agent, metadata } = newLogs[newLogs.length - 1];
        if (newLogs[newLogs.length - 1].logType === 'TaskStatusUpdate') {
            switch (task.status) {
                case TASK_STATUS_enum.DONE:
                    console.log('Task Completed', {
                        taskDescription: task.description,
                        agentName: agent.name,
                        agentModel: agent.llmConfig.model,
                        duration: metadata.duration,
                        llmUsageStats: metadata.llmUsageStats,
                        costDetails: metadata.costDetails,
                    });
                    break;
                case TASK_STATUS_enum.DOING:
                case TASK_STATUS_enum.BLOCKED:
                case TASK_STATUS_enum.REVISE:
                case TASK_STATUS_enum.TODO:
                    console.log('Task Status Update', {
                        taskDescription: task.description,
                        taskStatus: task.status,
                        agentName: agent.name
                    });
                    break;
                default:
                    console.warn('Encountered an unexpected task status:', task.status);
                    break;
            }
        }
    }
});
```

For more details on how to utilize observability features in KaibanJS, please visit the [documentation](https://github.com/kaiban-ai/KaibanJS).  
  </details>     



## Documentation

- [Official Documentation](https://docs.kaibanjs.com/category/get-started)
- [Join Our Discord](https://www.kaibanjs.com/discord)

### Compatibility

KaibanJS aims to be compatible with major front-end frameworks like React, Vue, Angular, and NextJS, making it a versatile choice for developers. The JavaScript ecosystem is a "bit complex...". If you have any problems, please tell us and we'll help you fix them.

## Why KaibanJS?

There are about 20 million JavaScript developers worldwide, yet most AI frameworks are originally written in Python. Others are mere adaptations for JavaScript. 

This puts all of us **JavaScript developers at a disadvantage in the AI race**. But not anymore...

KaibanJS changes the game by aiming to offer a robust, easy-to-use AI multi-agent framework designed specifically for the JavaScript ecosystem.

```js
const writtenBy = `Another JS Dev Who Doesn't Want to Learn Python to do meaningful AI Stuff.`;
console.log(writtenBy);
```

## Community and Support

Join the [Discord community](https://www.kaibanjs.com/discord) to connect with other developers and get support. [Follow us](https://x.com/dariel_noel) on Twitter for the latest updates.

## Contributing

We welcome contributions from the community. Please read the [contributing guidelines](https://github.com/kaiban-ai/KaibanJS/blob/main/CONTRIBUTING.md) before submitting pull requests.

## License

KaibanJS is MIT licensed.
