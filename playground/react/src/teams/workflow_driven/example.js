/**
 * Example: Basic WorkflowDrivenAgent Usage
 *
 * This file demonstrates how to create and use a WorkflowDrivenAgent
 * with simple workflow patterns.
 */

import { Agent, Task, Team } from 'kaibanjs';
import { createStep, createWorkflow } from '@kaibanjs/workflow';
import { z } from 'zod';

// Example 1: Simple Sequential Workflow
export function createSimpleWorkflow() {
  // Step 1: Add two numbers
  const addStep = createStep({
    id: 'add',
    inputSchema: z.object({ a: z.number(), b: z.number() }),
    outputSchema: z.number(),
    execute: async ({ inputData }) => {
      const { a, b } = inputData;
      console.log(`Adding ${a} + ${b}`);
      return a + b;
    },
  });

  // Step 2: Double the result
  const doubleStep = createStep({
    id: 'double',
    inputSchema: z.number(),
    outputSchema: z.number(),
    execute: async ({ inputData }) => {
      const result = inputData * 2;
      console.log(`Doubling ${inputData} = ${result}`);
      return result;
    },
  });

  // Create workflow
  const workflow = createWorkflow({
    id: 'simple-workflow',
    inputSchema: z.object({ a: z.number(), b: z.number() }),
    outputSchema: z.number(),
  });

  // Build workflow: add -> double
  workflow.then(addStep).then(doubleStep);
  workflow.commit();

  return workflow;
}

// Example 2: Conditional Workflow
export function createConditionalWorkflow() {
  // Step 1: Check if number is positive
  const checkStep = createStep({
    id: 'check',
    inputSchema: z.object({ number: z.number() }),
    outputSchema: z.object({ isPositive: z.boolean(), number: z.number() }),
    execute: async ({ inputData }) => {
      const { number } = inputData;
      return { isPositive: number > 0, number };
    },
  });

  // Step 2: Process positive numbers
  const positiveStep = createStep({
    id: 'positive',
    inputSchema: z.object({ isPositive: z.boolean(), number: z.number() }),
    outputSchema: z.string(),
    execute: async ({ inputData }) => {
      const { number } = inputData;
      return `Positive number: ${number}`;
    },
  });

  // Step 3: Process negative numbers
  const negativeStep = createStep({
    id: 'negative',
    inputSchema: z.object({ isPositive: z.boolean(), number: z.number() }),
    outputSchema: z.string(),
    execute: async ({ inputData }) => {
      const { number } = inputData;
      return `Negative number: ${number}`;
    },
  });

  // Create workflow
  const workflow = createWorkflow({
    id: 'conditional-workflow',
    inputSchema: z.object({ number: z.number() }),
    outputSchema: z.string(),
  });

  // Build workflow with conditional branching
  workflow.then(checkStep).branch([
    [async ({ inputData }) => inputData.isPositive, positiveStep],
    [async () => true, negativeStep], // fallback
  ]);

  workflow.commit();

  return workflow;
}

// Example 3: Create a team with workflow-driven agent
export function createWorkflowTeam() {
  const workflow = createSimpleWorkflow();

  // Create workflow-driven agent
  const workflowAgent = new Agent({
    name: 'Workflow Processor',
    type: 'WorkflowDrivenAgent',
    workflow: workflow,
  });

  // Create task
  const processTask = new Task({
    description: 'Process the workflow with inputs: {a} and {b}',
    expectedOutput: 'The result of the workflow execution',
    agent: workflowAgent,
  });

  // Create team
  const team = new Team({
    name: 'Workflow Team',
    agents: [workflowAgent],
    tasks: [processTask],
    inputs: { a: 10, b: 5 },
  });

  return team;
}

// Example 4: Mixed team with workflow and LLM agents
export function createMixedTeam() {
  const workflow = createConditionalWorkflow();

  // Workflow-driven agent
  const workflowAgent = new Agent({
    name: 'Data Processor',
    type: 'WorkflowDrivenAgent',
    workflow: workflow,
  });

  // LLM-based agent
  const llmAgent = new Agent({
    name: 'Analyst',
    role: 'Data Analyst',
    goal: 'Analyze processed data and provide insights',
    background: 'Expert in data analysis and insights',
    type: 'ReactChampionAgent',
  });

  // Create tasks
  const processTask = new Task({
    description: 'Process the number: {number}',
    expectedOutput: 'Processed result from workflow',
    agent: workflowAgent,
  });

  const analyzeTask = new Task({
    description: 'Analyze the processed result and provide insights',
    expectedOutput: 'Analysis and insights about the processed data',
    agent: llmAgent,
  });

  // Create mixed team
  const team = new Team({
    name: 'Mixed Workflow-LLM Team',
    agents: [workflowAgent, llmAgent],
    tasks: [processTask, analyzeTask],
    inputs: { number: 42 },
  });

  return team;
}

// Usage examples
export async function runExamples() {
  console.log('=== WorkflowDrivenAgent Examples ===\n');

  // Example 1: Simple workflow
  console.log('1. Simple Workflow:');
  const simpleWorkflow = createSimpleWorkflow();
  const simpleRun = simpleWorkflow.createRun();
  const simpleResult = await simpleRun.start({ inputData: { a: 5, b: 3 } });
  console.log('Result:', simpleResult);
  console.log();

  // Example 2: Conditional workflow
  console.log('2. Conditional Workflow:');
  const conditionalWorkflow = createConditionalWorkflow();
  const conditionalRun = conditionalWorkflow.createRun();
  const conditionalResult = await conditionalRun.start({
    inputData: { number: -10 },
  });
  console.log('Result:', conditionalResult);
  console.log();

  // Example 3: Workflow team
  console.log('3. Workflow Team:');
  const workflowTeam = createWorkflowTeam();
  const teamResult = await workflowTeam.start();
  console.log('Team Result:', teamResult);
  console.log();

  console.log('=== Examples Complete ===');
}

// Export for use in other files
export default {
  createSimpleWorkflow,
  createConditionalWorkflow,
  createWorkflowTeam,
  createMixedTeam,
  runExamples,
};
