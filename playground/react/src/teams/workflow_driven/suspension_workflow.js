import { Agent, Task, Team } from 'kaibanjs';
import { createStep, createWorkflow } from '@kaibanjs/workflow';
import { z } from 'zod';

// Create workflow steps
const validateStep = createStep({
  id: 'validate',
  inputSchema: z.object({ data: z.string() }),
  outputSchema: z.object({ isValid: z.boolean(), data: z.string() }),
  execute: async ({ inputData }) => {
    const { data } = inputData;
    const isValid = data.length > 0 && data.length <= 100;
    return { isValid, data };
  },
});

const approvalStep = createStep({
  id: 'approval',
  inputSchema: z.object({ data: z.string() }),
  outputSchema: z.object({ approved: z.boolean() }),
  suspendSchema: z.object({ reason: z.string() }),
  resumeSchema: z.object({ approved: z.boolean() }),
  execute: async ({ suspend, isResuming, resumeData }) => {
    if (isResuming) {
      return { approved: resumeData.approved };
    }

    // Simulate approval process that requires manual intervention
    await suspend({ reason: 'requires_manual_approval' });
    return { approved: false };
  },
});

const processStep = createStep({
  id: 'process',
  inputSchema: z.object({ data: z.string(), approved: z.boolean() }),
  outputSchema: z.object({
    result: z.string(),
    processedAt: z.string(),
    status: z.string(),
  }),
  execute: async ({ inputData }) => {
    const { data, approved } = inputData;

    if (!approved) {
      throw new Error('Data processing rejected - approval required');
    }

    return {
      result: `PROCESSED: ${data.toUpperCase()}`,
      processedAt: new Date().toISOString(),
      status: 'completed',
    };
  },
});

const finalStep = createStep({
  id: 'final',
  inputSchema: z.any(),
  outputSchema: z.object({
    originalData: z.string(),
    validationResult: z.object({ isValid: z.boolean(), data: z.string() }),
    approvalResult: z.object({ approved: z.boolean() }),
    processingResult: z.object({
      result: z.string(),
      processedAt: z.string(),
      status: z.string(),
    }),
    workflowStatus: z.string(),
  }),
  execute: async ({ getStepResult, getInitData }) => {
    const { data } = getInitData();
    const validationResult = getStepResult('validate');
    const approvalResult = getStepResult('approval');
    const processingResult = getStepResult('process');

    return {
      originalData: data,
      validationResult,
      approvalResult,
      processingResult,
      workflowStatus: 'completed',
    };
  },
});

// Create the workflow
const approvalWorkflow = createWorkflow({
  id: 'approval-workflow',
  inputSchema: z.object({ data: z.string() }),
  outputSchema: z.object({
    originalData: z.string(),
    validationResult: z.object({ isValid: z.boolean(), data: z.string() }),
    approvalResult: z.object({ approved: z.boolean() }),
    processingResult: z.object({
      result: z.string(),
      processedAt: z.string(),
      status: z.string(),
    }),
    workflowStatus: z.string(),
  }),
});

// Build the workflow: validate -> approval -> process -> final
approvalWorkflow
  .then(validateStep)
  .then(approvalStep)
  .then(processStep)
  .then(finalStep);

approvalWorkflow.commit();

// Define the workflow-driven agent
const approvalAgent = new Agent({
  name: 'Approval Processor',
  type: 'WorkflowDrivenAgent',
  workflow: approvalWorkflow,
});

// Define the task
const approvalTask = new Task({
  description: 'Process data through approval workflow: {data}',
  expectedOutput:
    'The result of the approval workflow with validation, approval, and processing steps',
  agent: approvalAgent,
});

// Create the team
const team = new Team({
  name: 'Approval Workflow Team',
  agents: [approvalAgent],
  tasks: [approvalTask],
  inputs: { data: 'Sample data for approval workflow' },
  env: {
    OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY,
    ANTHROPIC_API_KEY: import.meta.env.VITE_ANTHROPIC_API_KEY,
  },
});

export default team;
