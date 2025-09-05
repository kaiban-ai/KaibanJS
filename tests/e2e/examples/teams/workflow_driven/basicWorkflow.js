const { Agent, Task, Team } = require('kaibanjs');
const { createStep, createWorkflow } = require('@kaibanjs/workflow');
const { z } = require('zod');

// Create a simple addition workflow
const addStep = createStep({
  id: 'add',
  inputSchema: z.object({ a: z.number(), b: z.number() }),
  outputSchema: z.number(),
  execute: async ({ inputData }) => {
    const { a, b } = inputData;
    return a + b;
  },
});

const basicWorkflow = createWorkflow({
  id: 'basic-workflow',
  inputSchema: z.object({ a: z.number(), b: z.number() }),
  outputSchema: z.number(),
});

basicWorkflow.then(addStep);
basicWorkflow.commit();

// Create WorkflowDrivenAgent
const workflowAgent = new Agent({
  type: 'WorkflowDrivenAgent',
  name: 'Basic Workflow Agent',
  workflow: basicWorkflow,
});

// Create task
const workflowTask = new Task({
  description: 'Execute the basic addition workflow',
  expectedOutput: 'The sum of the two numbers',
  agent: workflowAgent,
});

// Create team
const team = new Team({
  name: 'Basic Workflow Team',
  agents: [workflowAgent],
  tasks: [workflowTask],
  env: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  },
});

module.exports = team;
