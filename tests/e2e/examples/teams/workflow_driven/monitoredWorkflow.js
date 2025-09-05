const { Agent, Task, Team } = require('kaibanjs');
const { createStep, createWorkflow } = require('@kaibanjs/workflow');
const { z } = require('zod');

// Create steps for monitored workflow
const monitoredStep = createStep({
  id: 'monitored',
  inputSchema: z.object({
    iterations: z.number(),
    delay: z.number(),
  }),
  outputSchema: z.object({
    result: z.number(),
    executionTime: z.number(),
    iterations: z.number(),
  }),
  execute: async ({ inputData, runtimeContext }) => {
    const { iterations, delay } = inputData;
    const startTime = Date.now();

    let result = 0;

    // Perform iterations with delays
    for (let i = 0; i < iterations; i++) {
      result += i;
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    const executionTime = Date.now() - startTime;

    // Store metrics in context
    runtimeContext.set('executionTime', executionTime);
    runtimeContext.set('iterations', iterations);

    return {
      result,
      executionTime,
      iterations,
    };
  },
});

const monitoredWorkflow = createWorkflow({
  id: 'monitored-workflow',
  inputSchema: z.object({
    iterations: z.number(),
    delay: z.number(),
  }),
  outputSchema: z.object({
    result: z.number(),
    executionTime: z.number(),
    iterations: z.number(),
  }),
});

monitoredWorkflow.then(monitoredStep);
monitoredWorkflow.commit();

// Create WorkflowDrivenAgent
const workflowAgent = new Agent({
  type: 'WorkflowDrivenAgent',
  name: 'Monitored Workflow Agent',
  workflow: monitoredWorkflow,
});

// Create task
const workflowTask = new Task({
  description: 'Execute the monitored workflow to track performance metrics',
  expectedOutput: 'Performance metrics and result',
  agent: workflowAgent,
});

// Create team
const team = new Team({
  name: 'Monitored Workflow Team',
  agents: [workflowAgent],
  tasks: [workflowTask],
  env: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  },
});

module.exports = team;
