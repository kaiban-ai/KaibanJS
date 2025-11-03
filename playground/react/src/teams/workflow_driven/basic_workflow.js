import { Agent, Task, Team } from 'kaibanjs';
import { createStep, createWorkflow } from '@kaibanjs/workflow';
import { z } from 'zod';

// Create workflow steps
const addStep = createStep({
  id: 'add',
  inputSchema: z.object({ a: z.number(), b: z.number() }),
  outputSchema: z.number(),
  execute: async ({ inputData }) => {
    const { a, b } = inputData;
    return a + b;
  },
});

const multiplyStep = createStep({
  id: 'multiply',
  inputSchema: z.number(),
  outputSchema: z.number(),
  execute: async ({ inputData, getInitData }) => {
    const sum = inputData;
    const { a, b } = getInitData();
    return sum * a * b;
  },
});

const formatStep = createStep({
  id: 'format',
  inputSchema: z.number(),
  outputSchema: z.object({
    result: z.number(),
    calculation: z.string(),
    timestamp: z.string(),
  }),
  execute: async ({ inputData, getInitData }) => {
    const result = inputData;
    const { a, b } = getInitData();
    return {
      result,
      calculation: `${a} + ${b} = ${
        a + b
      }, then multiplied by ${a} * ${b} = ${result}`,
      timestamp: new Date().toISOString(),
    };
  },
});

// Create the workflow
const mathWorkflow = createWorkflow({
  id: 'math-workflow',
  inputSchema: z.object({ a: z.number(), b: z.number() }),
  outputSchema: z.object({
    result: z.number(),
    calculation: z.string(),
    timestamp: z.string(),
  }),
});

// Build the workflow: add -> multiply -> format
mathWorkflow.then(addStep).then(multiplyStep).then(formatStep);
mathWorkflow.commit();

// Define the workflow-driven agent
const workflowAgent = new Agent({
  name: 'Math Processor',
  type: 'WorkflowDrivenAgent',
  workflow: mathWorkflow,
});

// Define the task
const processTask = new Task({
  description:
    'Process mathematical operations using the workflow: {a} and {b}',
  expectedOutput:
    'The result of the mathematical workflow with calculation details',
  agent: workflowAgent,
});

// Create the team
const team = new Team({
  name: 'Workflow-Driven Math Team',
  agents: [workflowAgent],
  tasks: [processTask],
  inputs: { a: 5, b: 3 },
  env: {
    OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY,
    ANTHROPIC_API_KEY: import.meta.env.VITE_ANTHROPIC_API_KEY,
  },
});

export default team;
