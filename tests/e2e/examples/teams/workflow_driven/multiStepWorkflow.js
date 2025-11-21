const { Agent, Task, Team } = require('kaibanjs');
const { createStep, createWorkflow } = require('@kaibanjs/workflow');
const { z } = require('zod');

// Create steps for multi-step workflow
const incrementStep = createStep({
  id: 'increment',
  inputSchema: z.object({ initialValue: z.number() }),
  outputSchema: z.number(),
  execute: async ({ inputData }) => {
    const { initialValue } = inputData;
    return initialValue + 1;
  },
});

const multiplyStep = createStep({
  id: 'multiply',
  inputSchema: z.number(),
  outputSchema: z.number(),
  execute: async ({ inputData, getInitData }) => {
    const incrementedValue = inputData;
    const { multiplier } = getInitData();
    return incrementedValue * multiplier;
  },
});

const multiStepWorkflow = createWorkflow({
  id: 'multi-step-workflow',
  inputSchema: z.object({
    initialValue: z.number(),
    multiplier: z.number(),
  }),
  outputSchema: z.number(),
});

multiStepWorkflow.then(incrementStep).then(multiplyStep);
multiStepWorkflow.commit();

// Create WorkflowDrivenAgent
const workflowAgent = new Agent({
  type: 'WorkflowDrivenAgent',
  name: 'Multi-Step Workflow Agent',
  workflow: multiStepWorkflow,
});

// Create task
const workflowTask = new Task({
  description: 'Execute the multi-step workflow: increment then multiply',
  expectedOutput: 'The result of (initialValue + 1) * multiplier',
  agent: workflowAgent,
});

// Create team
const team = new Team({
  name: 'Multi-Step Workflow Team',
  agents: [workflowAgent],
  tasks: [workflowTask],
  env: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  },
});

module.exports = team;
