import { z } from 'zod';
import { Workflow } from '../workflow';

// Create a simple logging utility
const log = (message: string, data?: any) => {
  console.log(`\n[${new Date().toISOString()}] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
};

// Create a monitoring utility
const monitorWorkflow = (workflow: Workflow<any, any, any>) => {
  // Monitor overall Workflow status
  workflow.watch((event) => {
    log(`Workflow Status Update: ${event.type}`, event.data);
  });

  // Monitor step results
  const unsubscribe = workflow.store.subscribe((state) => {
    // Log when a new step result is added
    const lastLog = state.logs[state.logs.length - 1];
    if (lastLog?.logType === 'StepStatusUpdate') {
      log(`Step ${lastLog.stepId} Status: ${lastLog.stepStatus}`, {
        result: lastLog.stepResult,
        executionPath: state.executionPath,
      });
    }
  });

  return unsubscribe;
};

const processWorkflow = Workflow.createWorkflow({
  id: 'process-workflow',
  inputSchema: z.number(),
  outputSchema: z.number(),
});

const doubleStep = Workflow.createStep({
  id: 'double',
  inputSchema: z.number(),
  outputSchema: z.number(),
  execute: async ({ inputData }) => {
    log('Executing double step with input:', inputData);
    // Simulate some processing time
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return (inputData as number) * 2;
  },
});

processWorkflow.then(doubleStep);

// Create the main workflow
const mainWorkflow = Workflow.createWorkflow({
  id: 'main-workflow',
  inputSchema: z.number(),
  outputSchema: z.number(),
});

// Create a step to handle nested workflow results
const handleNestedResultsStep = Workflow.createStep({
  id: 'handle-nested-results',
  inputSchema: z.any(),
  outputSchema: z.number(),
  execute: async ({ getStepResult }) => {
    log('Handling nested results');
    const result1 = getStepResult(processWorkflow.id) as number;
    const result2 = getStepResult(processWorkflow.id) as number;
    return result1 + result2;
  },
});

// Flow: parallel(process-workflow, process-workflow) -> handle-nested-results
mainWorkflow
  .parallel([processWorkflow, processWorkflow])
  .then(handleNestedResultsStep);

// Set up monitoring for both workflows
const unsubscribeMain = monitorWorkflow(mainWorkflow);
// const unsubscribeProcess = monitorWorkflow(processWorkflow);

// Test case: 2 -> parallel(double(2), double(2)) -> sum(4 + 4) = 8
log('Starting execution with input: 2');
const result = await mainWorkflow.start(2);

log('Final Result', result);

// Example of accessing store state directly
const mainWorkflowState = mainWorkflow.store.getState();
log('Main Workflow Final State', {
  status: mainWorkflowState.status,
  totalSteps: mainWorkflowState.stepResults.size,
  executionPath: mainWorkflowState.executionPath,
  logs: mainWorkflowState.logs.map((log) => ({
    type: log.logType,
    description: log.logDescription,
    timestamp: new Date(log.timestamp).toISOString(),
  })),
});

// Clean up subscriptions
unsubscribeMain();
// unsubscribeProcess();
