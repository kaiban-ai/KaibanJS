const { Agent, Task, Team } = require('kaibanjs');
const { createStep, createWorkflow } = require('@kaibanjs/workflow');
const { z } = require('zod');

// Create steps for error workflow
const conditionalErrorStep = createStep({
  id: 'conditionalError',
  inputSchema: z.object({ shouldFail: z.boolean() }),
  outputSchema: z.string(),
  execute: async ({ inputData }) => {
    const { shouldFail } = inputData;
    if (shouldFail) {
      throw new Error('Workflow execution failed as requested');
    }
    return 'Workflow executed successfully';
  },
});

const errorWorkflow = createWorkflow({
  id: 'error-workflow',
  inputSchema: z.object({ shouldFail: z.boolean() }),
  outputSchema: z.string(),
});

errorWorkflow.then(conditionalErrorStep);
errorWorkflow.commit();

// Create WorkflowDrivenAgent
const workflowAgent = new Agent({
  type: 'WorkflowDrivenAgent',
  name: 'Error Workflow Agent',
  workflow: errorWorkflow,
});

// Create task
const workflowTask = new Task({
  description: 'Execute the error workflow to test error handling',
  expectedOutput: 'Either success message or error',
  agent: workflowAgent,
});

// Create team
const team = new Team({
  name: 'Error Workflow Team',
  agents: [workflowAgent],
  tasks: [workflowTask],
  env: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  },
});

module.exports = team;
