const { Agent, Task, Team } = require('kaibanjs');
const { createStep, createWorkflow } = require('@kaibanjs/workflow');
const { z } = require('zod');

// Create workflow for WorkflowDrivenAgent
const calculationStep = createStep({
  id: 'calculation',
  inputSchema: z.object({ a: z.number(), b: z.number() }),
  outputSchema: z.number(),
  execute: async ({ inputData }) => {
    const { a, b } = inputData;
    return a + b;
  },
});

const calculationWorkflow = createWorkflow({
  id: 'calculation-workflow',
  inputSchema: z.object({ a: z.number(), b: z.number() }),
  outputSchema: z.number(),
});

calculationWorkflow.then(calculationStep);
calculationWorkflow.commit();

// Create WorkflowDrivenAgent
const workflowAgent = new Agent({
  type: 'WorkflowDrivenAgent',
  name: 'Calculation Workflow Agent',
  workflow: calculationWorkflow,
});

// Create ReactChampionAgent
const reactAgent = new Agent({
  type: 'ReactChampionAgent',
  name: 'Data Processing Agent',
  role: 'Process and analyze data',
  goal: 'Process input data and provide insights',
  background: 'Expert in data analysis and processing',
  maxIterations: 5,
});

// Create tasks
const workflowTask = new Task({
  description: 'Execute the calculation workflow to add two numbers',
  expectedOutput: 'The sum of the two numbers',
  agent: workflowAgent,
});

const reactTask = new Task({
  description: 'Process the provided data and provide analysis',
  expectedOutput: 'Analysis of the processed data',
  agent: reactAgent,
});

// Create team
const team = new Team({
  name: 'Mixed Agent Team',
  agents: [workflowAgent, reactAgent],
  tasks: [workflowTask, reactTask],
  inputs: {
    data: 'test data',
    calculation: { a: 5, b: 3 },
  },
  env: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  },
});

module.exports = team;
