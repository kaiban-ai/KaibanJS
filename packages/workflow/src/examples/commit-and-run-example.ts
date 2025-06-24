import { z } from 'zod';
import { Workflow } from '../workflow';

// Example demonstrating the unified store approach for both workflow and runs

// Define input and output schemas
const InputSchema = z.object({
  name: z.string(),
  age: z.number(),
});

const OutputSchema = z.object({
  greeting: z.string(),
  processed: z.boolean(),
});

type Input = z.infer<typeof InputSchema>;
type Output = z.infer<typeof OutputSchema>;

// Create steps
const step1 = Workflow.createStep({
  id: 'step1',
  description: 'Process the input data',
  inputSchema: InputSchema,
  outputSchema: z.object({
    processedName: z.string(),
    isAdult: z.boolean(),
  }),
  execute: async (context) => {
    const { inputData } = context;
    return {
      processedName: inputData.name.toUpperCase(),
      isAdult: inputData.age >= 18,
    };
  },
});

const step2 = Workflow.createStep({
  id: 'step2',
  description: 'Generate greeting',
  inputSchema: z.object({
    processedName: z.string(),
    isAdult: z.boolean(),
  }),
  outputSchema: OutputSchema,
  execute: async (context) => {
    const { inputData } = context;
    const greeting = inputData.isAdult
      ? `Hello, ${inputData.processedName}! You are an adult.`
      : `Hi, ${inputData.processedName}! You are a minor.`;

    return {
      greeting,
      processed: true,
    };
  },
});

// Create workflow
const workflow = Workflow.createWorkflow<Input, Output, Record<string, any>>({
  id: 'example-workflow',
  description: 'Example workflow with unified store approach',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  retryConfig: {
    attempts: 3,
    delay: 1000,
  },
});

// Build the workflow
workflow
  .then(step1)
  .map({
    processedName: { step: step1, path: 'processedName' },
    isAdult: { step: step1, path: 'isAdult' },
  })
  .then(step2);

// Commit the workflow to finalize the definition
workflow.commit();

// Example 1: Using the traditional start method (maintained for backward compatibility)
async function exampleTraditionalStart() {
  console.log('=== Traditional Start Method ===');

  const input: Input = { name: 'John', age: 25 };
  const result = await workflow.start(input);

  console.log('Result:', result);

  // Access the unified store state
  const storeState = workflow.store.getState();
  console.log('Unified Store State:', {
    workflowStatus: storeState.status,
    workflowSteps: storeState.stepResults.size,
    totalRuns: storeState.runs.size,
  });
}

// Example 2: Using the new Run approach with unified store
async function exampleRunApproach() {
  console.log('=== Run Approach with Unified Store ===');

  const input: Input = { name: 'Jane', age: 16 };

  // Create a run instance
  const run = workflow.createRun();
  // You can also watch the execution using the unified store
  const unwatch = workflow.store.subscribe((state) => {
    // const lastLog = state.logs[state.logs.length - 1];
    // if (lastLog?.logType === 'StepStatusUpdate') {
    //   log(`Step ${lastLog.stepId} Status: ${lastLog.stepStatus}`, {
    //     result: lastLog.stepResult,
    //     executionPath: state.executionPath,
    //   });
    // }
    const currentRunState = state.getRunState(run.runId);
    if (currentRunState) {
      const lastLog = currentRunState.logs[currentRunState.logs.length - 1];
      if (lastLog) {
        console.log('Unified Store Update:', {
          runId: currentRunState.runId,
          type: lastLog.logType,
          description: lastLog.logDescription,
          timestamp: new Date(lastLog.timestamp).toISOString(),
        });
      }
    }
  });
  // Start the run
  const result = await run.start({ inputData: input });

  console.log('Run Result:', result);
  console.log('Run ID:', run.runId);
  console.log('Workflow ID:', run.workflowId);

  // Access the unified store state
  const storeState = workflow.store.getState();
  const runState = storeState.getRunState(run.runId);

  console.log('Unified Store State:', {
    workflowStatus: storeState.status,
    workflowSteps: storeState.stepResults.size,
    totalRuns: storeState.runs.size,
    currentRunId: storeState.currentRunId,
  });

  console.log('Run State from Store:', {
    runId: runState?.runId,
    workflowId: runState?.workflowId,
    status: runState?.status,
    totalSteps: runState?.stepResults.size,
    logs: runState?.logs.length,
    watchEvents: runState?.watchEvents.length,
  });

  // Clean up the watcher when done
  unwatch();
}

// Example 3: Multiple runs sharing the same store
async function exampleMultipleRuns() {
  console.log('=== Multiple Runs with Unified Store ===');

  const inputs: Input[] = [
    { name: 'Alice', age: 22 },
    { name: 'Charlie', age: 15 },
    { name: 'Diana', age: 28 },
  ];

  const runs = inputs.map((input, index) => {
    const run = workflow.createRun({ runId: `run-${index + 1}` });
    return { run, input };
  });

  // Execute all runs
  const results = await Promise.all(
    runs.map(({ run, input }) => run.start({ inputData: input }))
  );

  console.log('All run results:', results);

  // Access the unified store to see all runs
  const storeState = workflow.store.getState();
  console.log('Unified Store with Multiple Runs:', {
    workflowStatus: storeState.status,
    totalRuns: storeState.runs.size,
    currentRunId: storeState.currentRunId,
  });

  // Each run has its own state in the unified store
  runs.forEach(({ run }, index) => {
    const runState = storeState.getRunState(run.runId);
    console.log(`Run ${index + 1} from unified store:`, {
      runId: runState?.runId,
      workflowId: runState?.workflowId,
      status: runState?.status,
      totalSteps: runState?.stepResults.size,
    });
  });
}

// Example 4: Comparing workflow and run states in unified store
async function exampleUnifiedStoreComparison() {
  console.log('=== Unified Store Comparison ===');

  const input: Input = { name: 'Frank', age: 35 };

  // First, use traditional workflow execution
  console.log('1. Traditional workflow execution:');
  const workflowResult = await workflow.start(input);
  console.log('Workflow result:', workflowResult);

  // Then, use run execution
  console.log('2. Run execution:');
  const run = workflow.createRun();
  const runResult = await run.start({ inputData: input });
  console.log('Run result:', runResult);

  // Compare states in unified store
  const storeState = workflow.store.getState();
  const runState = storeState.getRunState(run.runId);

  console.log('3. Unified Store Comparison:');
  console.log('Workflow State:', {
    status: storeState.status,
    steps: storeState.stepResults.size,
    logs: storeState.logs.length,
  });

  console.log('Run State:', {
    status: runState?.status,
    steps: runState?.stepResults.size,
    logs: runState?.logs.length,
    watchEvents: runState?.watchEvents.length,
  });

  console.log('Store Summary:', {
    totalRuns: storeState.runs.size,
    currentRunId: storeState.currentRunId,
    allRunIds: Array.from(storeState.runs.keys()),
  });
}

// Example 5: Direct store manipulation
async function exampleDirectStoreManipulation() {
  console.log('=== Direct Store Manipulation ===');

  const input: Input = { name: 'Grace', age: 27 };
  const run = workflow.createRun();

  // Access store before execution
  const initialState = workflow.store.getState();
  console.log('Initial store state:', {
    workflowStatus: initialState.status,
    totalRuns: initialState.runs.size,
  });

  // Execute the run
  await run.start({ inputData: input });

  // Access store after execution
  const finalState = workflow.store.getState();
  const runState = finalState.getRunState(run.runId);

  console.log('Final store state:', {
    workflowStatus: finalState.status,
    totalRuns: finalState.runs.size,
    currentRunId: finalState.currentRunId,
  });

  console.log('Run state details:', {
    runId: runState?.runId,
    status: runState?.status,
    totalSteps: runState?.stepResults.size,
    totalLogs: runState?.logs.length,
    totalWatchEvents: runState?.watchEvents.length,
  });

  // Access specific step results from run
  const stepResults = Object.fromEntries(runState?.stepResults || new Map());
  console.log('Step results from run:', stepResults);

  // Access logs from run
  const logs =
    runState?.logs.map((log) => ({
      type: log.logType,
      description: log.logDescription,
      timestamp: new Date(log.timestamp).toISOString(),
    })) || [];
  console.log('Logs from run:', logs);
}

// Example 6: Store cleanup and management
async function exampleStoreCleanup() {
  console.log('=== Store Cleanup and Management ===');

  const input: Input = { name: 'Henry', age: 31 };

  // Create multiple runs
  const runs = Array.from({ length: 3 }, (_, i) =>
    workflow.createRun({ runId: `cleanup-run-${i + 1}` })
  );

  // Execute all runs
  await Promise.all(runs.map((run) => run.start({ inputData: input })));

  // Check store state
  const storeState = workflow.store.getState();
  console.log('Before cleanup:', {
    totalRuns: storeState.runs.size,
    runIds: Array.from(storeState.runs.keys()),
  });

  // Remove specific runs
  runs.forEach((run, index) => {
    if (index < 2) {
      // Remove first two runs
      workflow.store.getState().removeRun(run.runId);
    }
  });

  // Check store state after cleanup
  const afterCleanupState = workflow.store.getState();
  console.log('After cleanup:', {
    totalRuns: afterCleanupState.runs.size,
    runIds: Array.from(afterCleanupState.runs.keys()),
  });
}

// Run examples
async function runExamples() {
  try {
    await exampleTraditionalStart();
    await exampleRunApproach();
    await exampleMultipleRuns();
    await exampleUnifiedStoreComparison();
    await exampleDirectStoreManipulation();
    await exampleStoreCleanup();
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Export for use in tests or other modules
export {
  workflow,
  exampleTraditionalStart,
  exampleRunApproach,
  exampleMultipleRuns,
  exampleUnifiedStoreComparison,
  exampleDirectStoreManipulation,
  exampleStoreCleanup,
  runExamples,
};
