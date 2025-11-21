const { Agent, Task, Team } = require('kaibanjs');
const { createStep, createWorkflow } = require('@kaibanjs/workflow');
const { z } = require('zod');

// Create steps for resettable workflow
const counterStep = createStep({
  id: 'counter',
  inputSchema: z.object({ value: z.number() }),
  outputSchema: z.number(),
  execute: async ({ inputData, runtimeContext }) => {
    const { value } = inputData;

    // Get counter from context
    const counter = runtimeContext.get('counter') || 0;
    const newCounter = counter + 1;

    // Store updated counter in context
    runtimeContext.set('counter', newCounter);

    return value + newCounter;
  },
});

const resettableWorkflow = createWorkflow({
  id: 'resettable-workflow',
  inputSchema: z.object({ value: z.number() }),
  outputSchema: z.number(),
});

resettableWorkflow.then(counterStep);
resettableWorkflow.commit();

// Create WorkflowDrivenAgent
const workflowAgent = new Agent({
  type: 'WorkflowDrivenAgent',
  name: 'Resettable Workflow Agent',
  workflow: resettableWorkflow,
});

// Create task
const workflowTask = new Task({
  description:
    'Execute the resettable workflow that can be reset between executions',
  expectedOutput: 'The result with counter',
  agent: workflowAgent,
});

// Create team
const team = new Team({
  name: 'Resettable Workflow Team',
  agents: [workflowAgent],
  tasks: [workflowTask],
  env: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  },
});

module.exports = team;
