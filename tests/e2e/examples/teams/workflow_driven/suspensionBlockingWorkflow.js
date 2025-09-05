const { Agent, Task, Team } = require('kaibanjs');
const { createStep, createWorkflow } = require('@kaibanjs/workflow');
const { z } = require('zod');

// Create steps for suspension blocking workflow
const approvalStep = createStep({
  id: 'approval',
  inputSchema: z.object({
    requiresApproval: z.boolean(),
    approvalData: z.any().nullable(),
  }),
  outputSchema: z.string(),
  execute: async ({ inputData, suspend }) => {
    const { requiresApproval, approvalData } = inputData;

    if (requiresApproval && !approvalData) {
      // Suspend the workflow for manual approval
      await suspend({
        reason: 'Manual approval required',
        data: {
          approvalType: 'manual',
          requiredFields: ['approved', 'reason'],
        },
      });
    }

    if (approvalData && approvalData.approved) {
      return `Approved: ${approvalData.reason}`;
    } else if (approvalData && !approvalData.approved) {
      throw new Error('Approval denied');
    }

    return 'No approval required';
  },
});

const completionStep = createStep({
  id: 'completion',
  inputSchema: z.string(),
  outputSchema: z.string(),
  execute: async ({ inputData }) => {
    const approvalResult = inputData;
    return `Workflow completed: ${approvalResult}`;
  },
});

const suspensionBlockingWorkflow = createWorkflow({
  id: 'suspension-blocking-workflow',
  inputSchema: z.object({
    requiresApproval: z.boolean(),
    approvalData: z.any().nullable(),
  }),
  outputSchema: z.string(),
});

suspensionBlockingWorkflow.then(approvalStep).then(completionStep);

suspensionBlockingWorkflow.commit();

// Create WorkflowDrivenAgent
const workflowAgent = new Agent({
  type: 'WorkflowDrivenAgent',
  name: 'Suspension Blocking Workflow Agent',
  workflow: suspensionBlockingWorkflow,
});

// Create task
const workflowTask = new Task({
  description:
    'Execute the suspension blocking workflow that requires approval',
  expectedOutput: 'Workflow completion message',
  agent: workflowAgent,
});

// Create team
const team = new Team({
  name: 'Suspension Blocking Workflow Team',
  agents: [workflowAgent],
  tasks: [workflowTask],
  env: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  },
});

module.exports = team;
