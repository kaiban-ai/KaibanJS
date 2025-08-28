const { Agent, Task, Team } = require('kaibanjs');
const { createStep, createWorkflow } = require('@kaibanjs/workflow');
const { z } = require('zod');

// Create steps for stateful workflow
const incrementStep = createStep({
  id: 'increment',
  inputSchema: z.object({ value: z.number() }),
  outputSchema: z.number(),
  execute: async ({ inputData, runtimeContext }) => {
    const { value } = inputData;

    // Get previous result from context if available
    const previousResult = runtimeContext.get('previousResult') || 0;
    const result = value + previousResult;

    // Store current result in context for next execution
    runtimeContext.set('previousResult', result);

    return result;
  },
});

const statefulWorkflow = createWorkflow({
  id: 'stateful-workflow',
  inputSchema: z.object({ value: z.number() }),
  outputSchema: z.number(),
});

statefulWorkflow.then(incrementStep);
statefulWorkflow.commit();

// Create WorkflowDrivenAgent
const workflowAgent = new Agent({
  type: 'WorkflowDrivenAgent',
  name: 'Stateful Workflow Agent',
  workflow: statefulWorkflow,
});

// Create task
const workflowTask = new Task({
  description:
    'Execute the stateful workflow that maintains state across executions',
  expectedOutput: 'The accumulated result',
  agent: workflowAgent,
});

// Create team
const team = new Team({
  name: 'Stateful Workflow Team',
  agents: [workflowAgent],
  tasks: [workflowTask],
  env: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  },
});

module.exports = team;
