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

// Create a complex workflow with various step patterns
const complexWorkflow = Workflow.createWorkflow({
  id: 'complex-workflow',
  inputSchema: z.object({
    initialValue: z.number(),
    shouldFail: z.boolean().optional(),
    shouldSuspend: z.boolean().optional(),
  }),
  outputSchema: z.object({
    finalResult: z.number(),
    executionPath: z.array(z.string()),
    stepResults: z.record(z.any()),
  }),
});

// 1. Initial processing step
const initialProcessStep = Workflow.createStep({
  id: 'initial-process',
  inputSchema: z.object({
    initialValue: z.number(),
    shouldFail: z.boolean().optional(),
    shouldSuspend: z.boolean().optional(),
  }),
  outputSchema: z.number(),
  execute: async ({ inputData }) => {
    log('Executing initial process step', inputData);
    await new Promise((resolve) => setTimeout(resolve, 3000)); // Simulating API call
    return inputData.initialValue * 2;
  },
});

// 2. Parallel processing steps
const parallelStep1 = Workflow.createStep({
  id: 'parallel-1',
  inputSchema: z.number(),
  outputSchema: z.number(),
  execute: async ({ inputData }) => {
    log('Executing parallel step 1', inputData);
    await new Promise((resolve) => setTimeout(resolve, 3000)); // Simulating API call
    return inputData + 10;
  },
});

const parallelStep2 = Workflow.createStep({
  id: 'parallel-2',
  inputSchema: z.number(),
  outputSchema: z.number(),
  execute: async ({ inputData }) => {
    log('Executing parallel step 2', inputData);
    await new Promise((resolve) => setTimeout(resolve, 3000)); // Simulating API call
    return inputData * 3;
  },
});

// 3. Conditional step
const conditionalStep = Workflow.createStep({
  id: 'conditional',
  inputSchema: z.object({
    value: z.number(),
    shouldFail: z.boolean().optional(),
  }),
  outputSchema: z.number(),
  execute: async ({ inputData }) => {
    log('Executing conditional step', inputData);
    await new Promise((resolve) => setTimeout(resolve, 3000)); // Simulating API call
    if (inputData.shouldFail) {
      throw new Error('Conditional step failed as requested');
    }
    return inputData.value + 5;
  },
});

// 4. Loop step
const loopStep = Workflow.createStep({
  id: 'loop',
  inputSchema: z.number(),
  outputSchema: z.number(),
  execute: async ({ inputData }) => {
    log('Executing loop step', inputData);
    await new Promise((resolve) => setTimeout(resolve, 3000)); // Simulating API call
    return inputData - 2;
  },
});

// 5. Suspendable step
const suspendableStep = Workflow.createStep({
  id: 'suspendable',
  inputSchema: z.object({
    value: z.number(),
    shouldSuspend: z.boolean().optional(),
  }),
  outputSchema: z.number(),
  execute: async ({ inputData, suspend }) => {
    log('Executing suspendable step', inputData);
    await new Promise((resolve) => setTimeout(resolve, 3000)); // Simulating API call
    if (inputData.shouldSuspend) {
      await suspend({ message: 'Step suspended as requested' });
    }
    return inputData.value * 2;
  },
});

// 6. Final processing step
const finalProcessStep = Workflow.createStep({
  id: 'final-process',
  inputSchema: z.any(),
  outputSchema: z.object({
    finalResult: z.number(),
    executionPath: z.array(z.string()),
    stepResults: z.record(z.any()),
  }),
  execute: async ({ getStepResult }) => {
    log('Executing final process step');
    await new Promise((resolve) => setTimeout(resolve, 3000)); // Simulating API call
    const results = {
      initial:
        (getStepResult(initialProcessStep.id) as { initialValue: number })
          .initialValue * 2,
      parallel1: getStepResult(parallelStep1.id) as number,
      parallel2: getStepResult(parallelStep2.id) as number,
      conditional:
        (getStepResult(conditionalStep.id) as { value: number }).value + 5,
      loop: getStepResult(loopStep.id) as number,
      suspendable:
        (getStepResult(suspendableStep.id) as { value: number }).value * 2,
    };

    return {
      finalResult: Object.values(results).reduce((sum, val) => sum + val, 0),
      executionPath: [
        'initial',
        'parallel',
        'conditional',
        'loop',
        'suspendable',
        'final',
      ],
      stepResults: results,
    };
  },
});

// Build the complex flow
complexWorkflow
  .then(initialProcessStep)
  .parallel([parallelStep1, parallelStep2])
  .then(conditionalStep)
  .dowhile(loopStep, async ({ getStepResult }) => {
    const result = getStepResult(loopStep.id) as number;
    return result > 0;
  })
  .then(suspendableStep)
  .then(finalProcessStep);

// Set up monitoring
const unsubscribe = monitorWorkflow(complexWorkflow);

// Test cases
async function runTestCases() {
  try {
    // Test case 1: Normal execution
    log('\n=== Test Case 1: Normal Execution ===');
    const result1 = await complexWorkflow.start({
      initialValue: 10,
      shouldFail: false,
      shouldSuspend: false,
    });
    log('Test Case 1 Result', result1);

    // Test case 2: With failure
    log('\n=== Test Case 2: With Failure ===');
    try {
      await complexWorkflow.start({
        initialValue: 10,
        shouldFail: true,
        shouldSuspend: false,
      });
    } catch (error) {
      log('Test Case 2 Error', error);
    }

    // Test case 3: With suspension
    log('\n=== Test Case 3: With Suspension ===');
    const result3 = await complexWorkflow.start({
      initialValue: 10,
      shouldFail: false,
      shouldSuspend: true,
    });
    log('Test Case 3 Result', result3);

    // Example of accessing store state directly
    const finalState = complexWorkflow.store.getState();
    log('Final Store State', {
      status: finalState.status,
      totalSteps: finalState.stepResults.size,
      executionPath: finalState.executionPath,
      logs: finalState.logs.map((log) => ({
        type: log.logType,
        description: log.logDescription,
        timestamp: new Date(log.timestamp).toISOString(),
      })),
    });
  } finally {
    // Clean up subscription
    unsubscribe();
  }
}

// Run the test cases
runTestCases().catch(console.error);
