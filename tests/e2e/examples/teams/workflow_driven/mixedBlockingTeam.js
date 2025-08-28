const { Agent, Task, Team } = require('kaibanjs');
const { createStep, createWorkflow } = require('@kaibanjs/workflow');
const { z } = require('zod');

// Create workflow for WorkflowDrivenAgent validation
const validationStep = createStep({
  id: 'validation',
  inputSchema: z.object({
    data: z.string(),
    shouldBlock: z.boolean(),
  }),
  outputSchema: z.object({
    isValid: z.boolean(),
    message: z.string(),
    processedData: z.string(),
  }),
  execute: async ({ inputData, blockTask }) => {
    const { data, shouldBlock } = inputData;

    if (shouldBlock) {
      // Block the task if validation fails
      await blockTask({
        reason: 'Data validation failed',
        details:
          'The provided data does not meet the required criteria for processing',
        requiredFields: ['validFormat', 'properStructure'],
      });
    }

    return {
      isValid: !shouldBlock,
      message: shouldBlock ? 'Validation failed' : 'Validation passed',
      processedData: shouldBlock ? '' : `validated: ${data}`,
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
    processedData: z.string(),
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

// Create ReactChampionAgent
const reactAgent = new Agent({
  type: 'ReactChampionAgent',
  name: 'Data Processing Agent',
  role: 'Process validated data',
  goal: 'Process and analyze validated data',
  background: 'Expert in data analysis and processing',
  maxIterations: 5,
});

// Create tasks with dependencies
const workflowTask = new Task({
  referenceId: 'workflowTask',
  description: 'Execute the validation workflow to check data validity',
  expectedOutput: 'Validation result with processed data',
  agent: workflowAgent,
});

const reactTask = new Task({
  referenceId: 'reactTask',
  description: 'Process the validated data from the workflow task',
  expectedOutput: 'Analysis of the processed data',
  agent: reactAgent,
  dependencies: ['workflowTask'], // This task depends on the workflow task
});

// Create team
const team = new Team({
  name: 'Mixed Blocking Team',
  agents: [workflowAgent, reactAgent],
  tasks: [workflowTask, reactTask],
  env: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  },
});

module.exports = team;
