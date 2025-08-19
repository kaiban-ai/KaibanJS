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

const evenStep = createStep({
  id: 'even',
  inputSchema: z.number(),
  outputSchema: z.string(),
  execute: async ({ inputData }) => {
    const num = inputData;
    return `even: ${num}`;
  },
});

const oddStep = createStep({
  id: 'odd',
  inputSchema: z.number(),
  outputSchema: z.string(),
  execute: async ({ inputData }) => {
    const num = inputData;
    return `odd: ${num}`;
  },
});

const processItemStep = createStep({
  id: 'process-item',
  inputSchema: z.number(),
  outputSchema: z.object({
    original: z.number(),
    processed: z.string(),
    doubled: z.number(),
  }),
  execute: async ({ inputData }) => {
    const num = inputData;
    return {
      original: num,
      processed: `processed_${num}`,
      doubled: num * 2,
    };
  },
});

const finalStep = createStep({
  id: 'final',
  inputSchema: z.any(),
  outputSchema: z.object({
    sequentialResult: z.number(),
    conditionalResult: z.string(),
    parallelResults: z.array(
      z.object({
        original: z.number(),
        processed: z.string(),
        doubled: z.number(),
      })
    ),
    finalResult: z.number(),
  }),
  execute: async ({ getStepResult }) => {
    const sequentialResult = getStepResult('multiply');
    const conditionalResult = getStepResult('even') || getStepResult('odd');
    const parallelResults = getStepResult('process-item') || [];

    return {
      sequentialResult,
      conditionalResult,
      parallelResults,
      finalResult: sequentialResult,
    };
  },
});

// Create complex workflow
const complexWorkflow = createWorkflow({
  id: 'complex-workflow',
  inputSchema: z.object({
    a: z.number(),
    b: z.number(),
  }),
  outputSchema: z.object({
    sequentialResult: z.number(),
    conditionalResult: z.string(),
    parallelResults: z.array(
      z.object({
        original: z.number(),
        processed: z.string(),
        doubled: z.number(),
      })
    ),
    finalResult: z.number(),
  }),
});

// Build complex workflow: sequential -> parallel -> conditional -> foreach -> final
complexWorkflow
  .then(addStep)
  .then(multiplyStep)
  .branch([
    [
      async ({ inputData }) => {
        return inputData % 2 === 0;
      },
      evenStep,
    ],
    [async () => true, oddStep], // fallback
  ])
  .foreach(processItemStep, { concurrency: 2 })
  .then(finalStep);

complexWorkflow.commit();

// Define the workflow-driven agent
const complexWorkflowAgent = new Agent({
  name: 'Complex Processor',
  type: 'WorkflowDrivenAgent',
  workflow: complexWorkflow,
});

// Define the task
const complexTask = new Task({
  description:
    'Execute complex workflow with multiple patterns for inputs: {a} and {b}',
  expectedOutput:
    'The result of the complex workflow with sequential, conditional, and parallel processing',
  agent: complexWorkflowAgent,
});

// Create the team
const team = new Team({
  name: 'Complex Workflow Team',
  agents: [complexWorkflowAgent],
  tasks: [complexTask],
  inputs: { a: 4, b: 5 },
  env: {
    OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY,
    ANTHROPIC_API_KEY: import.meta.env.VITE_ANTHROPIC_API_KEY,
  },
});

export default team;
