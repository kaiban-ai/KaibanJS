const { Agent, Task, Team } = require('kaibanjs');
const { createStep, createWorkflow } = require('@kaibanjs/workflow');
const { z } = require('zod');

// Create steps for parallel workflow
const parallelStep1 = createStep({
  id: 'parallelStep1',
  inputSchema: z.object({ value: z.number() }),
  outputSchema: z.number(),
  execute: async ({ inputData }) => {
    const { value } = inputData;
    // Simulate some processing time
    await new Promise((resolve) => setTimeout(resolve, 50));
    return value * 2;
  },
});

const parallelStep2 = createStep({
  id: 'parallelStep2',
  inputSchema: z.object({ value: z.number() }),
  outputSchema: z.number(),
  execute: async ({ inputData }) => {
    const { value } = inputData;
    // Simulate some processing time
    await new Promise((resolve) => setTimeout(resolve, 30));
    return value * 3;
  },
});

const sumParallelResultsStep = createStep({
  id: 'sumParallelResults',
  inputSchema: z.any(),
  outputSchema: z.number(),
  execute: async ({ _inputData, getStepResult }) => {
    const result1 = getStepResult('parallelStep1');
    const result2 = getStepResult('parallelStep2');
    console.log('result1', result1);
    console.log('result2', result2);
    return result1 + result2;
  },
});

const parallelWorkflow = createWorkflow({
  id: 'parallel-workflow',
  inputSchema: z.object({ value: z.number() }),
  outputSchema: z.number(),
});

// Execute parallel steps simultaneously, then sum results
parallelWorkflow
  .parallel([parallelStep1, parallelStep2])
  .then(sumParallelResultsStep);

parallelWorkflow.commit();

// Create WorkflowDrivenAgent
const workflowAgent = new Agent({
  type: 'WorkflowDrivenAgent',
  name: 'Parallel Workflow Agent',
  workflow: parallelWorkflow,
});

// Create task
const workflowTask = new Task({
  description:
    'Execute the parallel workflow to process a value through two parallel steps and sum the results',
  expectedOutput: 'The sum of parallel step results',
  agent: workflowAgent,
});

// Create team
const team = new Team({
  name: 'Parallel Workflow Team',
  agents: [workflowAgent],
  tasks: [workflowTask],
  env: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  },
});

module.exports = team;
