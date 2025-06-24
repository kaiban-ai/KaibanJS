import { z } from 'zod';
import { Workflow } from '../workflow';

// Example steps
const step1 = Workflow.createStep({
  id: 'step1',
  description: 'First step',
  inputSchema: z.object({ message: z.string() }),
  outputSchema: z.object({ processed: z.string() }),
  execute: async ({ inputData }) => {
    console.log('Executing step1 with:', inputData);
    return { processed: `Processed: ${inputData.message}` };
  },
});

const step2 = Workflow.createStep({
  id: 'step2',
  description: 'Second step',
  inputSchema: z.object({ processed: z.string() }),
  outputSchema: z.object({ result: z.string() }),
  execute: async ({ inputData }) => {
    console.log('Executing step2 with:', inputData);
    return { result: `Final result: ${inputData.processed}` };
  },
});

const step3 = Workflow.createStep({
  id: 'step3',
  description: 'Third step',
  inputSchema: z.object({ result: z.string() }),
  outputSchema: z.object({ final: z.string() }),
  execute: async ({ inputData }) => {
    console.log('Executing step3 with:', inputData);
    return { final: `Completed: ${inputData.result}` };
  },
});

// Create workflow
const workflow = Workflow.createWorkflow({
  id: 'example-workflow',
  description: 'Example workflow with new Run architecture',
  inputSchema: z.object({ message: z.string() }),
  outputSchema: z.object({ final: z.string() }),
  retryConfig: { attempts: 3, delay: 1000 },
});

// Build workflow flow
workflow.then(step1).then(step2).then(step3).commit();

// Example usage
async function runExample() {
  console.log('=== Workflow Migration Example ===\n');

  // Create a run
  const run = workflow.createRun();
  console.log(`Created run with ID: ${run.runId}\n`);

  // Subscribe to run events
  const unsubscribe = run.watch((event) => {
    console.log('Run event:', event.type, event.payload);
  });

  // Start the run
  console.log('Starting workflow execution...\n');
  const result = await run.start({
    inputData: { message: 'Hello from new architecture!' },
  });

  console.log('\n=== Execution Result ===');
  console.log('Status:', result.status);
  if (result.status === 'completed') {
    console.log('Result:', result.result);
  } else if (result.status === 'failed') {
    console.log('Error:', result.error);
  }

  // Get run state
  const runState = run.getRunState();
  console.log('\n=== Run State ===');
  console.log('Status:', runState.status);
  console.log('Logs count:', runState.logs.length);
  console.log('Step results count:', runState.stepResults.size);

  unsubscribe();
}

// Example with stream
async function runStreamExample() {
  console.log('\n=== Stream Example ===\n');

  const run = workflow.createRun();

  const { stream, getWorkflowState } = run.stream({
    inputData: { message: 'Streaming workflow!' },
  });

  const reader = stream.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      console.log('Stream event:', value.type, value.payload);
    }
  } finally {
    reader.releaseLock();
  }

  const finalState = await getWorkflowState();
  console.log('\nFinal state:', finalState.status);
}

// Run examples
if (require.main === module) {
  runExample()
    .then(() => runStreamExample())
    .catch(console.error);
}

export { runExample, runStreamExample };
