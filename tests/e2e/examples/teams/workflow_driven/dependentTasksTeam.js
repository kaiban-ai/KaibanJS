const { Agent, Task, Team } = require('kaibanjs');
const { createStep, createWorkflow } = require('@kaibanjs/workflow');
const { z } = require('zod');

// Create workflow for WorkflowDrivenAgent
const dataProcessingStep = createStep({
  id: 'dataProcessing',
  inputSchema: z.object({ input: z.string() }),
  outputSchema: z.string(),
  execute: async ({ inputData }) => {
    const { input } = inputData;
    return `processed: ${input.toUpperCase()}`;
  },
});

const dataProcessingWorkflow = createWorkflow({
  id: 'data-processing-workflow',
  inputSchema: z.object({ input: z.string() }),
  outputSchema: z.string(),
});

dataProcessingWorkflow.then(dataProcessingStep);
dataProcessingWorkflow.commit();

// Create WorkflowDrivenAgent
const workflowAgent = new Agent({
  type: 'WorkflowDrivenAgent',
  name: 'Data Processing Workflow Agent',
  workflow: dataProcessingWorkflow,
});

// Create ReactChampionAgent
const reactAgent = new Agent({
  type: 'ReactChampionAgent',
  name: 'Analysis Agent',
  role: 'Analyze processed data',
  goal: 'Provide insights on processed data',
  background: 'Expert in data analysis and interpretation',
  maxIterations: 5,
});

// Create tasks with dependencies
const workflowTask = new Task({
  referenceId: 'workflowTask',
  description: 'Execute the data processing workflow',
  expectedOutput: 'Processed data string',
  agent: workflowAgent,
});

const reactTask = new Task({
  referenceId: 'reactTask',
  description: 'Analyze the processed data from the workflow task',
  expectedOutput: 'Analysis of the processed data',
  agent: reactAgent,
  dependencies: ['workflowTask'], // This task depends on the workflow task
});

// Create team
const team = new Team({
  name: 'Dependent Tasks Team',
  agents: [workflowAgent, reactAgent],
  tasks: [workflowTask, reactTask],
  env: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  },
});

module.exports = team;
