const { Agent, Task, Team } = require('kaibanjs');
const { createStep, createWorkflow } = require('@kaibanjs/workflow');
const { z } = require('zod');

// Create steps for conditional workflow
const checkEvenStep = createStep({
  id: 'checkEven',
  inputSchema: z.object({ number: z.number() }),
  outputSchema: z.number(),
  execute: async ({ inputData }) => {
    const { number } = inputData;
    return number;
  },
});

const evenStep = createStep({
  id: 'even',
  inputSchema: z.number(),
  outputSchema: z.string(),
  execute: async ({ inputData }) => {
    const num = inputData;
    return `even: ${num}`;
  },
});

const oddStep = createStep({
  id: 'odd',
  inputSchema: z.number(),
  outputSchema: z.string(),
  execute: async ({ inputData }) => {
    const num = inputData;
    return `odd: ${num}`;
  },
});

const conditionalWorkflow = createWorkflow({
  id: 'conditional-workflow',
  inputSchema: z.object({ number: z.number() }),
  outputSchema: z.string(),
});

conditionalWorkflow.then(checkEvenStep).branch([
  [
    async ({ inputData }) => {
      return inputData % 2 === 0;
    },
    evenStep,
  ],
  [async () => true, oddStep], // fallback for odd numbers
]);

conditionalWorkflow.commit();

// Create WorkflowDrivenAgent
const workflowAgent = new Agent({
  type: 'WorkflowDrivenAgent',
  name: 'Conditional Workflow Agent',
  workflow: conditionalWorkflow,
});

// Create task
const workflowTask = new Task({
  description:
    'Execute the conditional workflow to check if number is even or odd',
  expectedOutput: 'A string indicating if the number is even or odd',
  agent: workflowAgent,
});

// Create team
const team = new Team({
  name: 'Conditional Workflow Team',
  agents: [workflowAgent],
  tasks: [workflowTask],
  env: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  },
});

module.exports = team;
