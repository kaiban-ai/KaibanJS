const { Agent, Task, Team } = require('kaibanjs');
const { createStep, createWorkflow } = require('@kaibanjs/workflow');
const { z } = require('zod');

// Create steps for validation workflow
const validationStep = createStep({
  id: 'validation',
  inputSchema: z.object({
    data: z.string(),
    shouldBlock: z.boolean(),
  }),
  outputSchema: z.object({
    isValid: z.boolean(),
    message: z.string(),
  }),
  execute: async ({ inputData, blockTask }) => {
    const { _data, shouldBlock } = inputData;

    if (shouldBlock) {
      // Block the task if validation fails
      await blockTask({
        reason: 'Data validation failed',
        details: 'The provided data does not meet the required criteria',
        requiredFields: ['validFormat', 'properStructure'],
      });
    }

    return {
      isValid: !shouldBlock,
      message: shouldBlock ? 'Validation failed' : 'Validation passed',
    };
  },
});

const validationWorkflow = createWorkflow({
  id: 'validation-workflow',
  inputSchema: z.object({
    data: z.string(),
    shouldBlock: z.boolean(),
  }),
  outputSchema: z.object({
    isValid: z.boolean(),
    message: z.string(),
  }),
});

validationWorkflow.then(validationStep);
validationWorkflow.commit();

// Create WorkflowDrivenAgent
const workflowAgent = new Agent({
  type: 'WorkflowDrivenAgent',
  name: 'Validation Workflow Agent',
  workflow: validationWorkflow,
});

// Create task
const workflowTask = new Task({
  description: 'Execute the validation workflow to check data validity',
  expectedOutput: 'Validation result with status and message',
  agent: workflowAgent,
});

// Create team
const team = new Team({
  name: 'Validation Workflow Team',
  agents: [workflowAgent],
  tasks: [workflowTask],
  env: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  },
});

module.exports = team;
