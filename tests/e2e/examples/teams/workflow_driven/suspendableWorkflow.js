const { Agent, Task, Team } = require('kaibanjs');
const { createStep, createWorkflow } = require('@kaibanjs/workflow');
const { z } = require('zod');

// Create steps for suspendable workflow
const checkSuspendStep = createStep({
  id: 'checkSuspend',
  inputSchema: z.object({ shouldSuspend: z.boolean() }),
  outputSchema: z.string(),
  execute: async ({ inputData, suspend }) => {
    const { shouldSuspend } = inputData;
    if (shouldSuspend) {
      await suspend({ reason: 'Manual intervention required' });
    }
    return 'Step completed without suspension';
  },
});

const resumeStep = createStep({
  id: 'resume',
  inputSchema: z.object({ resumeData: z.object({ continue: z.boolean() }) }),
  outputSchema: z.string(),
  execute: async ({ inputData }) => {
    const { resumeData } = inputData;
    if (resumeData.continue) {
      return 'Workflow resumed and completed successfully';
    }
    throw new Error('Resume data indicates workflow should not continue');
  },
});

const suspendableWorkflow = createWorkflow({
  id: 'suspendable-workflow',
  inputSchema: z.object({
    shouldSuspend: z.boolean(),
    resumeData: z.object({ continue: z.boolean() }),
  }),
  outputSchema: z.string(),
});

suspendableWorkflow.then(checkSuspendStep).then(resumeStep);

suspendableWorkflow.commit();

// Create WorkflowDrivenAgent
const workflowAgent = new Agent({
  type: 'WorkflowDrivenAgent',
  name: 'Suspendable Workflow Agent',
  workflow: suspendableWorkflow,
});

// Create task
const workflowTask = new Task({
  description: 'Execute the suspendable workflow to test suspension and resume',
  expectedOutput: 'Workflow completion message',
  agent: workflowAgent,
});

// Create team
const team = new Team({
  name: 'Suspendable Workflow Team',
  agents: [workflowAgent],
  tasks: [workflowTask],
  env: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  },
});

module.exports = team;
